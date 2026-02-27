---
model: claude-sonnet-4-6
name: django-orm
description: Use when working with Django models, fields, querysets, migrations, or database relationships. Also use when optimizing N+1 queries, writing complex lookups with Q/F objects, using aggregations, managing transactions, or working with GeneratedField in Django 5.x.
---

# django-orm

## Overview

Django ORM provides a Python API over SQL databases. The QuerySet is lazy — it only hits the database when evaluated. Django 5.0 added `GeneratedField` (database-generated columns). Django 4.1+ adds `a`-prefixed async variants for all blocking methods.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Model Design

```python
from django.db import models
from django.db.models import F, Value
from django.db.models.functions import Concat

class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    # Use blank=True (not null=True) for optional strings
    subtitle = models.CharField(max_length=255, blank=True, default="")
    body = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    author = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="articles",  # always set related_name
    )
    category = models.ForeignKey(
        "Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="articles",
    )
    tags = models.ManyToManyField("Tag", related_name="articles", blank=True)
    # JSONField — use callable default, not mutable literal
    metadata = models.JSONField(default=dict)
    # Django 5.0: GeneratedField (database-level computed column)
    search_vector = models.GeneratedField(
        expression=Concat(F("title"), Value(" "), F("subtitle")),
        output_field=models.TextField(),
        db_persist=True,  # stored on disk; set False for virtual
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["author", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["author", "slug"], name="unique_author_slug"),
            models.CheckConstraint(
                check=models.Q(status__in=["draft", "published", "archived"]),
                name="valid_article_status",
            ),
        ]
        verbose_name = "Article"
        verbose_name_plural = "Articles"

    def __str__(self):
        return self.title
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## QuerySet Method Quick Reference

| Method | Returns | Notes |
|--------|---------|-------|
| `filter(**kwargs)` | QuerySet | AND by default; chain for AND |
| `exclude(**kwargs)` | QuerySet | NOT (...) |
| `order_by(*fields)` | QuerySet | `-field` = descending; `?` = random |
| `distinct()` | QuerySet | PostgreSQL supports `distinct("field")` |
| `values(*fields)` | QuerySet[dict] | Dicts, not model instances |
| `values_list(*fields)` | QuerySet[tuple] | `flat=True` for single field |
| `annotate(**exprs)` | QuerySet | Per-row computed values |
| `aggregate(**exprs)` | dict | Whole-queryset summary |
| `select_related(*fields)` | QuerySet | SQL JOIN for FK / OneToOne |
| `prefetch_related(*fields)` | QuerySet | Separate query for M2M / reverse FK |
| `defer(*fields)` | QuerySet | Lazy-load named fields |
| `only(*fields)` | QuerySet | Eager-load only named fields |
| `get(**kwargs)` | instance | Raises `DoesNotExist` or `MultipleObjectsReturned` |
| `get_or_create(**kwargs)` | (instance, bool) | Atomic create |
| `update_or_create(**kwargs)` | (instance, bool) | Atomic upsert |
| `bulk_create(objs)` | list | No signals; fast insert |
| `bulk_update(objs, fields)` | int | No signals; fast update |
| `update(**kwargs)` | int | SQL UPDATE; bypasses signals |
| `delete()` | (int, dict) | Cascades; fires signals |
| `exists()` | bool | Cheaper than `count() > 0` |
| `count()` | int | SQL COUNT(*) |
| `first()` / `last()` | instance or None | Adds ORDER BY |
| `select_for_update()` | QuerySet | Row-level locking (use inside `atomic()`) |
| `using(alias)` | QuerySet | Multi-database routing |
| `explain()` | str | PostgreSQL: EXPLAIN output |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Relationships

### ForeignKey / OneToOne

```python
# Forward: article.author (single query if not prefetched)
# Reverse: user.articles.all() — uses related_name

# Select related for FK/O2O — single JOIN query
articles = Article.objects.select_related("author", "category").filter(status="published")

# OneToOne (bidirectional without extra query when selected)
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
```

### ManyToMany

```python
class Article(models.Model):
    tags = models.ManyToManyField("Tag", related_name="articles", blank=True)

# Prefetch M2M — separate optimized query
articles = Article.objects.prefetch_related("tags")
for article in articles:
    print([tag.name for tag in article.tags.all()])  # no extra queries

# With through model (explicit join table)
class ArticleAuthor(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=50)  # extra field on the relationship

class Article(models.Model):
    authors = models.ManyToManyField(User, through="ArticleAuthor")
```

### Prefetch with custom querysets

```python
from django.db.models import Prefetch

# Only prefetch published comments, pre-selected with author
articles = Article.objects.prefetch_related(
    Prefetch(
        "comments",
        queryset=Comment.objects.filter(approved=True).select_related("author"),
        to_attr="approved_comments",  # stored on instance instead of .comments.all()
    )
)
for article in articles:
    print(article.approved_comments)  # list, not queryset
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Q and F Objects

