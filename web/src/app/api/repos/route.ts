import { auth } from "@/lib/auth";
import { listRepos, listOrgRepos, connectRepo } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

// GET /api/repos — list available repos
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = process.env.ALLOWED_ORG;
  const repos = org ? await listOrgRepos(org) : await listRepos();
  return NextResponse.json(repos);
}

// POST /api/repos — connect a repo (installs workflow + webhook)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repo, webhookUrl } = await req.json();
  if (!repo) return NextResponse.json({ error: "Repo required" }, { status: 400 });

  // Use provided URL or try to figure it out from the request
  const url = webhookUrl || `https://${req.headers.get("host")}`;
  const result = await connectRepo(repo, url);
  return NextResponse.json(result);
}
