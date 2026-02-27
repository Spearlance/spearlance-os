---
model: claude-sonnet-4-6
name: youtube-data-api
description: Use when working with YouTube Data API v3 - video management, channel data, playlists, comments, search, or upload operations. Also use when querying YouTube analytics or managing live streams.
---

# YouTube Data API v3

## Overview
YouTube Data API v3 for CRUD operations on videos, channels, playlists, comments, and captions. Separate YouTube Analytics API for metrics. Quota-based (10,000 units/day default).

## Quick Reference

| Item | Value |
|------|-------|
| **Base URL** | `https://www.googleapis.com/youtube/v3` |
| **Auth** | OAuth 2.0 (write) or API Key (read public) |
| **Python** | `pip install google-api-python-client` |
| **Node.js** | `npm install googleapis` |
| **Daily Quota** | 10,000 units (default) |

## Authentication

**API Key** (read-only public data):
```python
from googleapiclient.discovery import build
youtube = build('youtube', 'v3', developerKey='YOUR_API_KEY')
```

**OAuth 2.0** (read/write, private data):
```python
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_secrets_file('client_secret.json',
    scopes=['https://www.googleapis.com/auth/youtube.force-ssl'])
credentials = flow.run_local_server()
youtube = build('youtube', 'v3', credentials=credentials)
```

## Quota Costs

| Operation | Cost |
|-----------|------|
| `search.list` | **100 units** |
| `videos.list` | 1 unit |
| `channels.list` | 1 unit |
| `playlists.list` | 1 unit |
| `videos.insert` (upload) | ~100 units (reduced from 1,600 in Dec 2025) |
| `videos.update` | 50 units |
| `commentThreads.list` | 1 unit |

**Critical:** `search.list` costs 100 units. With 10,000/day quota = only 100 searches/day. Use `videos.list` with IDs when possible.

## Common Operations

### Search Videos
```python
response = youtube.search().list(
    q='armadillos', part='snippet', type='video', maxResults=10
).execute()
```

### Get Video Details
```python
response = youtube.videos().list(
    part='snippet,statistics,contentDetails', id='VIDEO_ID'
).execute()
```

### Get Channel Info
```python
response = youtube.channels().list(
    part='snippet,statistics', id='CHANNEL_ID'
).execute()
```

## Pagination

All list endpoints use `pageToken`:
```python
next_page = response.get('nextPageToken')
if next_page:
    response = youtube.videos().list(..., pageToken=next_page).execute()
```

## Full Reference

See `reference.md` in this skill directory for all resource types, upload procedures, Analytics API, live streaming, and captions management.
