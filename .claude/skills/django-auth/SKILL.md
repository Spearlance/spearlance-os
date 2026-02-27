---
model: claude-sonnet-4-6
name: django-auth
description: Use when working with Django authentication, custom user models, permissions, groups, decorators, password management, session handling, or social auth with django-allauth. Also use when implementing custom auth backends or setting up AUTH_USER_MODEL.
---

# django-auth

## Overview

Django's auth system provides user models, password management, permissions, groups, session-based authentication, and a pluggable backend system. Django 5.2 added async auth backend support and `aauthenticate()`. Always set `AUTH_USER_MODEL` before the first migration — it cannot be changed after.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Custom User Model

**Set this up before running any migrations.** Changing `AUTH_USER_MODEL` after is painful surgery on all migration dependency chains.

### AbstractUser (recommended — keep Django fields, add your own)

```python
# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    """Extend the default Django user with additional fields."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bio = models.TextField(blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    email_verified = models.BooleanField(default=False)

    # Keep email unique — required for email-based login
    email = models.EmailField(unique=True)

    REQUIRED_FIELDS = ["email"]  # prompted by createsuperuser
    USERNAME_FIELD = "username"  # or "email" for email-as-username

    def __str__(self):
        return self.email
```

### AbstractBaseUser (full control — you define everything)

```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email
```

```python
# settings.py
AUTH_USER_MODEL = "accounts.User"

# ForeignKeys to user — always use settings.AUTH_USER_MODEL, not the model directly
from django.conf import settings
author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Authentication

### Login / Logout / Registration

```python
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.shortcuts import render, redirect

def login_view(request):
    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)          # sets session
            return redirect("dashboard")
    else:
        form = AuthenticationForm()
    return render(request, "accounts/login.html", {"form": form})

def logout_view(request):
    logout(request)
    return redirect("home")

def change_password_view(request):
    if request.method == "POST":
        user = request.user
        user.set_password(request.POST["new_password"])
        user.save()
        update_session_auth_hash(request, user)  # keeps current session valid
        return redirect("profile")
