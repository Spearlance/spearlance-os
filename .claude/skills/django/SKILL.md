---
model: claude-sonnet-4-6
name: django
description: Use when working with Django views, URL routing, templates, middleware, signals, admin, management commands, or settings configuration. Also use when adding async support to Django views, debugging N+1 queries, or setting up pytest-django for testing.
---

# django

## Overview

Django 5.x is a batteries-included Python web framework. It owns the full stack: ORM, views, templates, URL routing, admin, auth, and middleware. Django 5.0 introduced `GeneratedField` and field-level facets; 5.1 added async auth backends and `aauthenticate()`; 5.2 added async user model methods and `method_decorator` support for async view methods.

## Quick Reference

| Task | Command |
|------|---------|
| Run dev server | `python manage.py runserver` |
| Create migrations | `python manage.py makemigrations` |
| Run migrations | `python manage.py migrate` |
| Create superuser | `python manage.py createsuperuser` |
| Run tests (Django) | `python manage.py test <app>` |
| Run tests (pytest) | `pytest` or `pytest -x` |
| Shell with context | `python manage.py shell` |
| Collect static | `python manage.py collectstatic --noinput` |
| Dump fixture | `python manage.py dumpdata app.Model > fixture.json` |
| Load fixture | `python manage.py loaddata fixture.json` |
| Check config | `python manage.py check --deploy` |
| Show URLs | `python manage.py show_urls` (requires django-extensions) |
| SQL for migration | `python manage.py sqlmigrate app 0001` |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Project Structure

```
myproject/
├── manage.py
├── myproject/
│   ├── settings/
│   │   ├── base.py        # shared settings
│   │   ├── local.py       # dev overrides
│   │   └── production.py  # prod overrides
│   ├── urls.py            # root URL conf
│   ├── wsgi.py
│   └── asgi.py            # required for async / WebSocket
├── apps/
│   └── myapp/
│       ├── apps.py
│       ├── models.py
│       ├── views.py
│       ├── urls.py
│       ├── admin.py
│       ├── signals.py
│       ├── forms.py
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_views.py
│       │   └── test_models.py
│       ├── management/
│       │   └── commands/
│       │       └── mycommand.py
│       └── templates/
│           └── myapp/
│               └── index.html
└── requirements/
    ├── base.txt
    ├── local.txt
    └── production.txt
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Views

### Function-Based Views (FBV)

```python
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET", "POST"])
def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk)
    if request.method == "POST":
        form = ArticleForm(request.POST, instance=article)
        if form.is_valid():
            form.save()
            return redirect("article-list")
    else:
        form = ArticleForm(instance=article)
    return render(request, "articles/detail.html", {"article": article, "form": form})
```

### Class-Based Views (CBV)

```python
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin

class ArticleListView(LoginRequiredMixin, ListView):
    model = Article
    template_name = "articles/list.html"
    context_object_name = "articles"
    paginate_by = 20

    def get_queryset(self):
        return Article.objects.filter(
            author=self.request.user
        ).select_related("category").order_by("-created_at")

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["total_count"] = self.get_queryset().count()
        return context


class ArticleCreateView(PermissionRequiredMixin, CreateView):
    model = Article
    form_class = ArticleForm
    permission_required = "articles.add_article"
    success_url = reverse_lazy("article-list")

    def form_valid(self, form):
        form.instance.author = self.request.user
        return super().form_valid(form)
```

### Async Views (Django 4.1+)

```python
# All handlers must be async def — never mix sync and async on one view class
from django.http import JsonResponse

class AsyncArticleView(View):
    async def get(self, request, pk):
        article = await Article.objects.aget(pk=pk)
        return JsonResponse({"title": article.title})

# FBV async — use async ORM methods
async def async_list(request):
    articles = []
    async for article in Article.objects.filter(published=True).aiterator():
        articles.append({"id": article.pk, "title": article.title})
    return JsonResponse({"articles": articles})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## URL Routing

```python
# apps/articles/urls.py
from django.urls import path, re_path, include
from . import views

app_name = "articles"  # namespace

urlpatterns = [
    path("", views.ArticleListView.as_view(), name="list"),
    path("<int:pk>/", views.ArticleDetailView.as_view(), name="detail"),
    path("create/", views.ArticleCreateView.as_view(), name="create"),
    path("<int:pk>/edit/", views.ArticleUpdateView.as_view(), name="update"),
    # Custom converter
    path("<slug:slug>/", views.article_by_slug, name="by-slug"),
]

# myproject/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("articles/", include("apps.articles.urls", namespace="articles")),
    path("api/v1/", include("apps.api.urls")),
]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Middleware

```python
# Custom middleware — sync and async compatible
from django.utils.decorators import sync_and_async_middleware

@sync_and_async_middleware
def timing_middleware(get_response):
    import time, asyncio

    if asyncio.iscoroutinefunction(get_response):
        async def middleware(request):
            start = time.monotonic()
            response = await get_response(request)
            duration = time.monotonic() - start
            response["X-Request-Duration"] = f"{duration:.3f}s"
            return response
    else:
        def middleware(request):
            start = time.monotonic()
            response = get_response(request)
            duration = time.monotonic() - start
            response["X-Request-Duration"] = f"{duration:.3f}s"
            return response

    return middleware
