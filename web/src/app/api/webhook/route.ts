import { NextRequest, NextResponse } from "next/server";
import { listAgents } from "@/lib/docker";

// GitHub webhook receiver
// Set this URL as a webhook in your GitHub repo settings
// or call it from GitHub Actions
export async function POST(req: NextRequest) {
  const event = req.headers.get("x-github-event") || "unknown";
  const payload = await req.json();

  const repo = payload.repository?.full_name || "unknown";
  const action = payload.action || "";

  // Find running agents
  const agents = await listAgents("");
  const running = agents.filter((a) => a.status === "running");

  if (running.length === 0) {
    return NextResponse.json({ error: "No running agents" }, { status: 503 });
  }

  const prompt = buildPrompt(event, action, payload);
  const results: any[] = [];

  // Trigger the first running agent
  const agent = running[0];
  if (!agent.ports.api) {
    return NextResponse.json({ error: "Agent API port unavailable" }, { status: 502 });
  }

  try {
    const res = await fetch(`http://localhost:${agent.ports.api}/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, repo, event }),
    });
    const result = await res.json();
    results.push({ agent: agent.name, result });
  } catch (err: any) {
    results.push({ agent: agent.name, error: err.message });
  }

  return NextResponse.json({ event, repo, agents_triggered: results });
}

function buildPrompt(event: string, action: string, payload: any): string {
  switch (event) {
    case "issues":
      if (action === "opened") {
        return [
          `New issue #${payload.issue.number} opened on ${payload.repository.full_name}:`,
          `Title: "${payload.issue.title}"`,
          `Body: ${payload.issue.body || "(empty)"}`,
          `Author: ${payload.issue.user.login}`,
          `Labels: ${payload.issue.labels?.map((l: any) => l.name).join(", ") || "none"}`,
          "",
          "Clone the repo, analyze the issue, and work on a fix.",
          "Create a new branch, implement the fix, and push it.",
          `Use: git clone https://github.com/${payload.repository.full_name}.git`,
        ].join("\n");
      }
      if (action === "labeled") {
        return `Issue #${payload.issue.number} on ${payload.repository.full_name} was labeled "${payload.label.name}". Check if this needs action.`;
      }
      return `Issue event (${action}) on #${payload.issue?.number} in ${payload.repository.full_name}.`;

    case "pull_request":
      if (action === "opened" || action === "synchronize") {
        return [
          `Review PR #${payload.pull_request.number} on ${payload.repository.full_name}:`,
          `Title: "${payload.pull_request.title}"`,
          `Branch: ${payload.pull_request.head.ref} → ${payload.pull_request.base.ref}`,
          `Author: ${payload.pull_request.user.login}`,
          `Body: ${payload.pull_request.body || "(empty)"}`,
          `Diff URL: ${payload.pull_request.diff_url}`,
          "",
          "Clone the repo, checkout the PR branch, review the code.",
          "Check for bugs, style issues, and suggest improvements.",
          `Use: git clone https://github.com/${payload.repository.full_name}.git && git checkout ${payload.pull_request.head.ref}`,
        ].join("\n");
      }
      return `PR event (${action}) on #${payload.pull_request?.number} in ${payload.repository.full_name}.`;

    case "push":
      const commits = payload.commits?.map((c: any) => `- ${c.message} (${c.author.username})`).join("\n") || "";
      return [
        `New push to ${payload.ref} on ${payload.repository.full_name}:`,
        commits,
        "",
        "Clone the repo, run tests, check for issues introduced by these commits.",
        `Use: git clone https://github.com/${payload.repository.full_name}.git`,
      ].join("\n");

    case "issue_comment":
      if (payload.comment.body.includes("@agentbox")) {
        return [
          `You were mentioned in a comment on ${payload.repository.full_name}:`,
          `Issue/PR #${payload.issue.number}: "${payload.issue.title}"`,
          `Comment by ${payload.comment.user.login}:`,
          payload.comment.body,
          "",
          "Respond to the request in the comment. Clone the repo if needed.",
          `Use: git clone https://github.com/${payload.repository.full_name}.git`,
        ].join("\n");
      }
      return `Comment on #${payload.issue?.number} in ${payload.repository.full_name} by ${payload.comment?.user?.login}.`;

    case "workflow_dispatch":
      return payload.inputs?.prompt || `Manual trigger on ${payload.repository?.full_name}. Check the repo and report status.`;

    default:
      return `GitHub ${event} event (${action}) on ${payload.repository?.full_name}. Analyze and handle appropriately.`;
  }
}
