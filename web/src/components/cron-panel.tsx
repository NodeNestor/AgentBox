"use client";

import { useEffect, useState } from "react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agentId: string;
  prompt: string;
  enabled: boolean;
  lastRun: string | null;
  createdBy: string;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

export default function CronPanel({ agents, autoOpen }: { agents: Agent[]; autoOpen?: boolean }) {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [showForm, setShowForm] = useState(autoOpen ?? false);
  const [form, setForm] = useState({ name: "", schedule: "*/30 * * * *", agentId: "", prompt: "" });

  const fetchJobs = async () => {
    const res = await fetch("/api/cron");
    if (res.ok) setJobs(await res.json());
  };

  useEffect(() => { fetchJobs(); }, []);

  const create = async () => {
    if (!form.name || !form.agentId || !form.prompt) return;
    await fetch("/api/cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", schedule: "*/30 * * * *", agentId: "", prompt: "" });
    setShowForm(false);
    fetchJobs();
  };

  const toggle = async (id: string) => {
    await fetch("/api/cron", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchJobs();
  };

  const remove = async (id: string) => {
    await fetch("/api/cron", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchJobs();
  };

  const presets = [
    { label: "5m", value: "*/5 * * * *" },
    { label: "15m", value: "*/15 * * * *" },
    { label: "30m", value: "*/30 * * * *" },
    { label: "1h", value: "0 * * * *" },
    { label: "6h", value: "0 */6 * * *" },
    { label: "24h", value: "0 0 * * *" },
  ];

  return (
    <div>
      {!autoOpen && (
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-ghost">
            Cron
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="press text-[10px] tracking-wider uppercase text-text-secondary transition-colors hover:text-text-primary"
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      )}

      {showForm && (
        <div className="mt-5 space-y-4 animate-in">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="name"
            className="w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-text-secondary placeholder:text-text-ghost"
          />

          <select
            value={form.agentId}
            onChange={(e) => setForm({ ...form, agentId: e.target.value })}
            className="w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-text-secondary text-text-ghost [&:has(option:checked:not([value='']):not(:first-child))]:text-text-primary"
          >
            <option value="">select agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id} className="bg-void">{a.name}</option>
            ))}
          </select>

          <div className="flex gap-1.5">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setForm({ ...form, schedule: p.value })}
                className={`press rounded px-2.5 py-1.5 text-[10px] tracking-wider transition-colors ${
                  form.schedule === p.value
                    ? "bg-alive/10 text-alive"
                    : "text-text-ghost hover:text-text-secondary"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
            placeholder="what should it do?"
            rows={2}
            className="w-full resize-none border-b border-line bg-transparent py-2 text-sm outline-none focus:border-text-secondary placeholder:text-text-ghost"
          />

          <button
            onClick={create}
            disabled={!form.name || !form.agentId || !form.prompt}
            className="press w-full rounded-lg border border-line py-2.5 text-[10px] font-medium tracking-wider uppercase text-text-secondary transition-colors hover:border-line-hover hover:text-text-primary disabled:opacity-20"
          >
            Create
          </button>
        </div>
      )}

      <div className="mt-4 stagger">
        {jobs.length === 0 && !showForm && (
          <p className="py-8 text-center text-[10px] tracking-wider text-text-ghost">No cron jobs</p>
        )}
        {jobs.map((job) => (
          <div
            key={job.id}
            className="group -mx-3 flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-raised"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 rounded-full ${job.enabled ? "bg-warm" : "bg-dead"}`} />
                <span className="text-sm text-text-primary truncate">{job.name}</span>
                <span className="text-[10px] tracking-wider text-text-ghost">{job.schedule}</span>
              </div>
              <div className="mt-1 pl-3.5 text-[10px] text-text-ghost truncate">
                {job.prompt.slice(0, 50)}{job.prompt.length > 50 ? "..." : ""}
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100 touch-show">
              <button onClick={() => toggle(job.id)} className="press text-[10px] tracking-wider uppercase text-text-secondary">
                {job.enabled ? "Pause" : "Run"}
              </button>
              <button onClick={() => remove(job.id)} className="press text-[10px] tracking-wider uppercase text-danger">
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
