import { Produto } from "@/types/Produto";
const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337/api";

// Buscar produtos
export async function getProdutos(): Promise<Produto[]> {
  const res = await fetch(`${API_URL}/api/produtos?populate=*`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Erro ao buscar produtos");
  const data = await res.json();
  return data.data;
}

// Um único produto
export async function getProduto(documentId: string) {
  const res = await fetch(`${API_URL}/api/produtos/${documentId}?populate=*`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error("Erro ao buscar produto");
  const data = await res.json();
  return data.data;
}

// Salvar contato
export async function postContato(payload: {
  nome: string;
  email: string;
  telefone?: string;
  mensagem: string;
}) {
  const res = await fetch(`${API_URL}/api/contatoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: payload })
  });

  if (!res.ok) throw new Error("Erro ao enviar contato");
  return res.json();
}

