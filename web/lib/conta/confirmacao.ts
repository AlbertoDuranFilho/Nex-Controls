export type ResultadoConfirmacao = "confirmado" | "pendente" | "erro";

type Usuario = { new_email?: string | null } | null | undefined;

// Interpreta o retorno de verifyOtp({ type: "email_change" }). Com "confirmar nos dois e-mails",
// o primeiro link só confirma um lado: sem usuário/sessão no retorno, ou ainda com e-mail novo
// aguardando, a troca está pendente. Só sem new_email a troca foi concluída.
export function resultadoConfirmacao(erro: unknown, usuario: Usuario): ResultadoConfirmacao {
  if (erro) return "erro";
  if (!usuario || usuario.new_email) return "pendente";
  return "confirmado";
}
