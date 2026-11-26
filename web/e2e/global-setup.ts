import { limparUsuarios } from "./fixtures";
import { iniciarMainoFalso } from "./maino-falso";

export default async function globalSetup() {
  await limparUsuarios();
  return await iniciarMainoFalso();
}
