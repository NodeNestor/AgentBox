import { getUser } from "@/lib/dev-auth";
import { listAgents, createAgent } from "@/lib/docker";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agents = await listAgents("");
  return NextResponse.json(agents);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const agent = await createAgent((user as any).username || "dev", name);
  return NextResponse.json(agent);
}
