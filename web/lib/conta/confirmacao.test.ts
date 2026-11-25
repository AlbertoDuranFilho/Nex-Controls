import { describe, expect, it } from "vitest";
import { resultadoConfirmacao } from "./confirmacao";

describe("resultadoConfirmacao", () => {
  it("erro do verifyOtp vira erro", () => {
    expect(resultadoConfirmacao(new Error("x"), null)).toBe("erro");
  });
  it("primeiro link (sem usuário) fica pendente", () => {
    expect(resultadoConfirmacao(null, null)).toBe("pendente");
  });
  it("usuário ainda com new_email fica pendente", () => {
    expect(resultadoConfirmacao(null, { new_email: "novo@x.com" })).toBe("pendente");
  });
  it("sem new_email a troca foi concluída", () => {
    expect(resultadoConfirmacao(null, { new_email: null })).toBe("confirmado");
    expect(resultadoConfirmacao(null, {})).toBe("confirmado");
  });
});
