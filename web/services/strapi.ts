import { Produto } from "@/types/Produto";
const API_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337/api";

// Buscar produtos
export async function getProdutos(): Promise<Produto[]> {
  const url = `${API_URL}/api/produtos?sort=codigo:asc&populate=*`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      console.warn("Strapi não respondeu:", res.status, res.statusText);
      return []; // fallback: lista vazia
    }

    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("Erro ao buscar produtos:", err);
    return []; // fallback: lista vazia
  }
}

// Um único produto
export async function getProduto(documentId: string) {
  const url = `${API_URL}/api/produtos/${documentId}?populate=*`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      console.warn("Strapi não respondeu:", res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    return data.data;
  } catch (err) {
    console.error("Erro ao buscar produto:", err);
    return null;
  }
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

