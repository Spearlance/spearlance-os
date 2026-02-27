---
model: claude-sonnet-4-6
name: deepgram-transcription
description: Use when transcribing audio files to text, processing voice recordings, meeting notes, interviews, discovery calls, or any audio-to-text conversion. Also use when working with the Deepgram API for speech recognition.
---

# Deepgram Transcription

## Overview

Transcribe audio files to text using Deepgram's Nova-3 speech-to-text REST API, the current-generation model delivering a 47.4% reduction in word error rate for batch processing compared to competitors.

## Quick Reference

| Item | Value |
|------|-------|
| Endpoint | `POST https://api.deepgram.com/v1/listen` |
| Auth Header | `Authorization: Token YOUR_DEEPGRAM_API_KEY` |
| Model | `nova-3` (current best; default is `base` if omitted -- always specify `nova-3`) |
| Max File Size | 2 GB |
| Concurrent Requests | 50 pre-recorded (Pay-as-you-go / Growth) |
| Pricing (PAYG) | $0.0077/min Nova-3 mono, $0.0092/min Nova-3 multilingual |
| Free Credits | $200 on sign-up (no expiration) |

## Authentication

The env var `DEEPGRAM_API_KEY` is set in Claude Code settings.

**Header format:** `Authorization: Token $DEEPGRAM_API_KEY`

**CRITICAL:** Deepgram uses `Token`, NOT `Bearer`. Using `Bearer` returns 401 Unauthorized.

## Common Operations

### Transcribe a local audio file

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @recording.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true"
```

Set `Content-Type` to match the audio format (`audio/wav`, `audio/mpeg` for MP3, `audio/flac`, `audio/mp4`, `audio/ogg`, `audio/webm`). Deepgram auto-detects format, but specifying it reduces unnecessary computation.

### Transcribe a remote audio file (URL)

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"url": "https://example.com/recording.mp3"}' \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true"
```

### Extract transcript text from response

```bash
# Full transcript as a single string
jq -r '.results.channels[0].alternatives[0].transcript' response.json

# Paragraphs with speaker labels (when diarize=true and paragraphs=true)
jq -r '.results.channels[0].alternatives[0].paragraphs.transcript' response.json
```

### Multi-speaker transcription with smart formatting (brand interviews)

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @interview.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&paragraphs=true"
```

Features enabled:
- `smart_format=true` -- punctuation, capitalization, formatting of dates/times/currency/phone numbers/emails
- `diarize=true` -- identifies different speakers (speaker: 0, speaker: 1, etc.)
- `utterances=true` -- segments transcript into speaker turns with timing
- `paragraphs=true` -- adds paragraph breaks (influenced by speaker changes when diarize is on)

**Note:** `smart_format=true` automatically enables punctuation. Do NOT also set `punctuate=true`.

### Transcribe with language detection

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @recording.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&detect_language=true"
```

## Supported Audio Formats

Deepgram supports 100+ audio formats. Common ones:

| Format | Content-Type | Notes |
|--------|-------------|-------|
| WAV | `audio/wav` | Uncompressed, best quality |
| MP3 | `audio/mpeg` | Compressed, most common |
| MP4/M4A | `audio/mp4` | Video container with audio |
| FLAC | `audio/flac` | Lossless compression |
| OGG | `audio/ogg` | Open format |
| WebM | `audio/webm` | Web recordings |
| AAC | `audio/aac` | Apple ecosystem |
| PCM | `audio/pcm` | Raw audio (must specify `encoding` and `sample_rate`) |

Containerized audio (MP3, WAV, FLAC, etc.) is auto-detected. Raw audio (PCM) requires `encoding` and `sample_rate` query parameters.

## Rate Limits (Concurrent Pre-recorded Requests)

| Tier | Nova-3/Nova-2 | Whisper | Diarization |
|------|--------------|---------|-------------|
| Pay-as-you-go | 50 | 3 | 50 |
| Growth | 50 | 3 | 50 |
| Enterprise | 200+ | 15+ | 100 |

## Pricing (Per Minute, Speech-to-Text)

| Model | Pay-as-you-go | Growth |
|-------|--------------|--------|
| Nova-3 (monolingual) | $0.0077 | $0.0065 |
| Nova-3 (multilingual) | $0.0092 | $0.0078 |
| Nova-1 & Nova-2 | $0.0058 | $0.0047 |

**Add-on costs per minute:** Diarization +$0.0020 (PAYG), Redaction +$0.0020, Keyterm Prompting +$0.0013.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `Authorization: Bearer` | Use `Authorization: Token` -- Deepgram does NOT use Bearer tokens |
| Not specifying `model=nova-3` | Default model is `base`. Always pass `model=nova-3` for best accuracy |
| Setting both `smart_format=true` and `punctuate=true` | `smart_format` already enables punctuation; do not double-set |
| Using `fr-FR` style language codes | Deepgram uses short codes: `fr`, `es`, `de`, not `fr-FR` |
| Sending raw PCM without encoding params | Raw audio needs `encoding=linear16&sample_rate=16000` (or appropriate values) |
| Expecting `Bearer` in SDK config | SDKs also use `Token` auth internally |
| Exceeding 2 GB file size | Split large files before uploading |

## Full Reference

See `reference.md` for complete API documentation including response JSON structure, all feature flags, SDK examples (Python/Node.js), error codes, and Audio Intelligence features (sentiment, topics, intents, summarization).
