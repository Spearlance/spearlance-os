#!/usr/bin/env bash
# Shared JSON escape utility for all armadillo hooks.
# Source this file: source "$(dirname "${BASH_SOURCE[0]}")/lib/json-escape.sh"

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}
