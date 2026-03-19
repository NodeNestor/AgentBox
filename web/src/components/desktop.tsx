"use client";

export default function Desktop({ novncPort }: { novncPort: number }) {
  const url = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:${novncPort}/vnc.html?autoconnect=true&resize=scale&reconnect=true&reconnect_delay=1000&show_dot=true`;

  return (
    <div className="h-full w-full bg-void">
      <iframe
        src={url}
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
