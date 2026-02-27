# YouTube Data API v3 -- Comprehensive Developer Reference

> **API Version:** v3 (current as of February 2026)
> **Base URL:** `https://www.googleapis.com/youtube/v3`
> **Default Quota:** 10,000 units/day per project (resets at midnight Pacific Time)

---

## Table of Contents

1. [Authentication & Setup](#1-authentication--setup)
2. [API Resources & Endpoints](#2-api-resources--endpoints)
3. [Quota System & Costs](#3-quota-system--costs)
4. [Search](#4-search)
5. [Videos](#5-videos)
6. [Channels](#6-channels)
7. [Playlists & Playlist Items](#7-playlists--playlist-items)
8. [Comments & Comment Threads](#8-comments--comment-threads)
9. [Subscriptions](#9-subscriptions)
10. [Pagination Patterns](#10-pagination-patterns)
11. [Partial Responses (fields parameter)](#11-partial-responses-fields-parameter)
12. [Python Code Examples](#12-python-code-examples)
13. [Node.js Code Examples](#13-nodejs-code-examples)
14. [YouTube Analytics API](#14-youtube-analytics-api)
15. [Recent Changes & Deprecations](#15-recent-changes--deprecations)

---

## 1. Authentication & Setup

### Project Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services > Library**
4. Search for "YouTube Data API v3" and enable it
5. Go to **APIs & Services > Credentials** to create credentials

### API Key (Public Data Only)

For read-only access to public data (video info, channel stats, search):

```
GET https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID&part=snippet&key=YOUR_API_KEY
```

**Restrictions:** API keys can be restricted by HTTP referrer, IP address, or specific APIs in the Cloud Console.

### OAuth 2.0 (Private Data / Write Operations)

Required for: uploading videos, managing playlists, posting comments, accessing private user data.

**Important:** Service accounts are NOT supported. The YouTube Data API requires user-linked OAuth tokens. Attempting service account auth returns a `NoLinkedYouTubeAccount` error.

#### Available OAuth 2.0 Scopes

| Scope | Description |
|-------|-------------|
| `https://www.googleapis.com/auth/youtube` | Full account management (read/write) |
| `https://www.googleapis.com/auth/youtube.readonly` | Read-only access to YouTube account |
| `https://www.googleapis.com/auth/youtube.upload` | Upload and manage videos |
| `https://www.googleapis.com/auth/youtube.force-ssl` | View, edit, and delete videos, ratings, comments, captions |
| `https://www.googleapis.com/auth/youtube.channel-memberships.creator` | See active channel members and their levels |
| `https://www.googleapis.com/auth/youtubepartner` | Manage assets and content on YouTube (partners) |
| `https://www.googleapis.com/auth/youtubepartner-channel-audit` | View private channel info during audit (partners) |

#### Supported OAuth Flows

- **Server-side web apps** -- Authorization code flow with secure server storage
- **JavaScript/client-side web apps** -- Implicit grant flow
- **Mobile & desktop apps** -- Installed application flow with redirect URI
- **Limited-input devices** -- Device code flow (TV, game consoles)

---

## 2. API Resources & Endpoints

All endpoints use the base URL: `https://www.googleapis.com/youtube/v3`

| Resource | Methods | Description |
|----------|---------|-------------|
| **Activities** | list | User activity feed |
| **Captions** | list, insert, update, download, delete | Video caption tracks |
| **ChannelBanners** | insert | Upload channel banner images |
| **Channels** | list, update | Channel metadata and settings |
| **ChannelSections** | list, insert, update, delete | Channel page layout sections |
| **Comments** | list, insert, update, setModerationStatus, delete | Individual comments |
| **CommentThreads** | list, insert | Top-level comments with replies |
| **I18nLanguages** | list | Supported application languages |
| **I18nRegions** | list | Supported content regions |
| **Members** | list | Channel membership info |
| **MembershipsLevels** | list | Channel membership tiers |
| **PlaylistImages** | list, insert, update, delete | Playlist thumbnail images |
| **PlaylistItems** | list, insert, update, delete | Videos within playlists |
| **Playlists** | list, insert, update, delete | Playlist metadata |
| **Search** | list | Search across videos, channels, playlists |
| **Subscriptions** | list, insert, delete | Channel subscriptions |
| **Thumbnails** | set | Upload custom video thumbnails |
| **VideoAbuseReportReasons** | list | Reasons for reporting abuse |
| **VideoCategories** | list | Video category taxonomy |
| **Videos** | list, insert, update, rate, getRating, reportAbuse, delete | Video resources |
| **Watermarks** | set, unset | Channel watermark images |

---

## 3. Quota System & Costs

Default allocation: **10,000 units/day** per project. Every request (even invalid ones) costs at least 1 unit.

### Quota Cost Table

| Resource | Method | Cost (units) |
|----------|--------|-------------|
| **Activities** | list | 1 |
| **Captions** | list | 50 |
| **Captions** | insert | 400 |
| **Captions** | update | 450 |
| **Captions** | delete | 50 |
| **ChannelBanners** | insert | 50 |
| **Channels** | list | 1 |
| **Channels** | update | 50 |
| **ChannelSections** | list | 1 |
| **ChannelSections** | insert/update/delete | 50 |
| **Comments** | list | 1 |
| **Comments** | insert/update/delete | 50 |
| **Comments** | setModerationStatus | 50 |
| **CommentThreads** | list | 1 |
| **CommentThreads** | insert | 50 |
| **I18nLanguages / I18nRegions** | list | 1 |
| **Members / MembershipsLevels** | list | 1 |
| **PlaylistItems** | list | 1 |
| **PlaylistItems** | insert/update/delete | 50 |
| **Playlists** | list | 1 |
| **Playlists** | insert/update/delete | 50 |
| **Search** | list | **100** |
| **Subscriptions** | list | 1 |
| **Subscriptions** | insert/delete | 50 |
| **Thumbnails** | set | 50 |
| **VideoCategories** | list | 1 |
| **Videos** | list | 1 |
| **Videos** | insert (upload) | **100** |
| **Videos** | update | 50 |
| **Videos** | rate | 50 |
| **Videos** | getRating | 1 |
| **Videos** | reportAbuse | 50 |
| **Videos** | delete | 50 |
| **Watermarks** | set/unset | 50 |

### Quota Optimization Tips

- Prefer `videos.list` (1 unit) over `search.list` (100 units) when you have video IDs
- Use the `fields` parameter to reduce response size (does not reduce quota cost but improves performance)
- Batch video ID lookups: `videos.list` accepts comma-separated IDs (up to 50)
- Cache responses when possible
- Request only needed `part` values
- To request a quota increase, apply through the [Google API Console](https://console.cloud.google.com/) (requires a compliance audit)

---

## 4. Search

### Endpoint

```
GET https://www.googleapis.com/youtube/v3/search
```

**Quota cost:** 100 units per request

### Required Parameters

| Parameter | Description |
|-----------|-------------|
| `part` | Must be `snippet` |

### Key Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query. Supports NOT (`-`) and OR (`\|`) operators |
| `type` | string | `video`, `channel`, `playlist` (comma-separated, default: all) |
| `maxResults` | integer | 0-50 (default: 5) |
| `pageToken` | string | Pagination token |
| `order` | string | `date`, `rating`, `relevance` (default), `title`, `videoCount`, `viewCount` |
| `channelId` | string | Restrict to a specific channel |
| `publishedAfter` | datetime | RFC 3339 format (e.g., `2025-01-01T00:00:00Z`) |
| `publishedBefore` | datetime | RFC 3339 format |
| `regionCode` | string | ISO 3166-1 alpha-2 country code |
| `relevanceLanguage` | string | ISO 639-1 language code |
| `safeSearch` | string | `none`, `moderate` (default), `strict` |
| `topicId` | string | Freebase topic ID |

### Video-Specific Filters (require `type=video`)

| Parameter | Values | Description |
|-----------|--------|-------------|
| `videoCaption` | `any`, `closedCaption`, `none` | Caption availability |
| `videoCategoryId` | string | Video category ID |
| `videoDefinition` | `any`, `high`, `standard` | HD vs SD |
| `videoDimension` | `2d`, `3d`, `any` | 2D vs 3D |
| `videoDuration` | `any`, `short` (<4min), `medium` (4-20min), `long` (>20min) | Duration range |
| `videoEmbeddable` | `any`, `true` | Embeddable only |
| `videoLicense` | `any`, `creativeCommon`, `youtube` | License type |
| `videoPaidProductPlacement` | `any`, `true` | Paid promotion filter |
| `videoSyndicated` | `any`, `true` | Playable outside youtube.com |
| `videoType` | `any`, `episode`, `movie` | Content type |
| `eventType` | `completed`, `live`, `upcoming` | Live broadcast status |
| `location` | string | Lat/long coordinates (e.g., `37.42307,-122.08427`) |
| `locationRadius` | string | Distance from location (e.g., `5km`, `10mi`, max `1000km`) |

### Filter Parameters (use 0 or 1)

| Parameter | Description |
|-----------|-------------|
| `forContentOwner` | Videos owned by content owner (partner API) |
| `forDeveloper` | Videos uploaded via your app |
| `forMine` | Authenticated user's videos (requires OAuth) |

---

## 5. Videos

### videos.list

```
GET https://www.googleapis.com/youtube/v3/videos
```

**Quota cost:** 1 unit

#### Part Values

| Part | Description |
|------|-------------|
| `snippet` | Title, description, thumbnails, channelTitle, tags, categoryId, publishedAt |
| `contentDetails` | Duration, dimension, definition, caption, regionRestriction, contentRating |
| `statistics` | viewCount, likeCount, commentCount, favoriteCount |
| `status` | uploadStatus, privacyStatus, license, embeddable, madeForKids, containsSyntheticMedia |
| `player` | Embed HTML and dimensions |
| `topicDetails` | Associated topic categories (Wikipedia URLs) |
| `recordingDetails` | Recording date |
| `liveStreamingDetails` | Scheduled/actual start/end times, concurrent viewers, live chat ID |
| `localizations` | Localized title and description by language |
| `fileDetails` | File name, size, type, video/audio streams (owner only) |
| `processingDetails` | Processing status and progress (owner only) |
| `suggestions` | Processing errors, warnings, tag suggestions (owner only) |
| `paidProductPlacementDetails` | Whether video has paid product placement |

#### Filter Parameters (exactly one required)

| Parameter | Description |
|-----------|-------------|
| `id` | Comma-separated video IDs (up to 50) |
| `chart` | `mostPopular` -- returns trending videos for region |
| `myRating` | `like` or `dislike` -- user's rated videos (requires OAuth) |

#### Video Resource JSON Structure

```json
{
  "kind": "youtube#video",
  "etag": "etag",
  "id": "string",
  "snippet": {
    "publishedAt": "datetime",
    "channelId": "string",
    "title": "string",
    "description": "string",
    "thumbnails": {
      "default": { "url": "string", "width": 120, "height": 90 },
      "medium":  { "url": "string", "width": 320, "height": 180 },
      "high":    { "url": "string", "width": 480, "height": 360 },
      "standard":{ "url": "string", "width": 640, "height": 480 },
      "maxres":  { "url": "string", "width": 1280, "height": 720 }
    },
    "channelTitle": "string",
    "tags": ["string"],
    "categoryId": "string",
    "liveBroadcastContent": "string",
    "defaultLanguage": "string",
    "localized": { "title": "string", "description": "string" },
    "defaultAudioLanguage": "string"
  },
  "contentDetails": {
    "duration": "PT#H#M#S (ISO 8601)",
    "dimension": "2d | 3d",
    "definition": "hd | sd",
    "caption": "true | false",
    "licensedContent": "boolean",
    "regionRestriction": {
      "allowed": ["country codes"],
      "blocked": ["country codes"]
    },
    "projection": "360 | rectangular"
  },
  "statistics": {
    "viewCount": "unsigned long",
    "likeCount": "unsigned long",
    "favoriteCount": "unsigned long",
    "commentCount": "unsigned long"
  },
  "status": {
    "uploadStatus": "deleted | failed | processed | rejected | uploaded",
    "privacyStatus": "private | public | unlisted",
    "license": "creativeCommon | youtube",
    "embeddable": "boolean",
    "publicStatsViewable": "boolean",
    "madeForKids": "boolean",
    "containsSyntheticMedia": "boolean"
  },
  "liveStreamingDetails": {
    "actualStartTime": "datetime",
    "actualEndTime": "datetime",
    "scheduledStartTime": "datetime",
    "scheduledEndTime": "datetime",
    "concurrentViewers": "unsigned long",
    "activeLiveChatId": "string"
  }
}
```

### videos.insert (Upload)

```
POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
Authorization: Bearer ACCESS_TOKEN
```

**Quota cost:** 100 units (reduced from 1,600 as of December 2025)

### videos.update

```
PUT https://www.googleapis.com/youtube/v3/videos?part=snippet
Authorization: Bearer ACCESS_TOKEN
```

**Quota cost:** 50 units

### videos.rate

```
POST https://www.googleapis.com/youtube/v3/videos/rate?id=VIDEO_ID&rating=like
Authorization: Bearer ACCESS_TOKEN
```

**Quota cost:** 50 units. Rating values: `like`, `dislike`, `none`

### videos.delete

```
DELETE https://www.googleapis.com/youtube/v3/videos?id=VIDEO_ID
Authorization: Bearer ACCESS_TOKEN
```

**Quota cost:** 50 units

---

## 6. Channels

### channels.list

```
GET https://www.googleapis.com/youtube/v3/channels
```

**Quota cost:** 1 unit

#### Part Values

| Part | Description |
|------|-------------|
| `snippet` | Title, description, customUrl, publishedAt, thumbnails, country |
| `contentDetails` | Related playlists (uploads, likes, favorites) |
| `statistics` | viewCount, subscriberCount, videoCount, hiddenSubscriberCount |
| `brandingSettings` | Channel title, description, keywords, banner images |
| `topicDetails` | Associated topic categories |
| `status` | Privacy status, isLinked, longUploadsStatus, madeForKids |
| `localizations` | Localized metadata by language |
| `contentOwnerDetails` | Content owner info (partners) |
| `auditDetails` | Audit information (partners) |
| `id` | Channel ID |

#### Filter Parameters (exactly one required)

| Parameter | Description |
|-----------|-------------|
| `id` | Comma-separated channel IDs |
| `forHandle` | YouTube handle (with or without `@` prefix) |
| `forUsername` | Legacy YouTube username |
| `mine` | Authenticated user's channel (requires OAuth) |
| `managedByMe` | Channels managed by content owner (partners) |

---

## 7. Playlists & Playlist Items

### playlists.list

```
GET https://www.googleapis.com/youtube/v3/playlists
```

**Quota cost:** 1 unit

#### Part Values

`contentDetails`, `id`, `localizations`, `player`, `snippet`, `status`

#### Filters (exactly one)

| Parameter | Description |
|-----------|-------------|
| `channelId` | Channel's playlists |
| `id` | Comma-separated playlist IDs |
| `mine` | Authenticated user's playlists (requires OAuth) |

### playlists.insert

```
POST https://www.googleapis.com/youtube/v3/playlists?part=snippet,status
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "snippet": {
    "title": "My Playlist",
    "description": "A collection of videos",
    "defaultLanguage": "en"
  },
  "status": {
    "privacyStatus": "public"
  }
}
```

**Quota cost:** 50 units

### playlistItems.list

```
GET https://www.googleapis.com/youtube/v3/playlistItems
```

**Quota cost:** 1 unit

#### Filters

| Parameter | Description |
|-----------|-------------|
| `playlistId` | Get items from a specific playlist |
| `id` | Comma-separated playlist item IDs |

### playlistItems.insert

```
POST https://www.googleapis.com/youtube/v3/playlistItems?part=snippet
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "snippet": {
    "playlistId": "PLAYLIST_ID",
    "resourceId": {
      "kind": "youtube#video",
      "videoId": "VIDEO_ID"
    },
    "position": 0
  }
}
```

**Quota cost:** 50 units

---

## 8. Comments & Comment Threads

### commentThreads.list

```
GET https://www.googleapis.com/youtube/v3/commentThreads
```

**Quota cost:** 1 unit

#### Part Values

`id`, `snippet`, `replies`

#### Filters (exactly one)

| Parameter | Description |
|-----------|-------------|
| `videoId` | Comments for a specific video |
| `allThreadsRelatedToChannelId` | All comment threads for a channel |
| `id` | Comma-separated comment thread IDs |

#### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `maxResults` | integer | 1-100 (default: 20) |
| `order` | string | `time` (default) or `relevance` |
| `pageToken` | string | Pagination token |
| `searchTerms` | string | Filter comments containing specific terms |
| `textFormat` | string | `html` (default) or `plainText` |
| `moderationStatus` | string | `published` (default), `heldForReview`, `likelySpam` (requires OAuth) |

### commentThreads.insert

```
POST https://www.googleapis.com/youtube/v3/commentThreads?part=snippet
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "snippet": {
    "videoId": "VIDEO_ID",
    "topLevelComment": {
      "snippet": {
        "textOriginal": "This is a comment."
      }
    }
  }
}
```

**Quota cost:** 50 units

### comments.list (Replies)

```
GET https://www.googleapis.com/youtube/v3/comments?part=snippet&parentId=COMMENT_ID
```

**Quota cost:** 1 unit

### comments.insert (Reply)

```
POST https://www.googleapis.com/youtube/v3/comments?part=snippet
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "snippet": {
    "parentId": "COMMENT_ID",
    "textOriginal": "This is a reply."
  }
}
```

**Quota cost:** 50 units

---

## 9. Subscriptions

### subscriptions.list

```
GET https://www.googleapis.com/youtube/v3/subscriptions
```

**Quota cost:** 1 unit

#### Part Values

`contentDetails`, `id`, `snippet`, `subscriberSnippet`

#### Filters (exactly one)

| Parameter | Description |
|-----------|-------------|
| `channelId` | A specific channel's subscriptions |
| `id` | Comma-separated subscription IDs |
| `mine` | Authenticated user's subscriptions (requires OAuth) |
| `myRecentSubscribers` | Recent subscribers (requires OAuth, newest first) |
| `mySubscribers` | All subscribers (requires OAuth, unordered) |

#### Optional Parameters

| Parameter | Values |
|-----------|--------|
| `forChannelId` | Filter subscriptions to specific channels |
| `order` | `alphabetical`, `relevance`, `unread` |
| `maxResults` | 0-50 (default: 5) |
| `pageToken` | Pagination token |

### subscriptions.insert

```
POST https://www.googleapis.com/youtube/v3/subscriptions?part=snippet
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json

{
  "snippet": {
    "resourceId": {
      "kind": "youtube#channel",
      "channelId": "CHANNEL_ID"
    }
  }
}
```

**Quota cost:** 50 units

---

## 10. Pagination Patterns

The YouTube Data API uses token-based pagination across all `list` methods.

### How It Works

1. Make an initial request with `maxResults` (controls page size)
2. The response includes `nextPageToken` and/or `prevPageToken`
3. Pass the token as `pageToken` in the next request
4. Repeat until no `nextPageToken` is returned

### Response Pagination Fields

```json
{
  "nextPageToken": "CDIQAA",
  "prevPageToken": "CDIQAQ",
  "pageInfo": {
    "totalResults": 1000000,
    "resultsPerPage": 50
  },
  "items": [...]
}
```

### Important Notes

- `totalResults` is an approximation, especially for search results
- Each paginated request costs the same quota as the initial request
- Search results are limited to approximately 500 results (even if `totalResults` shows more)
- The `id` filter does not support pagination (returns all requested IDs at once)

### Pagination Code Pattern (Python)

```python
def get_all_results(youtube, **kwargs):
    """Generic paginator for any YouTube API list method."""
    results = []
    request = youtube.search().list(**kwargs)

    while request is not None:
        response = request.execute()
        results.extend(response.get("items", []))

        # Get next page
        request = youtube.search().list_next(request, response)

    return results
```

### Pagination Code Pattern (Node.js)

```javascript
async function getAllResults(youtube, params) {
  const results = [];
  let pageToken = null;

  do {
    const response = await youtube.search.list({
      ...params,
      pageToken: pageToken,
    });

    results.push(...response.data.items);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return results;
}
```

---

## 11. Partial Responses (fields parameter)

The `fields` parameter filters the API response to include only specific properties, reducing bandwidth usage.

### Syntax

| Syntax | Meaning | Example |
|--------|---------|---------|
| `a,b` | Select multiple fields | `fields=items,nextPageToken` |
| `a/b` | Select nested field | `fields=items/snippet/title` |
| `a(b,c)` | Group nested fields | `fields=items(id,snippet(title,description))` |
| `*` | Wildcard (all fields) | `fields=items/*` |

### Examples

Retrieve only video titles and view counts:
```
GET /youtube/v3/videos?id=VIDEO_ID&part=snippet,statistics
    &fields=items(snippet/title,statistics/viewCount)
    &key=API_KEY
```

Retrieve search result IDs and titles only:
```
GET /youtube/v3/search?q=surfing&part=snippet&type=video
    &fields=items(id/videoId,snippet/title),nextPageToken
    &key=API_KEY
```

### Important Notes

- The `fields` parameter does **not** reduce quota costs
- The `part` parameter determines which resource sections are retrieved; `fields` further filters within those sections
- When updating resources, omitted properties within a specified `part` will have their values **deleted**

---

## 12. Python Code Examples

### Installation

```bash
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

### Initialize Client with API Key

```python
from googleapiclient.discovery import build

API_KEY = "YOUR_API_KEY"
youtube = build("youtube", "v3", developerKey=API_KEY)
```

### Initialize Client with OAuth 2.0

```python
import os
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]
CLIENT_SECRETS_FILE = "client_secret.json"

def get_authenticated_service():
    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
    credentials = flow.run_local_server(port=8080)
    return build("youtube", "v3", credentials=credentials)

youtube = get_authenticated_service()
```

### Search Videos

```python
def search_videos(youtube, query, max_results=10):
    """Search for videos by query string."""
    request = youtube.search().list(
        part="snippet",
        q=query,
        type="video",
        maxResults=max_results,
        order="relevance"
    )
    response = request.execute()

    videos = []
    for item in response["items"]:
        videos.append({
            "video_id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "channel": item["snippet"]["channelTitle"],
            "published_at": item["snippet"]["publishedAt"],
            "thumbnail": item["snippet"]["thumbnails"]["high"]["url"]
        })
    return videos
```

### Get Video Details

```python
def get_video_details(youtube, video_ids):
    """Get detailed info for one or more videos.

    Args:
        video_ids: Single ID string or list of IDs (max 50).
    """
    if isinstance(video_ids, list):
        video_ids = ",".join(video_ids)

    request = youtube.videos().list(
        part="snippet,contentDetails,statistics,status",
        id=video_ids
    )
    response = request.execute()

    videos = []
    for item in response["items"]:
        videos.append({
            "id": item["id"],
            "title": item["snippet"]["title"],
            "description": item["snippet"]["description"],
            "channel_id": item["snippet"]["channelId"],
            "channel_title": item["snippet"]["channelTitle"],
            "published_at": item["snippet"]["publishedAt"],
            "tags": item["snippet"].get("tags", []),
            "category_id": item["snippet"]["categoryId"],
            "duration": item["contentDetails"]["duration"],
            "definition": item["contentDetails"]["definition"],
            "view_count": int(item["statistics"].get("viewCount", 0)),
            "like_count": int(item["statistics"].get("likeCount", 0)),
            "comment_count": int(item["statistics"].get("commentCount", 0)),
            "privacy_status": item["status"]["privacyStatus"],
            "made_for_kids": item["status"].get("madeForKids", False),
        })
    return videos
```

### Get Channel Statistics

```python
def get_channel_stats(youtube, channel_id):
    """Get channel statistics and metadata."""
    request = youtube.channels().list(
        part="snippet,statistics,contentDetails,brandingSettings",
        id=channel_id
    )
    response = request.execute()

    if not response["items"]:
        return None

    channel = response["items"][0]
    return {
        "id": channel["id"],
        "title": channel["snippet"]["title"],
        "description": channel["snippet"]["description"],
        "custom_url": channel["snippet"].get("customUrl"),
        "published_at": channel["snippet"]["publishedAt"],
        "country": channel["snippet"].get("country"),
        "subscriber_count": int(channel["statistics"]["subscriberCount"]),
        "video_count": int(channel["statistics"]["videoCount"]),
        "view_count": int(channel["statistics"]["viewCount"]),
        "uploads_playlist": channel["contentDetails"]["relatedPlaylists"]["uploads"],
    }


def get_channel_by_handle(youtube, handle):
    """Look up a channel by its @handle."""
    request = youtube.channels().list(
        part="snippet,statistics",
        forHandle=handle  # with or without @
    )
    return request.execute()
```

### Get Playlist Videos

```python
def get_playlist_videos(youtube, playlist_id, max_pages=10):
    """Get all videos from a playlist with pagination."""
    videos = []
    next_page_token = None
    page_count = 0

    while page_count < max_pages:
        request = youtube.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page_token
        )
        response = request.execute()

        for item in response["items"]:
            videos.append({
                "video_id": item["contentDetails"]["videoId"],
                "title": item["snippet"]["title"],
                "position": item["snippet"]["position"],
                "published_at": item["contentDetails"].get("videoPublishedAt"),
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break
        page_count += 1

    return videos


def get_all_channel_videos(youtube, channel_id):
    """Get all videos uploaded by a channel."""
    # First, get the channel's uploads playlist ID
    channel = get_channel_stats(youtube, channel_id)
    uploads_playlist = channel["uploads_playlist"]

    # Then fetch all videos from that playlist
    return get_playlist_videos(youtube, uploads_playlist, max_pages=100)
```

### Get Comment Threads

```python
def get_video_comments(youtube, video_id, max_results=100):
    """Get top-level comments for a video."""
    comments = []
    next_page_token = None

    while len(comments) < max_results:
        request = youtube.commentThreads().list(
            part="snippet,replies",
            videoId=video_id,
            maxResults=min(100, max_results - len(comments)),
            order="relevance",
            textFormat="plainText",
            pageToken=next_page_token
        )
        response = request.execute()

        for item in response["items"]:
            top_comment = item["snippet"]["topLevelComment"]["snippet"]
            comment_data = {
                "comment_id": item["id"],
                "author": top_comment["authorDisplayName"],
                "text": top_comment["textDisplay"],
                "like_count": top_comment["likeCount"],
                "published_at": top_comment["publishedAt"],
                "reply_count": item["snippet"]["totalReplyCount"],
                "replies": []
            }

            # Include replies if present
            if "replies" in item:
                for reply in item["replies"]["comments"]:
                    reply_snippet = reply["snippet"]
                    comment_data["replies"].append({
                        "author": reply_snippet["authorDisplayName"],
                        "text": reply_snippet["textDisplay"],
                        "like_count": reply_snippet["likeCount"],
                        "published_at": reply_snippet["publishedAt"],
                    })

            comments.append(comment_data)

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return comments
```

### Create a Playlist and Add Videos (OAuth Required)

```python
def create_playlist(youtube, title, description="", privacy="private"):
    """Create a new playlist."""
    request = youtube.playlists().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": title,
                "description": description,
            },
            "status": {
                "privacyStatus": privacy  # "public", "private", "unlisted"
            }
        }
    )
    response = request.execute()
    return response["id"]


def add_video_to_playlist(youtube, playlist_id, video_id, position=None):
    """Add a video to an existing playlist."""
    body = {
        "snippet": {
            "playlistId": playlist_id,
            "resourceId": {
                "kind": "youtube#video",
                "videoId": video_id,
            }
        }
    }
    if position is not None:
        body["snippet"]["position"] = position

    request = youtube.playlistItems().insert(
        part="snippet",
        body=body
    )
    return request.execute()
```

### Post a Comment (OAuth Required)

```python
def post_comment(youtube, video_id, text):
    """Post a top-level comment on a video."""
    request = youtube.commentThreads().insert(
        part="snippet",
        body={
            "snippet": {
                "videoId": video_id,
                "topLevelComment": {
                    "snippet": {
                        "textOriginal": text
                    }
                }
            }
        }
    )
    return request.execute()


def reply_to_comment(youtube, parent_comment_id, text):
    """Reply to an existing comment."""
    request = youtube.comments().insert(
        part="snippet",
        body={
            "snippet": {
                "parentId": parent_comment_id,
                "textOriginal": text
            }
        }
    )
    return request.execute()
```

### Advanced Search with Filters

```python
def search_live_streams(youtube, query, event_type="live"):
    """Search for live streams."""
    request = youtube.search().list(
        part="snippet",
        q=query,
        type="video",
        eventType=event_type,  # "live", "upcoming", "completed"
        maxResults=25
    )
    return request.execute()


def search_by_location(youtube, query, lat, lng, radius="50km"):
    """Search for videos near a geographic location."""
    request = youtube.search().list(
        part="snippet",
        q=query,
        type="video",
        location=f"{lat},{lng}",
        locationRadius=radius,
        maxResults=25
    )
    return request.execute()


def search_creative_commons(youtube, query):
    """Search for Creative Commons licensed videos."""
    request = youtube.search().list(
        part="snippet",
        q=query,
        type="video",
        videoLicense="creativeCommon",
        maxResults=25
    )
    return request.execute()


def search_by_date_range(youtube, query, after, before=None):
    """Search for videos published within a date range.

    Args:
        after: RFC 3339 datetime string, e.g. "2025-01-01T00:00:00Z"
        before: RFC 3339 datetime string (optional)
    """
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "publishedAfter": after,
        "maxResults": 25,
        "order": "date"
    }
    if before:
        params["publishedBefore"] = before

    request = youtube.search().list(**params)
    return request.execute()
```

---

## 13. Node.js Code Examples

### Installation

```bash
npm install googleapis
# For OAuth flows:
npm install google-auth-library
```

### Initialize Client with API Key

```javascript
const { google } = require("googleapis");

const API_KEY = "YOUR_API_KEY";
const youtube = google.youtube({
  version: "v3",
  auth: API_KEY,
});
```

### Initialize Client with OAuth 2.0

```javascript
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const http = require("http");
const url = require("url");
const open = require("open");

const CLIENT_ID = "YOUR_CLIENT_ID";
const CLIENT_SECRET = "YOUR_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

async function getAuthenticatedClient() {
  const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  });

  // Open browser for user consent
  console.log("Authorize this app by visiting:", authUrl);

  // Wait for the callback
  const code = await new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        const qs = new URL(req.url, "http://localhost:3000").searchParams;
        const authCode = qs.get("code");
        if (authCode) {
          res.end("Authentication successful! You can close this tab.");
          server.close();
          resolve(authCode);
        }
      })
      .listen(3000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return google.youtube({ version: "v3", auth: oauth2Client });
}
```

### Search Videos

```javascript
async function searchVideos(youtube, query, maxResults = 10) {
  const response = await youtube.search.list({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: maxResults,
    order: "relevance",
  });

  return response.data.items.map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channel: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails.high.url,
  }));
}
```

### Get Video Details

```javascript
async function getVideoDetails(youtube, videoIds) {
  const ids = Array.isArray(videoIds) ? videoIds.join(",") : videoIds;

  const response = await youtube.videos.list({
    part: "snippet,contentDetails,statistics,status",
    id: ids,
  });

  return response.data.items.map((item) => ({
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    tags: item.snippet.tags || [],
    duration: item.contentDetails.duration,
    definition: item.contentDetails.definition,
    viewCount: parseInt(item.statistics.viewCount || "0"),
    likeCount: parseInt(item.statistics.likeCount || "0"),
    commentCount: parseInt(item.statistics.commentCount || "0"),
    privacyStatus: item.status.privacyStatus,
  }));
}
```

### Get Channel Statistics

```javascript
async function getChannelStats(youtube, channelId) {
  const response = await youtube.channels.list({
    part: "snippet,statistics,contentDetails,brandingSettings",
    id: channelId,
  });

  if (!response.data.items.length) return null;

  const channel = response.data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    customUrl: channel.snippet.customUrl,
    publishedAt: channel.snippet.publishedAt,
    country: channel.snippet.country,
    subscriberCount: parseInt(channel.statistics.subscriberCount),
    videoCount: parseInt(channel.statistics.videoCount),
    viewCount: parseInt(channel.statistics.viewCount),
    uploadsPlaylist: channel.contentDetails.relatedPlaylists.uploads,
  };
}
```

### Get Playlist Videos with Pagination

```javascript
async function getPlaylistVideos(youtube, playlistId, maxPages = 10) {
  const videos = [];
  let pageToken = null;
  let pageCount = 0;

  do {
    const response = await youtube.playlistItems.list({
      part: "snippet,contentDetails",
      playlistId: playlistId,
      maxResults: 50,
      pageToken: pageToken,
    });

    for (const item of response.data.items) {
      videos.push({
        videoId: item.contentDetails.videoId,
        title: item.snippet.title,
        position: item.snippet.position,
        publishedAt: item.contentDetails.videoPublishedAt,
      });
    }

    pageToken = response.data.nextPageToken;
    pageCount++;
  } while (pageToken && pageCount < maxPages);

  return videos;
}
```

### Get Comment Threads

```javascript
async function getVideoComments(youtube, videoId, maxResults = 100) {
  const comments = [];
  let pageToken = null;

  while (comments.length < maxResults) {
    const response = await youtube.commentThreads.list({
      part: "snippet,replies",
      videoId: videoId,
      maxResults: Math.min(100, maxResults - comments.length),
      order: "relevance",
      textFormat: "plainText",
      pageToken: pageToken,
    });

    for (const item of response.data.items) {
      const topComment = item.snippet.topLevelComment.snippet;
      const commentData = {
        commentId: item.id,
        author: topComment.authorDisplayName,
        text: topComment.textDisplay,
        likeCount: topComment.likeCount,
        publishedAt: topComment.publishedAt,
        replyCount: item.snippet.totalReplyCount,
        replies: [],
      };

      if (item.replies) {
        commentData.replies = item.replies.comments.map((reply) => ({
          author: reply.snippet.authorDisplayName,
          text: reply.snippet.textDisplay,
          likeCount: reply.snippet.likeCount,
          publishedAt: reply.snippet.publishedAt,
        }));
      }

      comments.push(commentData);
    }

    pageToken = response.data.nextPageToken;
    if (!pageToken) break;
  }

  return comments;
}
```

### Create Playlist and Add Videos (OAuth Required)

```javascript
async function createPlaylist(youtube, title, description = "", privacy = "private") {
  const response = await youtube.playlists.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title, description },
      status: { privacyStatus: privacy },
    },
  });
  return response.data.id;
}

async function addVideoToPlaylist(youtube, playlistId, videoId, position) {
  const body = {
    snippet: {
      playlistId: playlistId,
      resourceId: {
        kind: "youtube#video",
        videoId: videoId,
      },
    },
  };
  if (position !== undefined) {
    body.snippet.position = position;
  }

  return youtube.playlistItems.insert({
    part: "snippet",
    requestBody: body,
  });
}
```

### Fetch with Raw HTTP (No Library)

```javascript
// Using native fetch (Node.js 18+ or browser)
async function searchVideosRaw(apiKey, query, maxResults = 5) {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: maxResults.toString(),
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`YouTube API error: ${error.error.message}`);
  }

  return response.json();
}
```

---

## 14. YouTube Analytics API

The YouTube Analytics API is separate from the Data API and provides channel/content performance metrics.

### Base URL

```
https://youtubeanalytics.googleapis.com/v2
```

### Authentication

Requires OAuth 2.0 with one of these scopes:

| Scope | Description |
|-------|-------------|
| `https://www.googleapis.com/auth/yt-analytics.readonly` | View YouTube Analytics reports |
| `https://www.googleapis.com/auth/yt-analytics-monetary.readonly` | View monetary Analytics reports |
| `https://www.googleapis.com/auth/youtube` | Manage YouTube account |
| `https://www.googleapis.com/auth/youtubepartner` | Manage YouTube partner assets |

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `reports.query` | `GET /reports` | Run analytics queries |
| `groups.list` | `GET /groups` | List analytics groups |
| `groups.insert` | `POST /groups` | Create a group |
| `groups.update` | `PUT /groups` | Update a group |
| `groups.delete` | `DELETE /groups` | Delete a group |
| `groupItems.list` | `GET /groupItems` | List group items |
| `groupItems.insert` | `POST /groupItems` | Add item to group |
| `groupItems.delete` | `DELETE /groupItems` | Remove item from group |

