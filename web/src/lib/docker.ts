import Docker from "dockerode";

const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const IMAGE_NAME = "agentbox-agent";
const LABEL_PREFIX = "agentbox";

export interface AgentInfo {
  id: string;
  name: string;
  status: string;
  created: string;
  ports: {
    vnc: number | null;
    api: number | null;
    novnc: number | null;
  };
}

function getContainerPorts(container: any): AgentInfo["ports"] {
  const ports = container.Ports || [];
  const findPort = (priv: number) =>
    ports.find((p: any) => p.PrivatePort === priv)?.PublicPort || null;
  return {
    vnc: findPort(5900),
    api: findPort(8080),
    novnc: findPort(6080),
  };
}

export async function listAgents(username: string): Promise<AgentInfo[]> {
  const filters: any = {
    label: username
      ? [`${LABEL_PREFIX}.owner=${username}`]
      : [`${LABEL_PREFIX}.owner`], // match any agentbox container
  };
  const containers = await docker.listContainers({ all: true, filters });

  return containers.map((c) => ({
    id: c.Id.slice(0, 12),
    name: c.Labels[`${LABEL_PREFIX}.name`] || c.Names[0]?.replace("/", ""),
    status: c.State,
    created: new Date(c.Created * 1000).toISOString(),
    ports: getContainerPorts(c),
  }));
}

export async function createAgent(
  username: string,
  agentName: string
): Promise<AgentInfo> {
  const containerName = `agentbox-${username}-${agentName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const container = await docker.createContainer({
    Image: IMAGE_NAME,
    name: containerName,
    Labels: {
      [`${LABEL_PREFIX}.owner`]: username,
      [`${LABEL_PREFIX}.name`]: agentName,
    },
    Env: [
      // No API key needed — subscription auth via shared volume
      "CLAUDE_CODE_USE_BEDROCK=0",
    ],
    HostConfig: {
      PublishAllPorts: true,
      RestartPolicy: { Name: "unless-stopped" },
      Binds: [
        // Auth credentials (read-only, entrypoint copies to writable dir)
        `${process.env.CLAUDE_AUTH_VOLUME || "claude-auth"}:/root/.claude-auth:ro`,
        // Persistent agent memory
        `agentbox-memory-${containerName}:/agent-memory`,
      ],
    },
    ExposedPorts: {
      "5900/tcp": {},
      "6080/tcp": {},
      "8080/tcp": {},
    },
  });

  await container.start();

  // Get container info with ports
  const info = await container.inspect();
  const ports = info.NetworkSettings.Ports;
  const getPort = (key: string) => {
    const binding = ports[key];
    return binding?.[0]?.HostPort ? parseInt(binding[0].HostPort) : null;
  };

  return {
    id: container.id.slice(0, 12),
    name: agentName,
    status: "running",
    created: new Date().toISOString(),
    ports: {
      vnc: getPort("5900/tcp"),
      api: getPort("8080/tcp"),
      novnc: getPort("6080/tcp"),
    },
  };
}

export async function startAgent(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
}

export async function stopAgent(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop();
}

export async function removeAgent(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.remove({ force: true });
}

export async function getAgent(containerId: string): Promise<AgentInfo | null> {
  try {
    const info = await docker.getContainer(containerId).inspect();
    const ports = info.NetworkSettings.Ports;
    const getPort = (key: string) => {
      const binding = ports[key];
      return binding?.[0]?.HostPort ? parseInt(binding[0].HostPort) : null;
    };

    return {
      id: info.Id.slice(0, 12),
      name: info.Config.Labels[`${LABEL_PREFIX}.name`] || info.Name.replace("/", ""),
      status: info.State.Status,
      created: info.Created,
      ports: {
        vnc: getPort("5900/tcp"),
        api: getPort("8080/tcp"),
        novnc: getPort("6080/tcp"),
      },
    };
  } catch {
    return null;
  }
}
