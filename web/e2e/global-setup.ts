import { limparUsuarios } from "./fixtures";

export default async function globalSetup() {
  await limparUsuarios();
}