### reports.query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `ids` | Yes | `channel==MINE` or `channel==CHANNEL_ID` or `contentOwner==OWNER_ID` |
| `startDate` | Yes | `YYYY-MM-DD` format |
| `endDate` | Yes | `YYYY-MM-DD` format |
| `metrics` | Yes | Comma-separated metric names |
| `dimensions` | No | Comma-separated dimension names |
| `filters` | No | Semicolon-separated dimension filters |
| `sort` | No | Comma-separated sort fields (prefix `-` for descending) |
| `maxResults` | No | Max rows (0-200) |
| `currency` | No | ISO 4217 currency code for revenue metrics |

### Key Metrics

**Engagement:** `views`, `comments`, `likes`, `dislikes`, `shares`, `subscribersGained`, `subscribersLost`

**Watch Time:** `estimatedMinutesWatched`, `averageViewDuration`, `averageViewPercentage`

**Revenue:** `estimatedRevenue`, `estimatedAdRevenue`, `estimatedRedPartnerRevenue`, `grossRevenue`, `cpm`, `playbackBasedCpm`, `adImpressions`, `monetizedPlaybacks`

**Reach:** `videoThumbnailImpressions`, `videoThumbnailImpressionsClickRate`

**Playlist:** `playlistStarts`, `playlistSaves`, `viewsPerPlaylistStart`, `averageTimeInPlaylist`