```

Built-in middleware order (settings.py `MIDDLEWARE` list — order matters):

```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",      # HTTPS redirects, headers
    "whitenoise.middleware.WhiteNoiseMiddleware",         # static files in prod
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Settings (Split Pattern)

```python
# myproject/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    # Local
    "apps.articles",
    "apps.accounts",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

# myproject/settings/local.py
from .base import *  # noqa

DEBUG = True
INTERNAL_IPS = ["127.0.0.1"]

# django-debug-toolbar
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Signals

```python
# apps/accounts/signals.py
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models import UserProfile

@receiver(post_save, sender=UserProfile)
def sync_profile_cache(sender, instance, created, **kwargs):  # always **kwargs
    if created:
        instance.initialize_defaults()
    cache.delete(f"profile:{instance.pk}")

# apps/accounts/apps.py
from django.apps import AppConfig

class AccountsConfig(AppConfig):
    name = "apps.accounts"

    def ready(self):
        import apps.accounts.signals  # noqa — registers @receiver decorators
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Management Commands

```python
# apps/articles/management/commands/publish_scheduled.py
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from apps.articles.models import Article

class Command(BaseCommand):
    help = "Publish articles whose scheduled_at is in the past"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving")

    def handle(self, *args, **options):
        qs = Article.objects.filter(
            status="scheduled", scheduled_at__lte=timezone.now()
        )
        if options["dry_run"]:
            self.stdout.write(f"Would publish {qs.count()} articles")
            return
        count = qs.update(status="published")
        self.stdout.write(self.style.SUCCESS(f"Published {count} articles"))
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Testing with pytest-django

```python
# conftest.py
import pytest

@pytest.fixture
def user(db):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(username="tester", password="pass")

# test_views.py
import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_article_list_requires_login(client):
    url = reverse("articles:list")
    response = client.get(url)
    assert response.status_code == 302
    assert "/login/" in response["Location"]

@pytest.mark.django_db
def test_article_list_authenticated(client, user):
    client.force_login(user)
    url = reverse("articles:list")
    response = client.get(url)
    assert response.status_code == 200

# pytest.ini or pyproject.toml
# [pytest]
# DJANGO_SETTINGS_MODULE = myproject.settings.test
# python_files = test_*.py
# python_classes = Test*
# python_functions = test_*
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Admin Customization

```python
from django.contrib import admin
from .models import Article, Category

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "status", "created_at")
    list_filter = ("status", "category")
    search_fields = ("title", "author__username")
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 50
    raw_id_fields = ("author",)  # avoids loading all users in dropdown

    fieldsets = (
        (None, {"fields": ("title", "slug", "category", "author")}),
        ("Content", {"fields": ("body",)}),
        ("Publishing", {"fields": ("status", "published_at"), "classes": ("collapse",)}),
    )

    @admin.action(description="Mark selected as published")
    def publish_articles(self, request, queryset):
        queryset.update(status="published")

    actions = [publish_articles]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

### 1. Signals connected at module level

**Wrong:**
```python
# runs before AppRegistry is ready — ImportError or silent failure
from django.db.models.signals import post_save
from .models import Article
post_save.connect(my_handler, sender=Article)
```

**Right:** Import in `AppConfig.ready()` (see Signals section above).

### 2. Sync ORM inside async views

**Wrong:**
```python
async def my_view(request):
    obj = MyModel.objects.get(pk=1)  # SynchronousOnlyOperation
```

**Right:**
```python
async def my_view(request):
    obj = await MyModel.objects.aget(pk=1)  # async ORM method
```

### 3. Missing `**kwargs` in signal handlers

Django adds new keyword args over time. Handlers without `**kwargs` raise `TypeError` on upgrade.

```python
# Wrong
def handle_save(sender, instance, created):
    pass

# Right
def handle_save(sender, instance, created, **kwargs):
    pass
```

### 4. `print()` in management commands

`print()` bypasses output capture in tests. Use `self.stdout.write(self.style.SUCCESS(...))`.

### 5. Hardcoded SECRET_KEY in source

Always read from environment. Use `python-decouple` or `django-environ` for `.env` support.

### 6. Mixing async and sync handlers on one CBV

Django 5.x raises `ImproperlyConfigured` if a CBV has both `def get()` and `async def post()`. All handlers must be one or the other.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Sources

- [Django 5.2 Release Notes](https://docs.djangoproject.com/en/5.2/releases/5.2/)
- [Async Support](https://docs.djangoproject.com/en/5.2/topics/async/)
- [Class-Based Views](https://docs.djangoproject.com/en/5.2/topics/class-based-views/)
- [Middleware Reference](https://docs.djangoproject.com/en/5.2/ref/middleware/)
- [Custom Management Commands](https://docs.djangoproject.com/en/5.2/howto/custom-management-commands/)
- [Testing Tools](https://docs.djangoproject.com/en/5.2/topics/testing/tools/)
- [Signals Reference](https://docs.djangoproject.com/en/5.2/ref/signals/)
