import { describe, expect, it } from "vitest";
import { briefingSchema } from "@/clients/briefing";
import { collectVideoRefs, validateBio, type BioDocument, type BlockOf } from "./bio";
import { trackTargets } from "./metrics";
import { newBlock } from "./operations";
import { missingAnswers, quoteMessage } from "./quote";
import { createBioDocument } from "./templates";

const VID = "33333333-3333-4333-8333-333333333333";

function doc(whatsapp = "5585987154785"): BioDocument {
  return createBioDocument({
    segment: "services",
    briefing: briefingSchema.parse({ businessName: "Casa Limpa", whatsapp }),
  });
}

function quote(): BlockOf<"quote"> {
  return {
    id: "orcamento",
    type: "quote",
    hidden: false,
    title: "Pedir orçamento",
    greeting: "Oi, Ana Paula! Vim pelo Bio Site e gostaria de um orçamento.",
    questions: [
      {
        id: "q1",
        label: "O que você precisa limpar?",
        kind: "multi",
        options: ["Casa toda", "Cozinha", "Banheiros", "Janelas e vidros"],
        required: true,
      },
      {
        id: "q2",
        label: "Como é o imóvel?",
        kind: "single",
        options: ["Casa", "Apartamento"],
        required: true,
      },
      {
        id: "q3",
        label: "Com que frequência?",
        kind: "single",
        options: ["Só uma vez", "Toda semana"],
        required: false,
      },
      { id: "q4", label: "Bairro e cidade", kind: "text", options: [], required: true },
    ],
  };
}

const paths = (d: BioDocument) => {
  const r = validateBio(d);
  return r.ok ? [] : r.issues.map((i) => i.path);
};

describe("Pedir orçamento", () => {
  it("monta a mensagem com a saudação e uma linha por resposta, na ordem das opções", () => {
    const msg = quoteMessage(quote(), {
      q1: ["Janelas e vidros", "Casa toda"],
      q2: ["Apartamento"],
      q4: "  Messejana, Fortaleza ",
    });
    expect(msg).toBe(
      [
        "Oi, Ana Paula! Vim pelo Bio Site e gostaria de um orçamento.",
        "• O que você precisa limpar: Casa toda, Janelas e vidros",
        "• Como é o imóvel: Apartamento",
        "• Bairro e cidade: Messejana, Fortaleza",
      ].join("\n"),
    );
  });

  it("ignora opção que não existe (o navegador não escolhe o texto da mensagem)", () => {
    expect(quoteMessage(quote(), { q2: ["<script>"], q4: "Centro" })).not.toContain("script");
  });

  it("só libera o envio com as obrigatórias respondidas", () => {
    const b = quote();
    expect(missingAnswers(b, {}).map((q) => q.id)).toEqual(["q1", "q2", "q4"]);
    expect(
      missingAnswers(b, { q1: ["Cozinha"], q2: ["Casa"], q4: "   " }).map((q) => q.id),
    ).toEqual(["q4"]);
    expect(missingAnswers(b, { q1: ["Cozinha"], q2: ["Casa"], q4: "Aldeota" })).toEqual([]);
  });

  it("é válido no documento e exige o número do WhatsApp (grupo não leva mensagem)", () => {
    const d = doc();
    d.blocks.unshift(quote());
    expect(validateBio(d).ok).toBe(true);
    const sem = doc("");
    delete sem.contact.whatsapp;
    sem.blocks.unshift(quote());
    expect(paths(sem)).toContain("blocks.0");
  });

  it("pergunta de tocar precisa de ao menos duas opções; ids não se repetem", () => {
    const d = doc();
    const b = quote();
    b.questions[1].options = ["Casa"];
    b.questions[2].id = "q1";
    d.blocks.unshift(b);
    const p = paths(d);
    expect(p).toContain("blocks.0.questions.1.options");
    expect(p).toContain("blocks.0.questions.2.id");
  });

  it("cor própria do cartão precisa de contraste com o texto branco", () => {
    const d = doc();
    d.blocks.unshift({ ...quote(), colors: { top: "#5aaef5", bottom: "#1a56c4" } });
    expect(paths(d)).toContain("blocks.0.colors.top");
    d.blocks[0] = { ...quote(), colors: { top: "#1f6ee0", bottom: "#1a56c4" } };
    expect(validateBio(d).ok).toBe(true);
  });

  it("conta a abertura e o envio nas métricas", () => {
    const d = doc();
    d.blocks.unshift(quote());
    const t = trackTargets(d);
    expect(t.get("b:orcamento")?.target).toBe("quote");
    expect(t.get("q:orcamento")?.target).toBe("quote:send");
  });

  it("bloco novo do editor já nasce válido", () => {
    const d = doc();
    const b = newBlock(d, "quote");
    expect(b?.type).toBe("quote");
    d.blocks.push(b!);
    expect(validateBio(d).ok).toBe(true);
  });
});

describe("Vídeos em destaque", () => {
  it("referencia os vídeos (posse conferida no servidor) e conta o toque em cada um", () => {
    const d = doc();
    const b = newBlock(d, "videos", undefined, { videoId: VID });
    expect(b).not.toBeNull();
    d.blocks.unshift(b!);
    expect(validateBio(d).ok).toBe(true);
    expect(collectVideoRefs(d).map((r) => r.videoId)).toEqual([VID]);
    expect(trackTargets(d).get(`v:${b!.id}:0`)?.target).toBe("videos");
  });

  it("sem vídeo enviado o editor não cria o bloco", () => {
    expect(newBlock(doc(), "videos")).toBeNull();
  });
});
