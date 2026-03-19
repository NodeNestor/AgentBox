"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant" | "error";
  content: string;
}

export default function Chat({ apiPort }: { apiPort: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:${apiPort}/ws/chat`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "response") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, content: last.content + msg.data }];
          }
          return [...prev, { role: "assistant", content: msg.data }];
        });
      } else if (msg.type === "error") {
        setMessages((prev) => [...prev, { role: "error", content: msg.data }]);
      } else if (msg.type === "done") {
        setStreaming(false);
      }
    };

    return () => ws.close();
  }, [apiPort]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim() || !wsRef.current || streaming) return;
    const message = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setStreaming(true);
    wsRef.current.send(JSON.stringify({ type: "chat", message }));
    inputRef.current?.focus();
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-5 py-6 md:px-8">
          {messages.length === 0 && (
            <div className="flex h-full min-h-[40vh] items-center justify-center">
              <p className="text-[10px] tracking-[0.3em] uppercase text-text-ghost">
                Ready
              </p>
            </div>
          )}
          <div className="space-y-6 stagger">
            {messages.map((msg, i) => (
              <div key={i} className="animate-in">
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] text-sm leading-relaxed text-text-primary">
                      {msg.content}
                    </div>
                  </div>
                ) : msg.role === "error" ? (
                  <div className="border-l-2 border-danger pl-3 text-xs leading-relaxed text-danger/70">
                    {msg.content}
                  </div>
                ) : (
                  <div className="border-l border-line pl-4 text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
                    {msg.content}
                    {streaming && i === messages.length - 1 && (
                      <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-alive" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-line" style={{ paddingBottom: "var(--safe-bottom)" }}>
        <div className="mx-auto flex max-w-lg items-end gap-3 px-5 py-4 md:px-8">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="message"
            rows={1}
            className="flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-text-ghost"
            style={{ height: "auto" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="press mb-0.5 text-[10px] tracking-wider uppercase text-text-ghost transition-colors hover:text-text-primary disabled:opacity-20"
          >
            {streaming ? (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