**Live:** `averageConcurrentViewers`, `peakConcurrentViewers`

### Key Dimensions

**Time:** `day`, `month`

**Geography:** `country`, `province`, `dma`, `city`, `continent`, `subContinent`

**Content:** `video`, `playlist`, `channel`, `group`, `creatorContentType` (VIDEO_ON_DEMAND, SHORTS, LIVE_STREAM, STORY)

**Traffic:** `insightTrafficSourceType`, `insightTrafficSourceDetail`

**Device:** `deviceType`, `operatingSystem`

**Audience:** `ageGroup`, `gender`, `subscribedStatus`, `youtubeProduct`

**Playback:** `insightPlaybackLocationType`, `insightPlaybackLocationDetail`, `liveOrOnDemand`

### Python Example: Analytics Query

```python
from googleapiclient.discovery import build

def get_channel_analytics(credentials, start_date, end_date):
    """Get channel-level analytics."""
    youtube_analytics = build("youtubeAnalytics", "v2", credentials=credentials)

    response = youtube_analytics.reports().query(
        ids="channel==MINE",
        startDate=start_date,
        endDate=end_date,
        metrics="views,estimatedMinutesWatched,subscribersGained,likes",
        dimensions="day",
        sort="-day"
    ).execute()

    return response


def get_top_videos(credentials, start_date, end_date, max_results=10):
    """Get top videos by views."""
    youtube_analytics = build("youtubeAnalytics", "v2", credentials=credentials)

    response = youtube_analytics.reports().query(
        ids="channel==MINE",
        startDate=start_date,
        endDate=end_date,
        metrics="views,estimatedMinutesWatched,likes,subscribersGained",
        dimensions="video",
        sort="-views",
        maxResults=max_results
    ).execute()

    return response


def get_demographics(credentials, start_date, end_date):
    """Get audience demographics."""
    youtube_analytics = build("youtubeAnalytics", "v2", credentials=credentials)

    response = youtube_analytics.reports().query(
        ids="channel==MINE",
        startDate=start_date,
        endDate=end_date,
        metrics="viewerPercentage",
        dimensions="ageGroup,gender"
    ).execute()

    return response
```

