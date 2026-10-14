CREATE TABLE "site_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"target" text,
	"label" text,
	"visitor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_events" ADD CONSTRAINT "site_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "site_events_client_created_idx" ON "site_events" USING btree ("client_id","created_at");