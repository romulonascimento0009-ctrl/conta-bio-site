import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ROLES } from "../../clients/access";
import { CLIENT_STATUSES } from "../../clients/status";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Endereço público: <PUBLIC_URL>/<slug>. */
  slug: text("slug").notNull().unique(),
  segment: text("segment").notNull().default("beauty"),
  status: text("status", { enum: CLIENT_STATUSES }).notNull().default("briefing"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

/** Briefing do cliente (um por cliente). `data` validado por `briefingSchema`. */
export const briefings = pgTable("briefings", {
  clientId: uuid("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  ...timestamps,
});

/** Site do cliente (um por cliente no MVP). `draft` validado por `siteDocumentSchema`. */
export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .unique()
    .references(() => clients.id, { onDelete: "cascade" }),
  draft: jsonb("draft").notNull(),
  publishedVersionId: uuid("published_version_id").references((): AnyPgColumn => siteVersions.id, {
    onDelete: "set null",
  }),
  ...timestamps,
});

/** Snapshots imutáveis do documento (versões). */
export const siteVersions = pgTable(
  "site_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    document: jsonb("document").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("site_versions_site_id_idx").on(t.siteId)],
);

/** Imagens enviadas. Arquivos em `clients/<clientId>/assets/<id>/<largura>.webp`. */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** Larguras geradas, em ordem crescente. */
    variants: jsonb("variants").$type<number[]>().notNull(),
    bytes: integer("bytes").notNull(),
    alt: text("alt").notNull().default(""),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("assets_client_id_idx").on(t.clientId)],
);

/**
 * Papel de cada usuário. Sem linha aqui = sem acesso (padrão negar).
 * Operador: todos os clientes. Cliente: só o próprio (`client_id`).
 */
export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("memberships_client_id_idx").on(t.clientId),
    check(
      "memberships_role_client",
      sql`(${t.role} = 'operator' AND ${t.clientId} IS NULL) OR (${t.role} = 'client' AND ${t.clientId} IS NOT NULL)`,
    ),
  ],
);

/** Convites de acesso: link de uso único com validade. Guarda só o hash do token. */
export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("invites_client_id_idx").on(t.clientId)],
);

/** Registro de auditoria: quem fez o quê em cada cliente. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    /** Cópia do e-mail e do papel no momento da ação (o usuário pode ser removido depois). */
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("audit_log_client_created_idx").on(t.clientId, t.createdAt)],
);
