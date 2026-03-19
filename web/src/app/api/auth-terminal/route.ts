import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// GET /api/auth-terminal — get auth container info for terminal access
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const container = docker.getContainer("agentbox-auth");
    const info = await container.inspect();

    return NextResponse.json({
      id: info.Id.slice(0, 12),
      status: info.State.Status,
      name: "agentbox-auth",
    });
  } catch {
    return NextResponse.json({ error: "Auth container not found" }, { status: 404 });
  }
}
