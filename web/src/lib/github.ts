const GITHUB_TOKEN = () => process.env.GITHUB_TOKEN!;
const API = "https://api.github.com";

function headers() {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// The workflow file content that gets pushed to repos
function workflowContent(webhookUrl: string): string {
  return `name: AgentBox Trigger

on:
  issues:
    types: [opened, labeled]
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main, master]
  issue_comment:
    types: [created]
  workflow_dispatch:
    inputs:
      prompt:
        description: "What should the agent do?"
        required: true
        type: string

jobs:
  trigger-agent:
    runs-on: ubuntu-latest
    if: >
      github.event_name != 'issue_comment' ||
      contains(github.event.comment.body, '@agentbox')
    steps:
      - name: Trigger AgentBox
        run: |
          curl -s -X POST "${webhookUrl}/api/webhook" \\
            -H "Content-Type: application/json" \\
            -H "X-GitHub-Event: \${{ github.event_name }}" \\
            -d '\${{ toJson(github.event) }}'
`;
}

// Push the workflow file to a repo
export async function installWorkflow(repo: string, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  const path = ".github/workflows/agentbox.yml";
  const content = Buffer.from(workflowContent(webhookUrl)).toString("base64");

  // Check if file already exists
  const existing = await fetch(`${API}/repos/${repo}/contents/${path}`, { headers: headers() });
  let sha: string | undefined;
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const res = await fetch(`${API}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Add AgentBox workflow",
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { ok: false, error: err.message };
  }
  return { ok: true };
}

// Create a webhook on the repo pointing to AgentBox
export async function installWebhook(repo: string, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  // Check if webhook already exists
  const existing = await fetch(`${API}/repos/${repo}/hooks`, { headers: headers() });
  if (existing.ok) {
    const hooks = await existing.json();
    const already = hooks.find((h: any) => h.config?.url?.includes(webhookUrl));
    if (already) return { ok: true }; // already installed
  }

  const res = await fetch(`${API}/repos/${repo}/hooks`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "web",
      active: true,
      events: ["issues", "pull_request", "push", "issue_comment"],
      config: {
        url: `${webhookUrl}/api/webhook`,
        content_type: "json",
        insecure_ssl: "0",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { ok: false, error: err.message };
  }
  return { ok: true };
}

// Connect a repo: install both workflow + webhook
export async function connectRepo(repo: string, webhookUrl: string): Promise<{ workflow: boolean; webhook: boolean; errors: string[] }> {
  const errors: string[] = [];

  const wf = await installWorkflow(repo, webhookUrl);
  if (!wf.ok) errors.push(`Workflow: ${wf.error}`);

  const wh = await installWebhook(repo, webhookUrl);
  if (!wh.ok) errors.push(`Webhook: ${wh.error}`);

  return { workflow: wf.ok, webhook: wh.ok, errors };
}

// List user's repos (for the connect UI)
export async function listRepos(): Promise<{ name: string; full_name: string }[]> {
  const res = await fetch(`${API}/user/repos?per_page=100&sort=updated&type=all`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  const repos = await res.json();
  return repos.map((r: any) => ({ name: r.name, full_name: r.full_name }));
}

// List repos for a specific org
export async function listOrgRepos(org: string): Promise<{ name: string; full_name: string }[]> {
  const res = await fetch(`${API}/orgs/${org}/repos?per_page=100&sort=updated`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  const repos = await res.json();
  return repos.map((r: any) => ({ name: r.name, full_name: r.full_name }));
}
