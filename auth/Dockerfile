FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm-256color

# Node.js + basic tools
RUN apt-get update && apt-get install -y \
    curl jq netcat-openbsd \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Claude Code
RUN npm install -g @anthropic-ai/claude-code

RUN mkdir -p /root/.claude /claude-auth

COPY sync.sh /sync.sh
RUN chmod +x /sync.sh

EXPOSE 9090

# Keep stdin open for interactive `claude login`
# Usage: docker exec -it agentbox-auth claude login
CMD ["/sync.sh"]
