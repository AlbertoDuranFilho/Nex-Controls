import { mensagemErroLogin } from "../perfil";

describe("mensagemErroLogin", () => {
  it("credencial inválida", () => {
    expect(mensagemErroLogin({ message: "Invalid login credentials", status: 400, code: "invalid_credentials" })).toBe(
      "E-mail ou senha inválidos.",
    );
  });
  it("e-mail não confirmado", () => {
    expect(mensagemErroLogin({ message: "Email not confirmed", code: "email_not_confirmed" })).toBe(
      "Confirme seu e-mail antes de entrar.",
    );
  });
  it("muitas tentativas", () => {
    expect(mensagemErroLogin({ message: "Request rate limit reached", status: 429 })).toMatch(/Muitas tentativas/);
  });
  it("sem rede", () => {
    expect(mensagemErroLogin({ message: "Network request failed" })).toMatch(/Sem conexão/);
  });
  it("conta banida não revela o motivo", () => {
    expect(mensagemErroLogin({ message: "User is banned", code: "user_banned" })).toBe("E-mail ou senha inválidos.");
  });
});
