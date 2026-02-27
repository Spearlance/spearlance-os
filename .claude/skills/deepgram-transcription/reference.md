# Deepgram Pre-Recorded Transcription API Reference

## Table of Contents

1. [Authentication](#1-authentication)
2. [Pre-Recorded Audio API](#2-pre-recorded-audio-api)
3. [Models](#3-models)
4. [Feature Flags](#4-feature-flags)
5. [Response Format](#5-response-format)
6. [Practical Examples](#6-practical-examples)
7. [Error Codes](#7-error-codes)
8. [Pricing and Limits](#8-pricing-and-limits)
9. [Audio Intelligence Features](#9-audio-intelligence-features)

---

## 1. Authentication

### API Key Setup

Deepgram uses API keys for authentication. The key is passed via the `Authorization` header.

**Header format:**

```
Authorization: Token YOUR_DEEPGRAM_API_KEY
```

**CRITICAL:** Deepgram uses the `Token` scheme, NOT `Bearer`. Sending `Authorization: Bearer <key>` returns HTTP 401 Unauthorized.

### Environment Variable

The `DEEPGRAM_API_KEY` env var is configured in Claude Code settings. Use it in requests:

```bash
--header "Authorization: Token $DEEPGRAM_API_KEY"
```

### API Key Scopes

API keys can be scoped to specific projects. When creating keys in the Deepgram console, assign appropriate permissions:
- **Member** -- can transcribe audio
- **Admin** -- can manage project settings and keys

---

## 2. Pre-Recorded Audio API

### Endpoint

```
POST https://api.deepgram.com/v1/listen
```

### Request: Local File Upload

Send the audio file as the raw request body with the appropriate `Content-Type` header.

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @recording.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true"
```

**Content-Type values by format:**

| Audio Format | Content-Type |
|-------------|-------------|
| WAV | `audio/wav` |
| MP3 | `audio/mpeg` |
| MP4 / M4A | `audio/mp4` |
| FLAC | `audio/flac` |
| OGG (Opus/Vorbis) | `audio/ogg` |
| WebM | `audio/webm` |
| AAC | `audio/aac` |
| Raw PCM | `audio/pcm` |

Deepgram auto-detects containerized formats (MP3, WAV, FLAC, etc.), so specifying Content-Type is optional but reduces processing overhead.

### Request: Remote URL

Send a JSON body with the `url` field pointing to a publicly accessible audio file.

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"url": "https://example.com/audio.mp3"}' \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true"
```

The URL must be publicly accessible. If the remote server returns a client error (e.g., 401, 403), Deepgram returns HTTP 400 with a message about the remote server error.

### Constraints

| Constraint | Value |
|-----------|-------|
| Max file size | 2 GB |
| Max processing time (Nova models) | 10 minutes |
| Max processing time (Whisper) | 20 minutes |
| Max concurrent requests (PAYG/Growth) | 50 |

---

## 3. Models

### Current Models

| Model | Parameter Value | Best For | Languages |
|-------|----------------|----------|-----------|
| **Nova-3** | `nova-3` | Best accuracy, general use | 60+ languages, multilingual support |
| **Nova-3 Medical** | `nova-3-medical` | Medical terminology | English |
| **Nova-2** | `nova-2` | Legacy support, filler words | 50+ languages |
| **Nova-2 Variants** | `nova-2-meeting`, `nova-2-phonecall`, `nova-2-finance`, `nova-2-voicemail`, `nova-2-video`, `nova-2-medical`, `nova-2-drivethru`, `nova-2-automotive`, `nova-2-atc`, `nova-2-conversationalai` | Domain-specific use cases | Varies |
| **Flux** | `flux-general-en` | Voice agents (streaming only) | English only |
| **Whisper Cloud** | `whisper-tiny`, `whisper-base`, `whisper-small`, `whisper-medium`, `whisper-large` | OpenAI Whisper compatibility | Multilingual |

### Default Model

If you omit the `model` parameter, Deepgram defaults to `base-general`, NOT Nova-3. **Always specify `model=nova-3` explicitly.**

### Nova-3 vs Nova-2

| Feature | Nova-3 | Nova-2 |
|---------|--------|--------|
| Word Error Rate | 47.4% lower than competitors (batch) | Good but higher than Nova-3 |
| Multilingual | Real-time multilingual transcription | Supported but less accurate |
| Domain vocabulary | Self-serve customization | Requires domain-specific variants |
| PII Redaction | Built-in optional redaction | Not native |
| Filler word detection | Not highlighted | Supported (use Nova-2 for this) |
| Price (PAYG) | $0.0077/min (mono), $0.0092/min (multi) | $0.0058/min |

**Recommendation:** Use `nova-3` for all new projects unless you specifically need filler word identification (use `nova-2`) or a domain-specific variant only available on Nova-2.

---

## 4. Feature Flags

All features are enabled via query string parameters on the `/v1/listen` endpoint.

### smart_format

Applies human-readable formatting to transcripts.

```
?smart_format=true
```

**What it formats (English):**
- Punctuation and capitalization
- Dates and times
- Currency amounts
- Phone numbers
- Email addresses
- URLs
- Paragraph breaks

**What it formats (non-English):**
- Punctuation and paragraphs (always)
- Numerals (select languages)

**Important:** `smart_format=true` automatically enables punctuation. Do NOT also set `punctuate=true`.

**Example transformation:**
- Input speech: "i'm recording this at eight thirty seven pm on wednesday"
- Output with smart_format: "I'm recording this at 8:37 PM on Wednesday"

### diarize

Identifies different speakers in the audio and assigns a speaker label to each word.

```
?diarize=true
```

- Speakers are labeled numerically starting from 0: `speaker: 0`, `speaker: 1`, etc.
- Pre-recorded responses include a `speaker_confidence` score per word.
- Works across all available languages.
- **Add-on cost:** $0.0020/min (PAYG), $0.0017/min (Growth).

### utterances

Segments the transcript into speaker turns with timing data.

```
?utterances=true
```

- Each utterance includes: start time, end time, confidence, channel, transcript text, speaker ID (when diarize is also enabled).
- Available for pre-recorded audio only (not streaming).
- Works across all available languages.
- Best combined with `diarize=true` for speaker-segmented output.

### paragraphs

Divides transcript into paragraph blocks.

```
?paragraphs=true
```

- When `diarize=true`, paragraph breaks are influenced by speaker changes.
- Returns a `paragraphs` object in the response with structured paragraph/sentence data.
- Response includes `paragraphs.transcript` with line breaks.

### punctuate

Adds punctuation to the transcript.

```
?punctuate=true
```

**Note:** If using `smart_format=true`, punctuation is already included. Only use `punctuate=true` alone when you want punctuation without other smart formatting.

### detect_language

Identifies the dominant language spoken in the audio.

```
?detect_language=true
```

- Returns `detected_language` field (BCP-47 tag) and `language_confidence` score (0-1).
- Supports 35 languages for pre-recorded audio.
- Can be restricted to specific languages: `?detect_language=en&detect_language=es`

### language

Specifies the expected language of the audio.

```
?language=en
```

- Uses short language codes: `en`, `es`, `fr`, `de`, `ja`, `ko`, `zh`, etc.
- Do NOT use locale codes like `fr-FR`. Deepgram uses `fr` (some exceptions: `fr-CA`, `en-AU`, `en-GB`, `en-IN`, `en-NZ`, `en-US`, `zh-CN`, `zh-TW`).
- For multilingual audio with Nova-3, use `language=multi`.

### topics

Detects key topics in the transcript.

```
?topics=true
```

- Returns topics identified in text segments.
- Powered by task-specific language models (TSLMs) -- topics are generated from context, not a fixed list.

### sentiment

Analyzes sentiment throughout the transcript.

```
?sentiment=true
```

- Returns `positive`, `negative`, or `neutral` sentiment with confidence scores for words, sentences, utterances, and paragraphs.
- Also returns an average sentiment for the entire transcript.

### intents

Recognizes speaker intent.

```
?intents=true
```

- Returns intent labels for text segments with confidence scores.
- Intents are generated from context, not a fixed list.

### summarize

Generates a summary of the transcript.

```
?summarize=v2
```

- Note the value is `v2`, not `true`.

### redact

Redacts personally identifiable information.

```
?redact=pci&redact=ssn
```

Available redaction types: `pci` (payment card), `ssn` (social security numbers), and others.

---

## 5. Response Format

### Basic Response Structure

```json
{
  "metadata": {
    "transaction_key": "string",
    "request_id": "uuid",
    "sha256": "string",
    "created": "ISO 8601 timestamp",
    "duration": 25.933313,
    "channels": 1,
    "models": ["model-uuid"],
    "model_info": {
      "model-uuid": {
        "name": "2-general-nova",
        "version": "2024-01-18.26916",
        "arch": "nova-3"
      }
    }
  },
  "results": {
    "channels": [
      {
        "alternatives": [
          {
            "transcript": "Full transcript text here as a single string.",
            "confidence": 0.9987,
            "words": [
              {
                "word": "hello",
                "start": 0.08,
                "end": 0.32,
                "confidence": 0.9995,
                "punctuated_word": "Hello",
                "speaker": 0,
                "speaker_confidence": 0.7832
              }
            ],
            "paragraphs": {
              "transcript": "Paragraph-formatted transcript with line breaks.",
              "paragraphs": [
                {
                  "sentences": [
                    {
                      "text": "Hello, how are you?",
                      "start": 0.08,
                      "end": 1.52
                    }
                  ],
                  "speaker": 0,
                  "num_words": 5,
                  "start": 0.08,
                  "end": 1.52
                }
              ]
            }
          }
        ]
      }
    ],
    "utterances": [
      {
        "start": 0.08,
        "end": 3.44,
        "confidence": 0.9876,
        "channel": 0,
        "transcript": "Hello, how are you doing today?",
        "words": [
          {
            "word": "hello",
            "start": 0.08,
            "end": 0.32,
            "confidence": 0.9995,
            "punctuated_word": "Hello",
            "speaker": 0,
            "speaker_confidence": 0.7832
          }
        ],
        "speaker": 0,
        "id": "uuid"
      }
    ]
  }
}
```

### Extracting Data

**Full transcript (single string):**
```bash
jq -r '.results.channels[0].alternatives[0].transcript' response.json
```

**Paragraph-formatted transcript (with line breaks):**
```bash
jq -r '.results.channels[0].alternatives[0].paragraphs.transcript' response.json
```

**Word-level timestamps:**
```bash
jq '.results.channels[0].alternatives[0].words[] | {word: .punctuated_word, start: .start, end: .end}' response.json
```

**Speaker-labeled utterances:**
```bash
jq -r '.results.utterances[] | "Speaker \(.speaker): \(.transcript)"' response.json
```

**Audio duration:**
```bash
jq '.metadata.duration' response.json
```

**Detected language (when detect_language=true):**
```bash
jq -r '.results.channels[0].detected_language' response.json
```

### Key Response Fields

| Path | Type | Description |
|------|------|-------------|
| `metadata.request_id` | string | Unique request identifier |
| `metadata.duration` | float | Audio duration in seconds |
| `metadata.channels` | int | Number of audio channels |
| `results.channels[].alternatives[].transcript` | string | Full transcript text |
| `results.channels[].alternatives[].confidence` | float | Overall confidence (0-1) |
| `results.channels[].alternatives[].words[]` | array | Word-level data |
| `results.channels[].alternatives[].words[].word` | string | Raw word |
| `results.channels[].alternatives[].words[].punctuated_word` | string | Formatted word |
| `results.channels[].alternatives[].words[].start` | float | Start time (seconds) |
| `results.channels[].alternatives[].words[].end` | float | End time (seconds) |
| `results.channels[].alternatives[].words[].confidence` | float | Word confidence (0-1) |
| `results.channels[].alternatives[].words[].speaker` | int | Speaker ID (when diarize=true) |
| `results.channels[].alternatives[].words[].speaker_confidence` | float | Speaker confidence (pre-recorded only) |
| `results.channels[].alternatives[].paragraphs` | object | Paragraph data (when paragraphs=true or smart_format=true) |
| `results.channels[].alternatives[].paragraphs.transcript` | string | Formatted transcript with line breaks |
| `results.channels[].alternatives[].paragraphs.paragraphs[]` | array | Individual paragraph objects |
| `results.channels[].detected_language` | string | BCP-47 tag (when detect_language=true) |
| `results.utterances[]` | array | Utterance data (when utterances=true) |
| `results.utterances[].speaker` | int | Speaker ID (when diarize=true) |
| `results.utterances[].transcript` | string | Utterance text |
| `results.utterances[].start` | float | Utterance start time (seconds) |
| `results.utterances[].end` | float | Utterance end time (seconds) |

---

## 6. Practical Examples

### Example 1: Transcribe a local file with curl

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @recording.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true" \
  -o transcript.json

# Extract just the text
jq -r '.results.channels[0].alternatives[0].transcript' transcript.json
```

### Example 2: Multi-speaker brand interview (recommended settings)

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/mp3" \
  --data-binary @interview.mp3 \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&paragraphs=true" \
  -o interview_transcript.json

# Extract speaker-labeled transcript
jq -r '.results.utterances[] | "Speaker \(.speaker): \(.transcript)"' interview_transcript.json
```

### Example 3: Python -- transcribe local file

```python
import requests
import os
import json

API_KEY = os.environ["DEEPGRAM_API_KEY"]
AUDIO_FILE = "recording.wav"

url = "https://api.deepgram.com/v1/listen"
params = {
    "model": "nova-3",
    "smart_format": "true",
    "diarize": "true",
    "utterances": "true",
    "paragraphs": "true",
}

headers = {
    "Authorization": f"Token {API_KEY}",
    "Content-Type": "audio/wav",
}

with open(AUDIO_FILE, "rb") as audio:
    response = requests.post(url, headers=headers, params=params, data=audio)

result = response.json()

# Full transcript
transcript = result["results"]["channels"][0]["alternatives"][0]["transcript"]
print(transcript)

# Speaker-labeled utterances
for utterance in result["results"].get("utterances", []):
    print(f"Speaker {utterance['speaker']}: {utterance['transcript']}")
```

### Example 4: Python -- transcribe from URL

```python
import requests
import os

API_KEY = os.environ["DEEPGRAM_API_KEY"]

url = "https://api.deepgram.com/v1/listen"
params = {"model": "nova-3", "smart_format": "true"}

headers = {
    "Authorization": f"Token {API_KEY}",
    "Content-Type": "application/json",
}

payload = {"url": "https://dpgr.am/spacewalk.wav"}
response = requests.post(url, headers=headers, params=params, json=payload)
result = response.json()

print(result["results"]["channels"][0]["alternatives"][0]["transcript"])
```

### Example 5: Node.js -- transcribe local file

```javascript
const fs = require("fs");
const https = require("https");

const API_KEY = process.env.DEEPGRAM_API_KEY;
const audioFile = fs.readFileSync("recording.wav");

const options = {
  hostname: "api.deepgram.com",
  path: "/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true",
  method: "POST",
  headers: {
    Authorization: `Token ${API_KEY}`,
    "Content-Type": "audio/wav",
    "Content-Length": audioFile.length,
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const result = JSON.parse(data);
    // Full transcript
    console.log(result.results.channels[0].alternatives[0].transcript);
    // Speaker-labeled utterances
    if (result.results.utterances) {
      result.results.utterances.forEach((u) => {
        console.log(`Speaker ${u.speaker}: ${u.transcript}`);
      });
    }
  });
});

req.write(audioFile);
req.end();
```

### Example 6: Node.js -- transcribe from URL (using fetch)

```javascript
const API_KEY = process.env.DEEPGRAM_API_KEY;

const response = await fetch(
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
  {
    method: "POST",
    headers: {
      Authorization: `Token ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: "https://dpgr.am/spacewalk.wav" }),
  }
);

const result = await response.json();
console.log(result.results.channels[0].alternatives[0].transcript);
```

### Example 7: Extract just the text to a file (shell pipeline)

```bash
curl -s -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @recording.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&paragraphs=true" \
  | jq -r '.results.channels[0].alternatives[0].paragraphs.transcript' \
  > transcript.txt
```

### Example 8: Batch transcribe multiple files

```bash
for file in *.wav; do
  echo "Transcribing: $file"
  curl -s -X POST \
    --header "Authorization: Token $DEEPGRAM_API_KEY" \
    --header "Content-Type: audio/wav" \
    --data-binary @"$file" \
    "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true" \
    | jq -r '.results.utterances[] | "Speaker \(.speaker): \(.transcript)"' \
    > "${file%.wav}_transcript.txt"
done
```

---

## 7. Error Codes

### HTTP Status Codes

| Status | Meaning | Common Cause | Fix |
|--------|---------|-------------|-----|
| 200 | Success | -- | -- |
| 400 | Bad Request | Invalid request format | Check Content-Type, model/language combo, audio encoding |
| 401 | Unauthorized | Invalid or missing API key | Verify API key; use `Token` not `Bearer` |
| 402 | Payment Required | Insufficient credits | Add credits or upgrade plan |
| 403 | Forbidden | Key lacks permission | Check API key scopes and project access |
| 404 | Not Found | Wrong endpoint URL | Use `https://api.deepgram.com/v1/listen` |
| 408 | Request Timeout | Audio too long to process | Split file into smaller segments |
| 429 | Too Many Requests | Rate limit exceeded | Reduce concurrent requests; check tier limits |
| 500 | Internal Server Error | Deepgram server issue | Retry with exponential backoff |

### Common 400 Error Messages

| Error Message | Cause | Fix |
|--------------|-------|-----|
| "No such model/language/tier combination found" | Invalid model + language combo | Check model supports your language; use short language codes (`fr` not `fr-FR`) |
| "The remote server hosting the media returned a client error: 401" | URL-based request, remote server rejected Deepgram's fetch | Ensure URL is publicly accessible (no auth required) |
| "Could not process audio" | Corrupt, empty, or unsupported file | Validate file is playable; try converting to WAV |
| Missing encoding/sample_rate for raw audio | Sent raw PCM without format metadata | Add `encoding=linear16&sample_rate=16000` to query string |

### Retry Strategy

For 429 and 5xx errors, implement exponential backoff:

```python
import time
import requests

def transcribe_with_retry(audio_path, max_retries=3):
    for attempt in range(max_retries):
        response = requests.post(
            "https://api.deepgram.com/v1/listen",
            headers={
                "Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}",
                "Content-Type": "audio/wav",
            },
            params={"model": "nova-3", "smart_format": "true"},
            data=open(audio_path, "rb"),
        )
        if response.status_code == 200:
            return response.json()
        if response.status_code in (429, 500, 502, 503):
            wait = 2 ** attempt
            print(f"Retrying in {wait}s (status {response.status_code})")
            time.sleep(wait)
            continue
        response.raise_for_status()
    raise Exception(f"Failed after {max_retries} retries")
```

---

## 8. Pricing and Limits

### Speech-to-Text Pricing (Per Minute)

| Model | Pay-as-you-go | Growth ($4,000+/yr) |
|-------|--------------|---------------------|
| Nova-3 (monolingual) | $0.0077 | $0.0065 |
| Nova-3 (multilingual) | $0.0092 | $0.0078 |
| Nova-1 & Nova-2 | $0.0058 | $0.0047 |
| Enhanced | $0.0165 | $0.0136 |
| Base | $0.0145 | $0.0105 |
| Flux | $0.0077 | $0.0065 |

### Add-On Costs (Per Minute)

| Feature | Pay-as-you-go | Growth |
|---------|--------------|--------|
| Speaker Diarization | $0.0020 | $0.0017 |
| Redaction | $0.0020 | $0.0017 |
| Keyterm Prompting | $0.0013 | $0.0012 |

### Free Credits

New accounts receive $200 in free credits with no expiration and no credit card required.

### Cost Estimate: 1-Hour Brand Interview

Using Nova-3 mono + diarization on PAYG:
- Transcription: 60 min x $0.0077 = $0.462
- Diarization: 60 min x $0.0020 = $0.120
- **Total: $0.582 per hour**

### Rate Limits (Concurrent Requests)

#### Pre-Recorded Speech-to-Text

| Model | Pay-as-you-go | Growth | Enterprise |
|-------|--------------|--------|------------|
| Nova-3, Nova-2, Nova, Enhanced, Base | 50 | 50 | 200+ |
| Flux | 150 (streaming) | 225 (streaming) | 300 (streaming) |
| Whisper Cloud | 3 | 3 | 15+ |
| Speaker Diarization | 50 | 50 | 100 |

#### Audio Intelligence

| Feature | Pay-as-you-go | Growth | Enterprise |
|---------|--------------|--------|------------|
| Intent Recognition | 10 | 10 | 10 |
| Entity Detection | 5 | 5 | 10 |
| Sentiment Analysis | 10 | 10 | 10 |
| Summarization | 10 | 10 | 20 |
| Topic Detection | 10 | 10 | 10 |

---

## 9. Audio Intelligence Features

Deepgram offers additional intelligence features beyond basic transcription. These are enabled via query parameters on the same `/v1/listen` endpoint.

### Topic Detection

```
?topics=true
```

Returns topics identified within text segments. Topics are generated from context by task-specific language models (TSLMs), not from a fixed list.

### Sentiment Analysis

```
?sentiment=true
```

Returns sentiment (`positive`, `negative`, `neutral`) with confidence scores at word, sentence, utterance, and paragraph levels. Also provides an average sentiment for the entire transcript.

### Intent Recognition

```
?intents=true
```

Returns intent labels for text segments with confidence scores. Intents are context-generated, not from a fixed list.

### Summarization

```
?summarize=v2
```

Generates a summary of the transcript content. Note: the value is `v2`, not `true`.

### Combined Example: Full Analysis

```bash
curl -X POST \
  --header "Authorization: Token $DEEPGRAM_API_KEY" \
  --header "Content-Type: audio/wav" \
  --data-binary @meeting.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&topics=true&sentiment=true&intents=true&summarize=v2" \
  -o full_analysis.json
```

This returns the transcript with speaker labels, topic analysis, sentiment scoring, intent recognition, and a summary in a single API call.

---

## Appendix: Quick Copy-Paste Commands

### Minimal transcription (just get text)

```bash
curl -s -X POST \
  -H "Authorization: Token $DEEPGRAM_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @FILE.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true" \
  | jq -r '.results.channels[0].alternatives[0].transcript'
```

### Full interview transcription (speakers + paragraphs)

```bash
curl -s -X POST \
  -H "Authorization: Token $DEEPGRAM_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @FILE.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&paragraphs=true" \
  | jq -r '.results.utterances[] | "Speaker \(.speaker): \(.transcript)"'
```

### Save full JSON response for later processing

```bash
curl -s -X POST \
  -H "Authorization: Token $DEEPGRAM_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @FILE.wav \
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&diarize=true&utterances=true&paragraphs=true" \
  -o transcript.json
```
