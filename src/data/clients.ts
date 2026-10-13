import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { slugSchema } from "@/clients/slug";
import { db } from "@/db";
import { SEGMENT_IDS } from "@/clients/segments";
import { CLIENT_STATUSES } from "@/clients/status";
import { clients } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { storage } from "@/lib/storage";

export type Client = typeof clients.$inferSelect;

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "informe o nome").max(80),
  slug: slugSchema,
  segment: z.enum(SEGMENT_IDS, "escolha o segmento").default("other"),
  status: z.enum(CLIENT_STATUSES).default("briefing"),
  notes: z.string().trim().max(2000).default(""),
});
export type ClientInput = z.input<typeof clientInputSchema>;

export class SlugTaken extends Error {
  constructor() {
    super("Este endereço já está em uso por outro cliente.");
  }
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function listClients(): Promise<Client[]> {
  await requireSession();
  return db.select().from(clients).orderBy(desc(clients.updatedAt));
}

export async function getClient(id: string): Promise<Client | null> {
  await requireSession();
  if (!isUuid(id)) return null;
  const [row] = await db.select().from(clients).where(eq(clients.id, id));
  return row ?? null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  await requireSession();
  const data = clientInputSchema.parse(input);
  try {
    const [row] = await db.insert(clients).values(data).returning();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTaken();
    throw err;
  }
}

export async function updateClient(id: string, input: ClientInput): Promise<Client | null> {
  await requireSession();
  if (!isUuid(id)) return null;
  const data = clientInputSchema.parse(input);
  try {
    const [row] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    return row ?? null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTaken();
    throw err;
  }
}

/** Exclui o cliente, seus dados (cascata no banco) e seus arquivos. */
export async function deleteClient(id: string): Promise<boolean> {
  await requireSession();
  if (!isUuid(id)) return false;
  const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  if (deleted.length === 0) return false;
  await storage().deletePrefix(`clients/${id}`);
  return true;
}
