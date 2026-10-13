import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { CLIENT_STATUSES } from "../../clients/status";

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
  /** Subdomínio público: <slug>.<ROOT_DOMAIN>. */
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
