export type ResultadoAdmin<T = void> = { ok: true; dados: T } | { ok: false; erro: string };
