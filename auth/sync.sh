#!/bin/bash
set -e

AUTH_DIR="/root/.claude"
SHARED_DIR="/claude-auth"
SYNC_INTERVAL=30

mkdir -p "$SHARED_DIR"

echo "╔══════════════════════════════════════╗"
echo "║        AgentBox Auth Container       ║"
echo "╠══════════════════════════════════════╣"
echo "║                                      ║"
echo "║  To log in:                          ║"
echo "║  docker exec -it agentbox-auth       ║"
echo "║    claude login                      ║"
echo "║                                      ║"
echo "║  Auth container holds refresh token  ║"
echo "║  Agents only get access token        ║"
echo "║                                      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Strip refresh token — agents only get access token
sync_access_token() {
  local src="$AUTH_DIR/.credentials.json"

  if [ ! -f "$src" ]; then
    return 1
  fi

  # Read the full credentials
  local access_token expires_at

  # Try claudeAiOauth format (subscription login)
  access_token=$(jq -r '.claudeAiOauth.accessToken // empty' "$src" 2>/dev/null)
  expires_at=$(jq -r '.claudeAiOauth.expiresAt // empty' "$src" 2>/dev/null)

  # Fallback: try top-level format
  if [ -z "$access_token" ]; then
    access_token=$(jq -r '.accessToken // empty' "$src" 2>/dev/null)
    expires_at=$(jq -r '.expiresAt // empty' "$src" 2>/dev/null)
  fi

  if [ -z "$access_token" ]; then
    echo "[$(date +%H:%M:%S)] No access token found in credentials"
    return 1
  fi

  # Write sanitized credentials — access token only, NO refresh token
  cat > "$SHARED_DIR/.credentials.json" << CRED_EOF
{
  "claudeAiOauth": {
    "accessToken": "$access_token",
    "expiresAt": "$expires_at"
  }
}
CRED_EOF

  # Copy other non-sensitive auth files agents might need
  for f in "$AUTH_DIR/.auth.json" "$AUTH_DIR/auth.json"; do
    [ -f "$f" ] && cp "$f" "$SHARED_DIR/" 2>/dev/null || true
  done

  # Copy settings/config (not secrets)
  for f in "$AUTH_DIR/settings.json" "$AUTH_DIR/.settings.json"; do
    [ -f "$f" ] && cp "$f" "$SHARED_DIR/" 2>/dev/null || true
  done

  echo "[$(date +%H:%M:%S)] Access token synced (expires: $expires_at)"
  return 0
}

# Check if token is expiring soon (within 5 minutes)
token_expiring_soon() {
  local src="$AUTH_DIR/.credentials.json"
  if [ ! -f "$src" ]; then return 0; fi

  local expires_at
  expires_at=$(jq -r '.claudeAiOauth.expiresAt // .expiresAt // empty' "$src" 2>/dev/null)
  if [ -z "$expires_at" ]; then return 0; fi

  local now expires_ts
  now=$(date +%s)

  # Handle milliseconds vs seconds
  if [ ${#expires_at} -gt 12 ]; then
    expires_ts=$((expires_at / 1000))
  else
    expires_ts=$expires_at
  fi

  local remaining=$((expires_ts - now))
  if [ "$remaining" -lt 300 ]; then
    echo "[$(date +%H:%M:%S)] Token expiring in ${remaining}s — refreshing"
    return 0
  fi
  return 1
}

# Attempt token refresh using Claude Code itself
refresh_token() {
  echo "[$(date +%H:%M:%S)] Attempting token refresh..."
  # claude --version triggers the token refresh internally
  claude --version > /dev/null 2>&1 || true
  sleep 2
  sync_access_token
}

# Main sync loop
main_loop() {
  while true; do
    if sync_access_token; then
      # Check if we need to refresh
      if token_expiring_soon; then
        refresh_token
      fi
    else
      echo "[$(date +%H:%M:%S)] Waiting for login... (docker exec -it agentbox-auth claude login)"
    fi

    sleep "$SYNC_INTERVAL"
  done
}

# Run sync loop in background
main_loop &
SYNC_PID=$!

# Health API — simple status endpoint
serve_health() {
  while true; do
    local has_creds="false"
    local has_token="false"
    local token_age="unknown"

    [ -f "$AUTH_DIR/.credentials.json" ] && has_creds="true"
    [ -f "$SHARED_DIR/.credentials.json" ] && has_token="true"

    if [ -f "$SHARED_DIR/.credentials.json" ]; then
      local mod_time
      mod_time=$(stat -c %Y "$SHARED_DIR/.credentials.json" 2>/dev/null || echo 0)
      local now=$(date +%s)
      token_age="$((now - mod_time))s ago"
    fi

    local body="{\"status\":\"ok\",\"logged_in\":$has_creds,\"token_shared\":$has_token,\"last_sync\":\"$token_age\"}"
    local response="HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${#body}\r\nConnection: close\r\n\r\n$body"
    echo -e "$response" | nc -l -p 9090 -q 1 2>/dev/null || sleep 1
  done
}

serve_health
