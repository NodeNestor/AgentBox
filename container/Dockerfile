FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV TERM=xterm-256color

# Core packages + desktop tools for MCP desktop control
RUN apt-get update && apt-get install -y \
    xvfb x11vnc openbox novnc websockify \
    xdotool scrot xclip wmctrl x11-utils \
    chromium-browser \
    curl wget git build-essential jq \
    python3 python3-pip python3-venv \
    supervisor socat \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Playwright MCP + browser
RUN npm install -g @playwright/mcp@latest && \
    npx playwright install --with-deps chromium

# MCP Python SDK + mem0
RUN pip3 install --break-system-packages --ignore-installed \
    mcp \
    mem0ai

# Desktop control MCP server
COPY mcp-tools/ /opt/mcp-tools/

# Claude MCP config — auto-registers desktop-control + playwright + mem0
RUN mkdir -p /root/.claude && \
    echo '{ \
  "mcpServers": { \
    "desktop-control": { \
      "command": "python3", \
      "args": ["/opt/mcp-tools/desktop-control/server.py"] \
    }, \
    "playwright": { \
      "command": "npx", \
      "args": ["@playwright/mcp@latest", "--no-sandbox"] \
    } \
  } \
}' > /root/.claude/settings.json

# Container API
COPY api/ /opt/agent-api/
RUN cd /opt/agent-api && npm install

# Openbox config — auto-maximize browser windows
RUN mkdir -p /root/.config/openbox && \
    echo '<?xml version="1.0" encoding="UTF-8"?> \
<openbox_config xmlns="http://openbox.org/3.4/rc"> \
  <applications> \
    <application class="Chromium*"><decor>no</decor><maximized>true</maximized></application> \
    <application class="Google-chrome*"><decor>no</decor><maximized>true</maximized></application> \
    <application name="*Playwright*"><decor>no</decor><maximized>true</maximized></application> \
  </applications> \
</openbox_config>' > /root/.config/openbox/rc.xml

# Supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Workspace + memory persistence
RUN mkdir -p /workspace /agent-memory
WORKDIR /workspace

# Ports: 6080=noVNC, 8080=agent API, 5900=VNC
EXPOSE 6080 8080 5900

ENTRYPOINT ["/entrypoint.sh"]
