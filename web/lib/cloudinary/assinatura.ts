import { createHash } from "node:crypto";

// Assinatura de upload do Cloudinary: SHA-1 hex das chaves ordenadas ("k=v" unidos por "&")
// seguido do segredo. Não inclui file, api_key, resource_type nem cloud_name.
export function assinarCloudinary(
  params: Record<string, string | number>,
  segredo: string,
): string {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + segredo).digest("hex");
}
