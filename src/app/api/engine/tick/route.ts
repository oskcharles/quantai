import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runCopyEngineTick } from "@/lib/copy-engine";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runCopyEngineTick(session.user.id);
  return NextResponse.json({ results });
}
