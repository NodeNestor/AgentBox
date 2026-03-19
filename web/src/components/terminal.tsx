"use client";

import { useEffect, useRef } from "react";

export default function Terminal({ apiPort }: { apiPort: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      // @ts-ignore - CSS import for xterm styles
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
          cursor: "#4ade80",
          cursorAccent: "#050505",
          selectionBackground: "#4ade8020",
          selectionForeground: "#4ade80",
          black: "#1a1a1a",
          brightBlack: "#555555",
          white: "#d4d4d4",
          brightWhite: "#ffffff",
          green: "#4ade80",
          brightGreen: "#86efac",
          red: "#f87171",
          brightRed: "#fca5a5",
          yellow: "#fbbf24",
          brightYellow: "#fde68a",
          blue: "#60a5fa",
          brightBlue: "#93c5fd",
          cyan: "#22d3ee",
          brightCyan: "#67e8f9",
          magenta: "#c084fc",
          brightMagenta: "#d8b4fe",
        },
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;

      const ws = new WebSocket(`ws://${window.location.hostname}:${apiPort}/ws/terminal`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
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
  }, [apiPort]);

  return <div ref={containerRef} className="h-full w-full bg-void" />;
}
