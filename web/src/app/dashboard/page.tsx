"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CronPanel from "@/components/cron-panel";
import RepoPanel from "@/components/repo-panel";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";

const AuthTerminal = dynamic(() => import("@/components/auth-terminal"), { ssr: false });

interface Agent {
  id: string;
  name: string;
  status: string;
  created: string;
  ports: { vnc: number | null; api: number | null; novnc: number | null };
}

type MobileTab = "agents" | "repos" | "cron" | "auth";

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("agents");
  const [authStatus, setAuthStatus] = useState<{ logged_in: boolean; token_shared: boolean } | null>(null);
  const [showAuthTerm, setShowAuthTerm] = useState(false);
  const router = useRouter();

  const fetchAgents = async () => {
    const res = await fetch("/api/agents");
    if (res.ok) setAgents(await res.json());
  };

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth-status");
      if (res.ok) setAuthStatus(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchAgents();
    fetchAuthStatus();
    const i = setInterval(fetchAgents, 5000);
    const j = setInterval(fetchAuthStatus, 15000);
    return () => { clearInterval(i); clearInterval(j); };
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setShowCreate(false);
    setCreating(false);
    fetchAgents();
  };

  const toggle = async (id: string, status: string) => {
    await fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: status === "running" ? "stop" : "start" }),
    });
    fetchAgents();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this agent?")) return;
    await fetch(`/api/agents/${id}`, { method: "DELETE" });
    fetchAgents();
  };

  // ─── Auth status banner ───
  const authBanner = authStatus && !authStatus.logged_in ? (
    <div className="flex items-center gap-2 rounded-lg bg-warm-dim px-3 py-2.5 text-[10px] tracking-wider text-warm animate-in">
      <div className="h-1.5 w-1.5 rounded-full bg-warm" />
      <span>Not logged in — run: <code className="font-medium">docker exec -it agentbox-auth claude login</code></span>
    </div>
  ) : null;

  // ─── Shared agent list ───
  const agentList = (compact?: boolean) => (
    <div className={compact ? "stagger" : "mt-5 stagger"}>
      {agents.length === 0 && !showCreate && (
        <div className={compact ? "py-8 text-center" : "py-16 text-center"}>
          <p className="text-xs text-text-ghost">No agents running</p>
        </div>
      )}
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`group flex items-center justify-between rounded-lg px-3 py-3.5 transition-colors hover:bg-raised ${
            compact ? "" : "-mx-3"
          }`}
        >
          <button
            onClick={() => agent.status === "running" && router.push(`/agent/${agent.id}`)}
            className="flex items-center gap-3 text-left press min-w-0 flex-1"
          >
            <div
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                agent.status === "running" ? "bg-alive pulse-alive" : "bg-dead"
              }`}
            />
            <div className="min-w-0">
              <div className="text-sm text-text-primary truncate">{agent.name}</div>
              <div className="mt-0.5 text-[10px] tracking-wider text-text-ghost">{agent.id}</div>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              onClick={() => toggle(agent.id, agent.status)}
              className="press rounded px-2 py-1 text-[10px] tracking-wider uppercase text-text-secondary hover:text-text-primary"
            >
              {agent.status === "running" ? "Stop" : "Start"}
            </button>
            <button
              onClick={() => remove(agent.id)}
              className="press rounded px-2 py-1 text-[10px] tracking-wider uppercase text-danger"
            >
              Del
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── MOBILE LAYOUT ───
  const mobileLayout = (
    <div className="flex h-dvh flex-col md:hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
          <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-secondary">
            AgentBox
          </span>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="press text-[10px] tracking-wider uppercase text-text-ghost">
          Exit
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {authBanner && <div className="mt-3">{authBanner}</div>}

        {mobileTab === "agents" && (
          <div className="animate-in">
            <div className="flex items-center justify-between mt-4">
              <h1 className="text-base font-medium">Agents</h1>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="press text-[10px] tracking-wider uppercase text-alive"
              >
                {showCreate ? "Cancel" : "+ New"}
              </button>
            </div>

            {showCreate && (
              <div className="mt-4 flex gap-3 animate-slide-up">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                  placeholder="name"
                  autoFocus
                  className="flex-1 rounded-lg bg-raised px-4 py-3 text-sm outline-none placeholder:text-text-ghost"
                />
                <button
                  onClick={create}
                  disabled={creating || !newName.trim()}
                  className="press rounded-lg bg-alive/10 px-5 py-3 text-[10px] tracking-wider uppercase text-alive disabled:opacity-20"
                >
                  {creating ? "..." : "Go"}
                </button>
              </div>
            )}

            {agentList()}

            <p className="mt-8 text-[10px] tracking-wider text-text-ghost leading-relaxed">
              Mention <span className="text-text-secondary">@agentbox</span> in any GitHub comment to trigger an agent.
            </p>
          </div>
        )}

        {mobileTab === "repos" && (
          <div className="mt-4 animate-in">
            <h1 className="text-base font-medium mb-4">Repos</h1>
            <RepoPanel autoOpen />
          </div>
        )}

        {mobileTab === "cron" && (
          <div className="mt-4 animate-in">
            <h1 className="text-base font-medium mb-4">Cron</h1>
            <CronPanel agents={agents} autoOpen />
          </div>
        )}

        {mobileTab === "auth" && (
          <div className="mt-4 animate-in" style={{ height: "calc(100dvh - 160px)" }}>
            <h1 className="text-base font-medium mb-4">Auth</h1>
            <div className="h-full rounded-lg overflow-hidden border border-line">
              <AuthTerminal />
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav — native app feel */}
      <div
        className="fixed bottom-0 left-0 right-0 flex border-t border-line bg-void/90 backdrop-blur-xl"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {([
          { key: "agents" as MobileTab, label: "Agents", count: agents.filter(a => a.status === "running").length },
          { key: "repos" as MobileTab, label: "Repos" },
          { key: "cron" as MobileTab, label: "Cron" },
          { key: "auth" as MobileTab, label: "Auth" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMobileTab(tab.key)}
            className={`press flex-1 py-4 text-center text-[10px] font-medium tracking-[0.2em] uppercase transition-colors ${
              mobileTab === tab.key ? "text-alive" : "text-text-ghost"
            }`}
          >
            {tab.label}
            {tab.count ? (
              <span className="ml-1.5 text-[9px] text-alive/60">{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── DESKTOP LAYOUT ───
  const desktopLayout = (
    <div className="hidden md:flex h-dvh">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-line bg-panel animate-in">
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
            <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-secondary">
              AgentBox
            </span>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="press text-[10px] tracking-wider uppercase text-text-ghost hover:text-text-secondary">
            Exit
          </button>
        </div>

        <div className="h-px bg-line" />

        {/* Auth status */}
        {authBanner && <div className="px-4 pt-3">{authBanner}</div>}

        {/* New agent */}
        <div className="px-4 pt-4">
          {showCreate ? (
            <div className="flex gap-2 animate-in">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create();
                  if (e.key === "Escape") setShowCreate(false);
                }}
                placeholder="name"
                autoFocus
                className="flex-1 border-b border-line bg-transparent py-1.5 text-xs outline-none focus:border-text-secondary placeholder:text-text-ghost"
              />
              <button onClick={create} disabled={creating || !newName.trim()} className="press text-[10px] text-alive disabled:opacity-20">
                {creating ? "..." : "Go"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="press w-full rounded-lg border border-dashed border-line py-2 text-[10px] tracking-wider uppercase text-text-ghost transition-colors hover:border-line-hover hover:text-text-secondary"
            >
              + New Agent
            </button>
          )}
        </div>

        {/* Agent list in sidebar */}
        <div className="flex-1 overflow-y-auto px-2 pt-2">
          {agentList(true)}
        </div>

        {/* Auth terminal (collapsible) */}
        {showAuthTerm && (
          <div className="h-64 border-t border-line animate-slide-up">
            <AuthTerminal />
          </div>
        )}

        {/* Sidebar footer */}
        <div className="border-t border-line px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] tracking-wider text-text-ghost">
            <div className="h-1 w-1 rounded-full bg-alive" />
            {agents.filter(a => a.status === "running").length} running
          </div>
          <button
            onClick={() => setShowAuthTerm(!showAuthTerm)}
            className={`press text-[10px] tracking-wider uppercase transition-colors ${
              showAuthTerm ? "text-warm" : "text-text-ghost hover:text-text-secondary"
            }`}
          >
            Auth
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8 animate-slide-right">
          {/* Repos section */}
          <section>
            <RepoPanel />
          </section>

          <div className="my-8 h-px bg-line" />

          {/* Cron section */}
          <section>
            <CronPanel agents={agents} />
          </section>

          {/* Footer hint */}
          <div className="mt-12">
            <p className="text-[10px] leading-relaxed tracking-wider text-text-ghost">
              Mention <span className="text-text-secondary">@agentbox</span> in any GitHub comment to trigger.
            </p>
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