### YouTube Reporting API (Bulk Reports)

For large-scale data, the YouTube Reporting API generates downloadable bulk reports.

**Base URL:** `https://youtubereporting.googleapis.com/v1`

```python
def schedule_report(credentials, report_type_id):
    """Schedule a bulk report job."""
    youtube_reporting = build("youtubereporting", "v1", credentials=credentials)

    # List available report types
    report_types = youtube_reporting.reportTypes().list().execute()

    # Create a reporting job
    job = youtube_reporting.jobs().create(
        body={
            "reportTypeId": report_type_id,
            "name": "My Channel Report"
        }
    ).execute()

    return job
```

---

## 15. Recent Changes & Deprecations

### December 2025

- **Video upload quota cost reduced** from ~1,600 units to ~100 units per upload

### July 2025

- **`mostPopular` chart change:** `videos.list` with `chart=mostPopular` now returns videos from Trending Music, Movies, and Gaming charts instead of the general Trending Now list (YouTube deprecated its general Trending page)

### March 2025

- **Shorts view counting changed:** Views for Shorts now count every time a Short starts to play or replay with no minimum watch time requirement. Affects `videos.statistics.viewCount` and `channels.statistics.viewCount`

### October 2024

- **Synthetic/altered content support:** New `status.containsSyntheticMedia` property on video resources to identify videos containing deepfakes, AI-generated, or manipulated content. Settable via `videos.insert` and `videos.update`

