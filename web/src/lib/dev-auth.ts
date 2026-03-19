import { auth } from "@/lib/auth";

// Returns session user or dev bypass user
export async function getUser() {
  if (process.env.DEV_BYPASS === "true") {
    return { id: "dev", username: "dev", name: "Dev User", email: "dev@agentbox.local" };
  }
  const session = await auth();
  if (!session?.user) return null;
  return { ...session.user, username: (session.user as any).username || "user" };
}
