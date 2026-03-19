import { NextResponse } from "next/server";

// Check if the auth container has valid credentials
export async function GET() {
  try {
    const res = await fetch("http://auth:9090", { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ status: "unreachable" }, { status: 502 });
  } catch {
    // Try localhost for local dev
    try {
      const res = await fetch("http://localhost:9090", { signal: AbortSignal.timeout(3000) });
      if (res.ok) return NextResponse.json(await res.json());
    } catch {}
    return NextResponse.json({ status: "unreachable", logged_in: false }, { status: 502 });
  }
}
