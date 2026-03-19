// Standalone WebSocket server for auth container terminal access
// Runs alongside Next.js on port 3001
const { WebSocketServer } = require("ws");
const Docker = require("dockerode");

const docker = new Docker({ socketPath: "/var/run/docker.sock" });
const PORT = 3001;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", async (ws) => {
  console.log("[auth-terminal] Client connected");

  try {
    const container = docker.getContainer("agentbox-auth");

    const exec = await container.exec({
      Cmd: ["/bin/bash"],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Env: ["TERM=xterm-256color", "COLUMNS=120", "LINES=40"],
    });

    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

    // Container output → WebSocket
    stream.on("data", (chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "output", data: chunk.toString() }));
      }
    });

    stream.on("end", () => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "done" }));
      }
      ws.close();
    });

    // WebSocket → Container input
    ws.on("message", (msg) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "input") {
          stream.write(parsed.data);
        }
        if (parsed.type === "resize" && exec.resize) {
          exec.resize({ h: parsed.rows, w: parsed.cols }).catch(() => {});
        }
      } catch {}
    });

    ws.on("close", () => {
      console.log("[auth-terminal] Client disconnected");
      stream.end();
    });
  } catch (err) {
    console.error("[auth-terminal] Error:", err.message);
    ws.send(JSON.stringify({ type: "error", data: "Failed to connect to auth container" }));
    ws.close();
  }
});

console.log(`[auth-terminal] WebSocket server on :${PORT}`);
