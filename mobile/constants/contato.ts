// Canais de contato da Nex (os mesmos do site).
// E-mail: rodapé do site (web/components/Footer.tsx).
// WhatsApp: o site ainda não publica um número (o do SAC no Navbar está comentado e o de
// messages/pt.json é um marcador "(11) 9999-9999"). Enquanto for null, o app usa só o e-mail.
// Quando a Nex tiver o número, preencha só com dígitos e DDI, ex.: "5581999990000".

export const contato = {
  email: "contato@nexcontrols.com",
  whatsapp: null as string | null,
} as const;

/** Caminho da política de privacidade no site (abre no navegador do app; é um documento). */
export const CAMINHO_POLITICA = "/pt/privacy-policy";

/** Página pública de exclusão de conta (a mesma URL informada na Google Play). */
export const CAMINHO_EXCLUIR_CONTA = "/pt/excluir-conta";

/** Área do Cliente no site (edição de dados e endereço nesta fase). */
export const CAMINHO_AREA_CLIENTE = "/pt/cliente";
export const CAMINHO_ENDERECO = "/pt/cliente/endereco";
