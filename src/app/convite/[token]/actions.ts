"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/admin/_components/form";
import { acceptInvite, EmailTaken, InviteUnavailable } from "@/data/access";

/** Público: o token do convite é a credencial (uso único, com validade, conferido no banco). */
export async function acceptInviteAction(
  token: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const name = String(fd.get("name") ?? "");
  try {
    await acceptInvite(token, {
      name,
      password: String(fd.get("password") ?? ""),
      confirm: String(fd.get("confirm") ?? ""),
    });
  } catch (err) {
    // Senhas nunca voltam para o formulário.
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        message: "Corrija os campos destacados.",
        fieldErrors: z.flattenError(err).fieldErrors,
        values: { name },
      };
    }
    if (err instanceof InviteUnavailable || err instanceof EmailTaken) {
      return { ok: false, message: err.message, values: { name } };
    }
    throw err;
  }
  redirect("/painel");
}
