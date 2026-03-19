const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const pty = require("node-pty");
const { spawn } = require("child_process");

const app = express();
app.use(express.json());

const server = http.createServer(app);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Trigger endpoint (for GitHub Actions / cron)
app.post("/trigger", (req, res) => {
  const { prompt, repo, event } = req.body;
  const taskPrompt = prompt || `Handle ${event} event for ${repo}`;

  const claude = spawn("claude", ["-p", taskPrompt, "--allowedTools", "Edit,Bash,Read,Write"], {
    cwd: "/workspace",
    env: { ...process.env },
  });

  let output = "";
  claude.stdout.on("data", (d) => (output += d.toString()));
  claude.stderr.on("data", (d) => (output += d.toString()));
  claude.on("close", (code) => {
    res.json({ code, output });
  });
});

// === WebSocket: Terminal ===
const termWss = new WebSocketServer({ noServer: true });
termWss.on("connection", (ws) => {
  const shell = pty.spawn("bash", [], {
    name: "xterm-256color",
    cols: 120,
    rows: 40,
    cwd: "/workspace",
    env: { ...process.env, TERM: "xterm-256color" },
  });

  shell.onData((data) => ws.send(JSON.stringify({ type: "output", data })));
  ws.on("message", (msg) => {
    const parsed = JSON.parse(msg);
    if (parsed.type === "input") shell.write(parsed.data);
    if (parsed.type === "resize") shell.resize(parsed.cols, parsed.rows);
  });
  ws.on("close", () => shell.kill());
});

// === WebSocket: Claude Chat ===
const chatWss = new WebSocketServer({ noServer: true });
chatWss.on("connection", (ws) => {
  let claudeProc = null;

  ws.on("message", (msg) => {
    const parsed = JSON.parse(msg);

    if (parsed.type === "chat") {
      // Kill previous if still running
      if (claudeProc) claudeProc.kill();

      claudeProc = spawn("claude", ["-p", parsed.message, "--allowedTools", "Edit,Bash,Read,Write"], {
        cwd: parsed.cwd || "/workspace",
        env: { ...process.env },
      });

      claudeProc.stdout.on("data", (data) => {
        ws.send(JSON.stringify({ type: "response", data: data.toString() }));
      });

      claudeProc.stderr.on("data", (data) => {
        ws.send(JSON.stringify({ type: "error", data: data.toString() }));
      });

      claudeProc.on("close", (code) => {
        ws.send(JSON.stringify({ type: "done", code }));
        claudeProc = null;
      });
    }
  });

  ws.on("close", () => {
    if (claudeProc) claudeProc.kill();
  });
});

// Route WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws/terminal") {
    termWss.handleUpgrade(req, socket, head, (ws) => termWss.emit("connection", ws, req));
  } else if (req.url === "/ws/chat") {
    chatWss.handleUpgrade(req, socket, head, (ws) => chatWss.emit("connection", ws, req));
  } else {
    socket.destroy();
  }
});

const PORT = process.env.API_PORT || 8080;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`AgentBox container API listening on :${PORT}`);
});
