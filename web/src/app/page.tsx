import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Subtle radial glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_#4ade8006_0%,_transparent_70%)]" />

      <div className="relative w-full max-w-xs space-y-12 animate-up">
        {/* Logo */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-alive pulse-alive" />
            <h1 className="text-sm font-medium tracking-widest uppercase text-text-secondary">
              AgentBox
            </h1>
          </div>
        </div>

        {/* Login */}
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="press group relative w-full overflow-hidden rounded-lg border border-line bg-raised py-3.5 text-xs font-medium tracking-wide uppercase text-text-primary transition-colors hover:border-line-hover hover:bg-[#181818]"
          >
            <span className="relative z-10">Continue with GitHub</span>
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[10px] tracking-wider uppercase text-text-ghost">
          Agents in containers
        </p>
      </div>
    </div>
  );
}
