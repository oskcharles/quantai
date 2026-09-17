import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";

function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** (Re)generates the webhook secret for a MASTER connection, invalidating any previous one. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = await getDb();
  const { id } = await params;
  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (connection.role !== "MASTER") {
    return NextResponse.json(
      { error: "Webhooks can only be set up on master accounts" },
      { status: 400 },
    );
  }

  const updated = await prisma.connection.update({
    where: { id },
    data: { webhookSecret: generateSecret() },
  });

  return NextResponse.json({ webhookSecret: updated.webhookSecret });
}

/** Removes the webhook secret, disabling the webhook for this connection. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = await getDb();
  const { id } = await params;
  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.connection.update({ where: { id }, data: { webhookSecret: null } });
  return NextResponse.json({ ok: true });
}
