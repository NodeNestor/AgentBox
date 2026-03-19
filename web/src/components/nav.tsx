"use client";

import { signOut } from "next-auth/react";

export default function Nav() {
  return (
    <nav className="flex items-center justify-between px-5 py-4 md:px-8">
      <a href="/dashboard" className="flex items-center gap-2 press">
        <div className="h-1.5 w-1.5 rounded-full bg-alive pulse-alive" />
        <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-secondary">
          AgentBox
        </span>
      </a>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="press text-[10px] tracking-wider uppercase text-text-ghost transition-colors hover:text-text-secondary"
      >
        Exit
      </button>
    </nav>
  );
}
