"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Chat from "@/components/chat";
import Terminal from "@/components/terminal";
import Desktop from "@/components/desktop";

type Tab = "chat" | "terminal" | "desktop";

interface Agent {
  id: string;
  name: string;
  status: string;
  ports: { vnc: number | null; api: number | null; novnc: number | null };
}

export default function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [desktopRight, setDesktopRight] = useState<"terminal" | "desktop">("terminal");
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then(setAgent)
      .catch(() => router.push("/dashboard"));
  }, [id, router]);

  if (!agent) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "terminal", label: "Term" },
    { key: "desktop", label: "Screen" },
  ];

  // ─── MOBILE: Full screen + bottom tab bar ───
  const mobileLayout = (
    <div className="flex h-dvh flex-col md:hidden">
      {/* Minimal top bar */}
      <div className="flex items-center gap-3 px-4 py-3 animate-in">
        <button onClick={() => router.push("/dashboard")} className="press text-text-ghost">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className={`h-1.5 w-1.5 rounded-full ${agent.status === "running" ? "bg-alive pulse-alive" : "bg-dead"}`} />
        <span className="text-sm text-text-primary">{agent.name}</span>
      </div>

      {/* Full-screen content */}
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && agent.ports.api && <Chat apiPort={agent.ports.api} />}
        {tab === "terminal" && agent.ports.api && <Terminal apiPort={agent.ports.api} />}
        {tab === "desktop" && agent.ports.novnc && <Desktop novncPort={agent.ports.novnc} />}
      </div>

      {/* Bottom tab bar */}
      <div
        className="flex border-t border-line bg-void/90 backdrop-blur-xl"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`press relative flex-1 py-4 text-center text-[10px] font-medium tracking-[0.2em] uppercase transition-colors ${
              tab === t.key ? "text-alive" : "text-text-ghost"
            }`}
          >
            {t.label}
            {tab === t.key && (
              <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-alive rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── DESKTOP: Split pane — chat left, terminal/desktop right ───
  const desktopLayout = (
    <div className="hidden md:flex h-dvh flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-line px-6 py-3 animate-in">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="press text-text-ghost hover:text-text-secondary">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={`h-1.5 w-1.5 rounded-full ${agent.status === "running" ? "bg-alive pulse-alive" : "bg-dead"}`} />
          <span className="text-sm text-text-primary">{agent.name}</span>
          <span className="text-[10px] tracking-wider text-text-ghost">{agent.id}</span>
        </div>

        {/* Right pane toggle */}
        <div className="flex items-center gap-1 rounded-lg bg-raised p-0.5">
          <button
            onClick={() => setDesktopRight("terminal")}
            className={`press rounded-md px-3 py-1.5 text-[10px] tracking-wider uppercase transition-colors ${
              desktopRight === "terminal" ? "bg-line text-text-primary" : "text-text-ghost hover:text-text-secondary"
            }`}
          >
            Term
          </button>
          <button
            onClick={() => setDesktopRight("desktop")}
            className={`press rounded-md px-3 py-1.5 text-[10px] tracking-wider uppercase transition-colors ${
              desktopRight === "desktop" ? "bg-line text-text-primary" : "text-text-ghost hover:text-text-secondary"
            }`}
          >
            Screen
          </button>
        </div>
      </div>

      {/* Split panes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat */}
        <div className="flex-1 border-r border-line animate-in">
          {agent.ports.api && <Chat apiPort={agent.ports.api} />}
        </div>

        {/* Right: Terminal or Desktop */}
        <div className="flex-1 animate-slide-right">
          {desktopRight === "terminal" && agent.ports.api && <Terminal apiPort={agent.ports.api} />}
          {desktopRight === "desktop" && agent.ports.novnc && <Desktop novncPort={agent.ports.novnc} />}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
