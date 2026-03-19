#!/bin/bash
set -e

export DISPLAY=:99

echo "=== AgentBox Agent Container ==="

# The /root/.claude volume is mounted READ-ONLY from auth container (credentials only)
# We need to make credentials available while having our own writable config
# Solution: copy credentials to a writable location, add our MCP config

# Create writable claude config dir
mkdir -p /root/.claude-local /agent-memory/mem0

# Copy auth credentials from read-only mount (if they exist)
if [ -d /root/.claude-auth ]; then
  cp /root/.claude-auth/.credentials.json /root/.claude-local/.credentials.json 2>/dev/null || true
  cp /root/.claude-auth/.auth.json /root/.claude-local/.auth.json 2>/dev/null || true
  cp /root/.claude-auth/auth.json /root/.claude-local/auth.json 2>/dev/null || true
fi

# Write MCP settings
cat > /root/.claude-local/settings.json << 'SETTINGS'
{
  "mcpServers": {
    "desktop-control": {
      "command": "python3",
      "args": ["/opt/mcp-tools/desktop-control/server.py"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--no-sandbox"]
    }
  }
}
SETTINGS

# Point Claude to our writable config
export CLAUDE_CONFIG_DIR=/root/.claude-local

# Background: keep credentials synced from read-only mount
(while true; do
  if [ -d /root/.claude-auth ]; then
    cp /root/.claude-auth/.credentials.json /root/.claude-local/.credentials.json 2>/dev/null || true
    cp /root/.claude-auth/.auth.json /root/.claude-local/.auth.json 2>/dev/null || true
  fi
  sleep 30
done) &

# Start supervisor (manages all processes)
exec /usr/bin/supervisord -n -c /etc/supervisor/conf.d/supervisord.conf
