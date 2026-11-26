const MAPA: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto de usuário antes de colocá-lo em HTML de e-mail. */
export function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => MAPA[c]);
}
