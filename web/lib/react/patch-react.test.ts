import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// O postinstall (patch-package) aplica facebook/react#36134 no React embutido no Next.
// Se este teste falhar, o patch não foi aplicado (ou o Next mudou): ver README, "Patch do React".
const require = createRequire(import.meta.url);

describe("patch do React no Next", () => {
  it.each(["production", "development"])("react-dom-client.%s.js registra os pings na renderização", (tipo) => {
    const arquivo = require.resolve(`next/dist/compiled/react-dom/cjs/react-dom-client.${tipo}.js`);
    const codigo = readFileSync(arquivo, "utf8");
    const corrigido =
      tipo === "production"
        ? "? prepareFreshStack(root, 0)\n        : (workInProgressRootPingedLanes |= pingedLanes)"
        : "? prepareFreshStack(root, 0)\n            : (workInProgressRootPingedLanes |= pingedLanes)";
    expect(codigo).toContain(corrigido);
  });
});
