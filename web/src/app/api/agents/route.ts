import { auth } from "@/lib/auth";
import { listAgents, createAgent } from "@/lib/docker";
import { NextRequest, NextResponse } from "next/server";

// GET /api/agents — list all agents (shared across org)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // List ALL agents — shared view, everyone in the org sees everything
  const agents = await listAgents("");
  return NextResponse.json(agents);
}

// POST /api/agents — create a new agent
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const username = (session.user as any).username || "user";
  const agent = await createAgent(username, name);
  return NextResponse.json(agent);
}
