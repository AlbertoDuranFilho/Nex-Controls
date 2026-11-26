import { describe, expect, it } from "vitest";
import { STATUS_PEDIDO, opcoesDeStatus, transicaoPermitida } from "./transicoes";

describe("transições de status do pedido", () => {
  it("aguardando_pagamento só vai para pago ou cancelado", () => {
    expect(opcoesDeStatus("aguardando_pagamento")).toEqual(["aguardando_pagamento", "pago", "cancelado"]);
  });

  it("segue a cadeia pago -> faturado -> enviado -> entregue -> devolvido", () => {
    expect(opcoesDeStatus("pago")).toEqual(["pago", "faturado", "cancelado"]);
    expect(opcoesDeStatus("faturado")).toEqual(["faturado", "enviado"]);
    expect(opcoesDeStatus("enviado")).toEqual(["enviado", "entregue"]);
    expect(opcoesDeStatus("entregue")).toEqual(["entregue", "devolvido"]);
  });

  it("estados finais só mostram o atual", () => {
    expect(opcoesDeStatus("cancelado")).toEqual(["cancelado"]);
    expect(opcoesDeStatus("devolvido")).toEqual(["devolvido"]);
    expect(opcoesDeStatus("erro_pagamento")).toEqual(["erro_pagamento"]);
  });

  it("transicaoPermitida recusa saltos", () => {
    expect(transicaoPermitida("aguardando_pagamento", "entregue")).toBe(false);
    expect(transicaoPermitida("aguardando_pagamento", "pago")).toBe(true);
  });

  it("tem rótulo em português para todo status", () => {
    for (const s of Object.keys(STATUS_PEDIDO)) expect(STATUS_PEDIDO[s as keyof typeof STATUS_PEDIDO]).toBeTruthy();
    expect(STATUS_PEDIDO.aguardando_pagamento).toBe("Aguardando pagamento");
  });
});
