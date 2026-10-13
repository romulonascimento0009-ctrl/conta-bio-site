import { eq } from "drizzle-orm";
import { briefingSchema, type Briefing } from "@/clients/briefing";
import { db } from "@/db";
import { briefings } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { getClient } from "./clients";

export async function getBriefing(clientId: string): Promise<Briefing | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  const [row] = await db.select().from(briefings).where(eq(briefings.clientId, client.id));
  if (!row) return null;
  const parsed = briefingSchema.safeParse(row.data);
  return parsed.success ? parsed.data : null;
}

export async function saveBriefing(clientId: string, input: unknown): Promise<Briefing> {
  await requireSession();
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const data = briefingSchema.parse(input);
  await db
    .insert(briefings)
    .values({ clientId: client.id, data })
    .onConflictDoUpdate({ target: briefings.clientId, set: { data, updatedAt: new Date() } });
  return data;
}
