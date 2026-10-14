import type { Metadata } from "next";
import Link from "next/link";
import { lookupInvite } from "@/data/access";
import { AcceptInviteForm } from "./accept-form";

export const metadata: Metadata = {
  title: "Convite · PlataformaSites",
  robots: { index: false, follow: false },
};

const UNAVAILABLE = {
  used: "Este convite já foi usado. Se a conta é sua, entre com seu e-mail e senha.",
  expired: "Este convite expirou. Peça um novo link a quem te convidou.",
  revoked: "Este convite foi cancelado. Peça um novo link a quem te convidou.",
  not_found: "Convite não encontrado. Confira se o link foi copiado inteiro.",
} as const;

/** Aceite do convite (público: o token do link é a credencial, de uso único). */
export default async function InvitePage({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const invite = await lookupInvite(token);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      {invite.status === "pending" ? (
        <>
          <h1 className="text-2xl font-semibold">Bio Site de {invite.clientName}</h1>
          <p className="mt-2 mb-6 text-muted">
            Crie sua senha para editar e publicar o Bio Site da sua empresa.
          </p>
          <AcceptInviteForm token={token} email={invite.email} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Convite indisponível</h1>
          <p role="alert" className="mt-2 mb-6">
            {UNAVAILABLE[invite.status]}
          </p>
          <Link href="/login" className="text-accent underline">
            Ir para a página de entrada
          </Link>
        </>
      )}
    </main>
  );
}
