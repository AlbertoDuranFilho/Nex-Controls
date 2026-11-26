import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarCutucadas } from "./destravar-transicao";

describe("iniciarCutucadas", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("cutuca com intervalo crescente até o teto", () => {
    const cutucar = vi.fn();
    iniciarCutucadas(cutucar);
    vi.advanceTimersByTime(299);
    expect(cutucar).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1); // 300
    expect(cutucar).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(600); // 900
    expect(cutucar).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1200); // 2100
    expect(cutucar).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(2000); // 4100 (teto de 2 s)
    expect(cutucar).toHaveBeenCalledTimes(4);
    vi.advanceTimersByTime(2000);
    expect(cutucar).toHaveBeenCalledTimes(5);
  });

  it("parar cancela as próximas cutucadas", () => {
    const cutucar = vi.fn();
    const parar = iniciarCutucadas(cutucar);
    vi.advanceTimersByTime(300);
    parar();
    vi.advanceTimersByTime(10_000);
    expect(cutucar).toHaveBeenCalledTimes(1);
  });
});