```python
from django.db.models import Q, F, Count, Sum, Avg, Max, Min, Subquery, OuterRef

# Q: complex OR/AND/NOT logic
Article.objects.filter(
    Q(status="published") | Q(author__is_staff=True),
    ~Q(category__name="spam"),
)

# F: reference another field in SQL expression
# Avoid race conditions — updates in a single SQL statement
Article.objects.filter(views__gt=F("likes") * 10)
Article.objects.update(views=F("views") + 1)  # atomic increment

# Aggregation
from django.db.models import Count, Avg

author_stats = User.objects.annotate(
    article_count=Count("articles", distinct=True),
    avg_views=Avg("articles__views"),
).filter(article_count__gt=5)

# Multiple aggregates — always use distinct=True to avoid inflated counts
Book.objects.annotate(
    num_authors=Count("authors", distinct=True),
    num_stores=Count("stores", distinct=True),
)

# Subquery
from django.db.models import Subquery, OuterRef

latest_comment = Comment.objects.filter(
    article=OuterRef("pk")
).order_by("-created_at").values("body")[:1]

articles = Article.objects.annotate(latest_comment_body=Subquery(latest_comment))
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Custom Managers and QuerySets

```python
class ArticleQuerySet(models.QuerySet):
    def published(self):
        return self.filter(status="published")

    def by_author(self, user):
        return self.filter(author=user)

    def with_stats(self):
        return self.annotate(
            comment_count=Count("comments", distinct=True),
        )

class ArticleManager(models.Manager):
    def get_queryset(self):
        return ArticleQuerySet(self.model, using=self._db)

    def published(self):
        return self.get_queryset().published()

class Article(models.Model):
    objects = ArticleManager()

# Usage
Article.objects.published().by_author(request.user).with_stats()
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Migrations

```bash
# Create with descriptive name
python manage.py makemigrations --name add_article_metadata

# Always inspect the file before migrating
python manage.py sqlmigrate articles 0005

# Run
python manage.py migrate

# Squash when count grows large
python manage.py squashmigrations articles 0001 0020
```

### Data migration

```python
# articles/migrations/0006_backfill_slugs.py
from django.db import migrations
from django.utils.text import slugify

def forward(apps, schema_editor):
    Article = apps.get_model("articles", "Article")
    for article in Article.objects.filter(slug=""):
        article.slug = slugify(article.title)
        article.save(update_fields=["slug"])

def backward(apps, schema_editor):
    Article = apps.get_model("articles", "Article")
    Article.objects.update(slug="")

class Migration(migrations.Migration):
    dependencies = [("articles", "0005_add_slug_field")]
    operations = [migrations.RunPython(forward, backward)]
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Transactions

```python
from django.db import transaction

# Wrap multiple writes in one transaction
with transaction.atomic():
    article = Article.objects.create(title="Draft", author=user)
    AuditLog.objects.create(action="create", object_id=article.pk)

# Post-commit hook — runs only if transaction commits
def send_notification(article_id):
    # send email, fire webhook, etc.
    pass

with transaction.atomic():
    article.status = "published"
    article.save()
    transaction.on_commit(lambda: send_notification(article.pk))

# Savepoints — nested atomic blocks create savepoints
with transaction.atomic():
    do_primary_work()
    try:
        with transaction.atomic():  # savepoint
            do_risky_work()
    except Exception:
        pass  # savepoint rolled back; outer transaction intact
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Async ORM (Django 4.1+)

Every blocking ORM method has an `a`-prefixed async variant:

```python
# Single object
obj = await MyModel.objects.aget(pk=1)
obj, created = await MyModel.objects.aget_or_create(name="x")

# Queryset operations
count = await MyModel.objects.filter(active=True).acount()
exists = await MyModel.objects.filter(slug="foo").aexists()
await MyModel.objects.filter(active=False).adelete()
await MyModel.objects.filter(pk__in=ids).aupdate(status="archived")

# Iterate (async for)
async for item in MyModel.objects.filter(active=True).aiterator():
    process(item)

# Bulk
await MyModel.objects.abulk_create(objs)
await MyModel.objects.abulk_update(objs, ["field"])
```

⚠ Deferred fields cannot be lazy-loaded in async context — always fetch required fields upfront with `only()`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Common Mistakes

### 1. N+1 queries

```python
# Wrong — 1 query per article for author
for article in Article.objects.all():
    print(article.author.name)

# Right — single JOIN
for article in Article.objects.select_related("author"):
    print(article.author.name)
```

### 2. Mutable default in JSONField

```python
# Wrong — all rows share same object
metadata = models.JSONField(default={})

# Right
metadata = models.JSONField(default=dict)
tags_list = models.JSONField(default=list)
```

### 3. Inflated counts with multiple aggregates

```python
# Wrong — JOIN explosion
Book.objects.annotate(num_authors=Count("authors"), num_stores=Count("stores"))

# Right
Book.objects.annotate(
    num_authors=Count("authors", distinct=True),
    num_stores=Count("stores", distinct=True),
)
```

### 4. `null=True` on CharField

```python
# Wrong — two representations of "no value"
name = models.CharField(max_length=100, null=True)

# Right — empty string is the Django convention
name = models.CharField(max_length=100, blank=True, default="")
# Exception: unique=True where multiple blank values are needed
name = models.CharField(max_length=100, null=True, blank=True, unique=True)
```

### 5. Deferred fields in async context

```python
# Wrong — lazy-loading is synchronous
entry = await Entry.objects.defer("body").aget(pk=1)
print(entry.body)  # SynchronousOnlyOperation

# Right
entry = await Entry.objects.only("title", "body").aget(pk=1)
```

### 6. Forgetting `refresh_from_db()` after GeneratedField save

```python
obj.save()
obj.refresh_from_db()  # required — GeneratedField populated by DB
print(obj.search_vector)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Sources

- [Django 5.2 QuerySet API](https://docs.djangoproject.com/en/5.2/ref/models/querysets/)
- [Model field reference](https://docs.djangoproject.com/en/5.2/ref/models/fields/)
- [GeneratedField (Django 5.0)](https://docs.djangoproject.com/en/5.2/ref/models/fields/#generatedfield)
- [Migrations](https://docs.djangoproject.com/en/5.2/topics/migrations/)
- [Transactions](https://docs.djangoproject.com/en/5.2/topics/db/transactions/)
