"use client";

import { useEffect, useState } from "react";

interface Repo {
  name: string;
  full_name: string;
}

export default function RepoPanel({ autoOpen }: { autoOpen?: boolean } = {}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(autoOpen ?? false);

  const fetchRepos = async () => {
    setLoading(true);
    const res = await fetch("/api/repos");
    if (res.ok) setRepos(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (open && repos.length === 0) fetchRepos();
  }, [open]);

  const connect = async (repo: string) => {
    setConnecting(repo);
    setErrors((prev) => ({ ...prev, [repo]: "" }));

    const res = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo }),
    });
    const result = await res.json();

    if (result.workflow && result.webhook) {
      setConnected((prev) => new Set(prev).add(repo));
    } else if (result.errors?.length) {
      setErrors((prev) => ({ ...prev, [repo]: result.errors.join(", ") }));
    }
    setConnecting(null);
  };

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {!autoOpen && (
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-medium tracking-[0.25em] uppercase text-text-ghost">
            Repos
          </h2>
          <button
            onClick={() => setOpen(!open)}
            className="press text-[10px] tracking-wider uppercase text-text-secondary transition-colors hover:text-text-primary"
          >
            {open ? "Close" : "Connect"}
          </button>
        </div>
      )}

      {open && (
        <div className="mt-5 animate-in">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search"
            autoFocus
            className="w-full border-b border-line bg-transparent py-2 text-sm outline-none focus:border-text-secondary placeholder:text-text-ghost"
          />

          <div className="mt-3 max-h-52 overflow-y-auto stagger">
            {loading && (
              <div className="py-6 text-center">
                <div className="inline-block h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="py-6 text-center text-[10px] tracking-wider text-text-ghost">No repos found</p>
            )}
            {filtered.map((repo) => (
              <div
                key={repo.full_name}
                className="-mx-3 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-raised"
              >
                <span className="text-xs text-text-secondary truncate">{repo.full_name}</span>
                {connected.has(repo.full_name) ? (
                  <span className="text-[10px] tracking-wider text-alive">Connected</span>
                ) : errors[repo.full_name] ? (
                  <span className="max-w-[140px] text-[10px] tracking-wider text-danger truncate">
                    {errors[repo.full_name]}
                  </span>
                ) : (
                  <button
                    onClick={() => connect(repo.full_name)}
                    disabled={connecting === repo.full_name}
                    className="press text-[10px] tracking-wider uppercase text-text-ghost transition-colors hover:text-text-primary disabled:opacity-20"
                  >
                    {connecting === repo.full_name ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
                    ) : (
                      "Link"
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] tracking-wider text-text-ghost">
            Installs workflow + webhook automatically.
          </p>
        </div>
      )}
    </div>
  );
}
