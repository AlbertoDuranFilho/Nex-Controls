// next/image só otimiza hosts de next.config (res.cloudinary.com). Qualquer outro host https
// cadastrado no admin é servido sem otimização, em vez de quebrar a página.
export function imagemNaoOtimizada(url: string): boolean {
  try {
    return new URL(url).hostname !== "res.cloudinary.com";
  } catch {
    return true;
  }
}
