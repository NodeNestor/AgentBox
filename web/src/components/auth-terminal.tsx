"use client";

import { useEffect, useRef } from "react";

export default function AuthTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // @ts-ignore
      await import("@xterm/xterm/css/xterm.css");

      if (!mounted || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        cursorWidth: 2,
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: "'Geist Mono', 'SF Mono', 'Cascadia Code', monospace",
        theme: {
          background: "#050505",
          foreground: "#d4d4d4",
          cursor: "#fbbf24",
          cursorAccent: "#050505",
          selectionBackground: "#fbbf2420",
          green: "#4ade80",
          yellow: "#fbbf24",
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;

      // Connect to auth terminal WebSocket on port 3334 (mapped to 3001)
      const wsPort = window.location.port === "3333" ? "3334" : "3001";
      const ws = new WebSocket(`ws://${window.location.hostname}:${wsPort}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        term.writeln("\x1b[33m=== Auth Container Terminal ===\x1b[0m");
        term.writeln("\x1b[90mRun: claude login\x1b[0m");
        term.writeln("");
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
        if (msg.type === "error") term.writeln(`\x1b[31m${msg.data}\x1b[0m`);
      };

      term.onData((data) => {
        ws.send(JSON.stringify({ type: "input", data }));
      });

      term.onResize(({ cols, rows }) => {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      });

      const onResize = () => fitAddon.fit();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    };

    init();

    return () => {
      mounted = false;
      wsRef.current?.close();
      termRef.current?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full bg-void" />;
}
