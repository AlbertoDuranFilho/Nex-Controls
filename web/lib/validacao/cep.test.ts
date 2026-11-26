import { describe, expect, it } from "vitest";
import { buscarCep, normalizarCep } from "@/lib/validacao/cep";

describe("normalizarCep", () => {
  it("remove máscara e retorna 8 dígitos", () => {
    expect(normalizarCep("50.030-230")).toBe("50030230");
  });

  it("retorna null quando não há 8 dígitos", () => {
    expect(normalizarCep("1234")).toBeNull();
  });
});

describe("buscarCep", () => {
  it("retorna null quando o fetch lança erro de rede", async () => {
    await expect(
      buscarCep("50030230", async () => {
        throw new Error("offline");
      }),
    ).resolves.toBeNull();
  });

  it("retorna null quando o fetch nunca resolve (timeout)", async () => {
    await expect(buscarCep("50030230", () => new Promise(() => {}), 50)).resolves.toBeNull();
  });

  it("retorna null quando ViaCEP responde erro", async () => {
    await expect(buscarCep("99999999", async () => new Response('{"erro":true}'))).resolves.toBeNull();
  });

  it("retorna null quando HTTP não é 200", async () => {
    await expect(
      buscarCep("50030230", async () => new Response("{}", { status: 500 })),
    ).resolves.toBeNull();
  });

  it("mapeia localidade para cidade", async () => {
    await expect(
      buscarCep(
        "50030230",
        async () => new Response('{"logradouro":"Rua A","bairro":"B","localidade":"Recife","uf":"PE"}'),
      ),
    ).resolves.toEqual({ logradouro: "Rua A", bairro: "B", cidade: "Recife", uf: "PE" });
  });

  it("consulta a URL do ViaCEP com o CEP normalizado", async () => {
    let url = "";
    await buscarCep("50.030-230", async (input) => {
      url = String(input);
      return new Response('{"erro":true}');
    });
    expect(url).toBe("https://viacep.com.br/ws/50030230/json/");
  });
});