```

### Authentication Backends

```python
# accounts/backends.py
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class EmailBackend(BaseBackend):
    """Allow login with email instead of username."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Return User or None — never raise exceptions
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None

    def user_can_authenticate(self, user):
        return user.is_active

# settings.py
AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",  # keep as fallback
]
```

### Async auth (Django 5.2+)

```python
from django.contrib.auth import aauthenticate

async def async_login_view(request):
    user = await aauthenticate(request, username=email, password=password)
    if user is not None:
        from django.contrib.auth import alogin
        await alogin(request, user)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Permissions and Groups

### Model-Level Permissions

```python
class Article(models.Model):
    class Meta:
        permissions = [
            ("publish_article", "Can publish articles"),
            ("feature_article", "Can feature articles on homepage"),
        ]
        # Django auto-creates: add_article, change_article, delete_article, view_article
```

```bash
python manage.py makemigrations
python manage.py migrate
```

### Assigning Permissions

```python
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType

# Assign individual permission to user
content_type = ContentType.objects.get_for_model(Article)
perm = Permission.objects.get(content_type=content_type, codename="publish_article")
user.user_permissions.add(perm)

# Groups — bundle permissions, assign groups to users
from django.contrib.auth.models import Group

editors_group, created = Group.objects.get_or_create(name="Editors")
editors_group.permissions.add(perm)
user.groups.add(editors_group)

# Check
user.has_perm("articles.publish_article")         # True/False
user.has_perms(["articles.publish_article", "articles.feature_article"])
user.get_all_permissions()  # set of "app.codename" strings
```

### View Protection

```python
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin

# FBV decorators
@login_required(login_url="/login/")
def dashboard(request):
    ...

@permission_required("articles.publish_article", raise_exception=True)
def publish(request, pk):
    ...

# CBV mixins
class ArticlePublishView(PermissionRequiredMixin, View):
    permission_required = "articles.publish_article"
    raise_exception = True  # 403 instead of redirect to login

    def post(self, request, pk):
        ...
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Password Management

```python
# settings.py — built-in validators
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Hashing — always use these methods, never store plain text
user.set_password("new_password")   # hashes and sets
user.check_password("raw_password") # True/False
user.save()
```

### Password Reset Flow (built-in views)

```python
# urls.py — Django's built-in password reset views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("password/reset/", auth_views.PasswordResetView.as_view(
        template_name="accounts/password_reset.html",
        email_template_name="accounts/password_reset_email.txt",
        subject_template_name="accounts/password_reset_subject.txt",
    ), name="password_reset"),
    path("password/reset/done/", auth_views.PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("password/reset/<uidb64>/<token>/", auth_views.PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
    path("password/reset/complete/", auth_views.PasswordResetCompleteView.as_view(), name="password_reset_complete"),
]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Session Handling

```python
# Session data — stored server-side (DB, cache, file)
request.session["cart_items"] = [1, 2, 3]
cart = request.session.get("cart_items", [])
del request.session["cart_items"]    # remove key
request.session.flush()              # delete session + create new
request.session.cycle_key()          # rotate key, preserve data (CSRF rotation)

# settings.py — session configuration
SESSION_ENGINE = "django.contrib.sessions.backends.cache"  # faster than DB
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14  # 2 weeks
SESSION_COOKIE_SECURE = True   # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # not accessible via JS
SESSION_COOKIE_SAMESITE = "Lax"
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Social Auth with django-allauth

```bash
pip install django-allauth
```

```python
# settings.py
INSTALLED_APPS += [
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
]

MIDDLEWARE += ["allauth.account.middleware.AccountMiddleware"]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
LOGIN_REDIRECT_URL = "/dashboard/"
ACCOUNT_LOGOUT_REDIRECT_URL = "/"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "secret": os.environ["GOOGLE_CLIENT_SECRET"],
        },
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
    },
    "github": {
        "APP": {
            "client_id": os.environ["GITHUB_CLIENT_ID"],
            "secret": os.environ["GITHUB_CLIENT_SECRET"],
        },
        "SCOPE": ["user:email"],
    },
}

# urls.py
urlpatterns += [path("accounts/", include("allauth.urls"))]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Quick Reference

| Task | API |
|------|-----|
| Login user | `login(request, user)` |
| Logout user | `logout(request)` |
| Authenticate | `authenticate(request, username=x, password=y)` |
| Async authenticate | `await aauthenticate(request, ...)` |
| Check permission | `user.has_perm("app.codename")` |
| Assign permission | `user.user_permissions.add(perm)` |
| Assign group | `user.groups.add(group)` |
| Hash password | `user.set_password("raw")` |
| Check password | `user.check_password("raw")` |
| Keep session after pw change | `update_session_auth_hash(request, user)` |
| Rotate session key | `request.session.cycle_key()` |
| Protect FBV | `@login_required` |
| Protect CBV | `LoginRequiredMixin` |
| Require permission FBV | `@permission_required("app.codename")` |
| Require permission CBV | `PermissionRequiredMixin` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

### 1. Setting `AUTH_USER_MODEL` after initial migration

Set it in settings before `migrate` is run the first time. Changing it later requires manual migration surgery on all FK references.

### 2. Using `User` model directly instead of `get_user_model()`

```python
# Wrong — breaks when AUTH_USER_MODEL is custom
from django.contrib.auth.models import User

# Right
from django.contrib.auth import get_user_model
User = get_user_model()

# In models/ForeignKey — use string reference
author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
```

### 3. Forgetting `update_session_auth_hash` after password change

Changing a password invalidates the session hash — the user is silently logged out on their next request.

```python
user.set_password(new_password)
user.save()
update_session_auth_hash(request, user)  # keep them logged in
```

### 4. Returning exceptions from auth backends instead of None

`authenticate()` must return `None` on failure, never raise exceptions. Raising stops the backend chain.

### 5. Checking `is_authenticated` on `AnonymousUser`

```python
# Safe — AnonymousUser.is_authenticated is always False
if request.user.is_authenticated:
    ...
# Don't check: if request.user is not None — AnonymousUser is truthy
```

### 6. Not setting `PermissionsMixin` on `AbstractBaseUser`

Without `PermissionsMixin`, the user has no `has_perm()`, `groups`, or `user_permissions`. Either use `AbstractUser` (includes it) or explicitly inherit from both `AbstractBaseUser` and `PermissionsMixin`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Sources

- [Django Auth Customization](https://docs.djangoproject.com/en/5.2/topics/auth/customizing/)
- [Django Auth Default](https://docs.djangoproject.com/en/5.2/topics/auth/default/)
- [Django Security](https://docs.djangoproject.com/en/5.2/topics/security/)
- [django-allauth](https://docs.allauth.org/en/latest/)
- [Custom User Model — testdriven.io](https://testdriven.io/blog/django-custom-user-model/)
