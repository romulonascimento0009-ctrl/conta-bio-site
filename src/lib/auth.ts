import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

export const MIN_PASSWORD_LENGTH = 12;

export const auth = betterAuth({
  appName: "PlataformaSites",
  baseURL: env().BETTER_AUTH_URL,
  secret: env().BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Operador único: contas só são criadas pelo script `npm run admin:create`.
    disableSignUp: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },
  rateLimit: {
    enabled: true,
    // Em banco para valer entre instâncias serverless.
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  plugins: [nextCookies()], // deve ser o último plugin
});

export type Session = typeof auth.$Infer.Session;
