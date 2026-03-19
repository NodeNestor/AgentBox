import { auth } from "@/lib/auth";
import { listCronJobs, createCronJob, deleteCronJob, toggleCronJob } from "@/lib/cron";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(listCronJobs());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, schedule, agentId, prompt } = await req.json();
  if (!name || !schedule || !agentId || !prompt) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const job = createCronJob({
    name,
    schedule,
    agentId,
    prompt,
    enabled: true,
    createdBy: (session.user as any).username || "unknown",
  });
  return NextResponse.json(job);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  deleteCronJob(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const job = toggleCronJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
