import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enviarEmail } from "./enviar";

const msg = { para: "a@b.com", assunto: "Oi", html: "<p>x</p>", texto: "x" };

describe("enviarEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "chave");
    vi.stubEnv("VERCEL_ENV", "production");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia ao Resend e retorna ok com resposta 200", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await enviarEmail({ ...msg, responderPara: "v@x.com" })).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer chave");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      to: ["a@b.com"],
      subject: "Oi",
      html: "<p>x</p>",
      text: "x",
      reply_to: "v@x.com",
    });
    expect(body.from).toContain("contato@nexcontrols.com");
  });

  it("omite reply_to quando não informado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    await enviarEmail(msg);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("reply_to");
  });

  it("retorna ok:false com resposta 500", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    expect(await enviarEmail(msg)).toEqual({ ok: false });
  });

  it("retorna ok:false em erro de rede, sem lançar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    expect(await enviarEmail(msg)).toEqual({ ok: false });
  });

  it("sem chave fora de produção simula e não chama fetch", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("VERCEL_ENV", "development");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await enviarEmail(msg)).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("[email simulado] a@b.com Oi");
    info.mockRestore();
  });

  it("sem chave em produção retorna ok:false", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await enviarEmail(msg)).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
