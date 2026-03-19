// Simple in-memory cron scheduler
// Stores jobs in memory — survives as long as the web container runs

interface CronJob {
  id: string;
  name: string;
  schedule: string; // cron expression: "*/30 * * * *"
  agentId: string;
  prompt: string;
  enabled: boolean;
  lastRun: string | null;
  createdBy: string;
}

const jobs: Map<string, CronJob> = new Map();
const timers: Map<string, NodeJS.Timeout> = new Map();

function parseCronInterval(schedule: string): number | null {
  // Simple parser for common patterns
  // "*/N * * * *" = every N minutes
  // "0 */N * * *" = every N hours
  const parts = schedule.split(" ");
  if (parts.length !== 5) return null;

  const [min, hour] = parts;

  if (min.startsWith("*/")) {
    return parseInt(min.slice(2)) * 60 * 1000;
  }
  if (min === "0" && hour.startsWith("*/")) {
    return parseInt(hour.slice(2)) * 60 * 60 * 1000;
  }
  // Default: every hour
  return 60 * 60 * 1000;
}

export function listCronJobs(): CronJob[] {
  return Array.from(jobs.values());
}

export function getCronJob(id: string): CronJob | undefined {
  return jobs.get(id);
}

export function createCronJob(job: Omit<CronJob, "id" | "lastRun">): CronJob {
  const id = Math.random().toString(36).slice(2, 10);
  const cronJob: CronJob = { ...job, id, lastRun: null };
  jobs.set(id, cronJob);

  if (cronJob.enabled) startJob(cronJob);
  return cronJob;
}

export function deleteCronJob(id: string): boolean {
  stopJob(id);
  return jobs.delete(id);
}

export function toggleCronJob(id: string): CronJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.enabled = !job.enabled;
  if (job.enabled) startJob(job);
  else stopJob(id);
  return job;
}

function startJob(job: CronJob) {
  stopJob(job.id);
  const interval = parseCronInterval(job.schedule);
  if (!interval) return;

  const timer = setInterval(async () => {
    try {
      const agent = await import("./docker").then((m) => m.getAgent(job.agentId));
      if (!agent || agent.status !== "running" || !agent.ports.api) return;

      await fetch(`http://localhost:${agent.ports.api}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: job.prompt }),
      });
      job.lastRun = new Date().toISOString();
    } catch (err) {
      console.error(`Cron ${job.id} failed:`, err);
    }
  }, interval);

  timers.set(job.id, timer);
}

function stopJob(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
}
