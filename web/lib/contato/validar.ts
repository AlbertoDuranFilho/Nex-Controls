export type EntradaContato = {
  nome: string;
  email: string;
  telefone?: string;
  mensagem: string;
  empresa_site?: string;
};

export type ErrosContato = Partial<Record<"nome" | "email" | "mensagem", string>>;

export type ResultadoValidacao =
  | { ok: true; dados: { nome: string; email: string; telefone: string; mensagem: string } }
  | { ok: false; erros: ErrosContato }
  | { ok: "spam" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarContato(d: EntradaContato): ResultadoValidacao {
  if (d.empresa_site?.trim()) return { ok: "spam" };
  const nome = (d.nome ?? "").trim();
  const email = (d.email ?? "").trim();
  const telefone = (d.telefone ?? "").trim();
  const mensagem = (d.mensagem ?? "").trim();
  const erros: ErrosContato = {};
  if (nome.length < 2 || nome.length > 100) erros.nome = "nome";
  if (!EMAIL.test(email) || email.length > 254) erros.email = "email";
  if (mensagem.length < 10 || mensagem.length > 2000) erros.mensagem = "mensagem";
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { nome, email, telefone, mensagem } };
}