### April 2024

- **Channel discussions removed:** The API no longer supports inserting or retrieving channel discussion threads
- **Caption sync parameter deprecated:** The `sync` parameter for `captions.insert` and `captions.update` is deprecated. Developers must now include timing information in caption uploads or the upload will fail
- **Caption name length limit:** `snippet.name` field for captions limited to 150 characters (exceeding triggers `nameTooLong` error)

### Previously Deprecated (Still Relevant)

- `brandingSettings.channel.moderateComments` -- deprecated
- `comments.markAsSpam` -- deprecated
- `commentThreads.update` -- deprecated
- `search.list` `relatedToVideoId` parameter -- deprecated
- `activities.list` / `activities.insert` -- `bulletin` type deprecated

---

## Appendix: Common Error Codes

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | `badRequest` | Invalid request parameters |
| 401 | `unauthorized` | Invalid or expired credentials |
| 403 | `forbidden` | Insufficient permissions or quota exceeded |
| 403 | `quotaExceeded` | Daily quota limit reached |
| 404 | `notFound` | Resource not found |
| 409 | `conflict` | Resource conflict (e.g., duplicate subscription) |
| 429 | `rateLimitExceeded` | Too many requests in a given time period |
| 500 | `internalError` | YouTube server error (retry with exponential backoff) |

