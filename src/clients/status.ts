export const CLIENT_STATUSES = ["briefing", "editing", "awaiting_approval", "published"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const STATUS_LABEL: Record<ClientStatus, string> = {
  briefing: "Briefing",
  editing: "Em edição",
  awaiting_approval: "Aguardando aprovação",
  published: "Publicado",
};
