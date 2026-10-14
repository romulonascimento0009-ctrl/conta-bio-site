import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { slugSchema } from "@/clients/slug";
import { db } from "@/db";
import { SEGMENT_IDS } from "@/clients/segments";
import { CLIENT_STATUSES } from "@/clients/status";
import { canAccessClient } from "@/clients/access";
import { clients, memberships, user } from "@/db/schema";
import { getAccess, requireOperator } from "@/lib/session";
import { storage } from "@/lib/storage";
import { recordAudit } from "./audit";

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
  await requireOperator();
  return db.select().from(clients).orderBy(desc(clients.updatedAt));
}

/**
 * Cliente pelo id, se o usuário atual tiver acesso a ele (operador: todos; cliente: só o próprio).
 * Porta de entrada de todas as funções por cliente desta camada.
 */
export async function getClient(id: string): Promise<Client | null> {
  if (!isUuid(id) || !canAccessClient(await getAccess(), id)) return null;
  const [row] = await db.select().from(clients).where(eq(clients.id, id));
  return row ?? null;
}

export async function createClient(input: ClientInput): Promise<Client> {
  await requireOperator();
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
  await requireOperator();
  if (!isUuid(id)) return null;
  const data = clientInputSchema.parse(input);
  try {
    const [row] = await db.update(clients).set(data).where(eq(clients.id, id)).returning();
    if (row) await recordAudit(row.id, "client.update");
    return row ?? null;
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTaken();
    throw err;
  }
}

/** Exclui o cliente, seus dados (cascata no banco), as contas de acesso dele e seus arquivos. */
export async function deleteClient(id: string): Promise<boolean> {
  await requireOperator();
  if (!isUuid(id)) return false;
  // Contas do cliente: sem o cliente, ficariam sem acesso a nada.
  const members = db
    .select({ id: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.clientId, id), eq(memberships.role, "client")));
  await db.delete(user).where(inArray(user.id, members));
  const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  if (deleted.length === 0) return false;
  await storage().deletePrefix(`clients/${id}`);
  return true;
}