### Error Response Format

```json
{
  "error": {
    "code": 403,
    "message": "The request cannot be completed because you have exceeded your quota.",
    "errors": [
      {
        "message": "The request cannot be completed because you have exceeded your quota.",
        "domain": "youtube.quota",
        "reason": "quotaExceeded"
      }
    ]
  }
}
```

---

## Appendix: Useful Topic IDs for search.list topicId

| Topic | ID |
|-------|----|
| Music | `/m/04rlf` |
| Gaming | `/m/0bzvm2` |
| Sports | `/m/06ntj` |
| Entertainment | `/m/02jjt` |
| News & Politics | `/m/05qt0` |
| Comedy | `/m/09kqc` |
| Film & Animation | `/m/02vxn` |
| Science & Technology | `/m/01k8wb` |
| Education | `/m/01s9f` |
| Howto & Style | `/m/027x7n` |
| Travel & Events | `/m/07bxq` |
| Pets & Animals | `/m/068hy` |
| People & Blogs | `/m/098wr` |
| Autos & Vehicles | `/m/0k4j` |
| Nonprofits & Activism | `/m/0sxhq` |

---

*Sources: [YouTube Data API Official Docs](https://developers.google.com/youtube/v3/docs), [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost), [Revision History](https://developers.google.com/youtube/v3/revision_history), [YouTube Analytics API](https://developers.google.com/youtube/analytics), [Getting Started Guide](https://developers.google.com/youtube/v3/getting-started)*
