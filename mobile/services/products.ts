import { Produto } from "../types/product";
import api from "./api";

// Função para buscar todos os produtos
export async function getProducts(): Promise<Produto[]> {
  const res = await api.get(`api/produtos?populate=*`);
  
  return res.data.data.map((item: any) => {
    const attrs = item;

    return {
      id: item.id,
      documentId: attrs.documentId,
      nome: attrs.nome,
      codigo: attrs.codigo,
      codigo_antigo: attrs.codigo_antigo,
      destaque: attrs.destaque,
      compatibilidade: attrs.compatibilidade,
      descricao: attrs.descricao,
      aplicacoes: attrs.aplicacoes,
      especificacoes: attrs.especificacoes ?? [],
      imagens: attrs.imagens?.map((img: any) => ({
        id: img.id,
        documentId: img.documentId,
        name: img.name,
        alternativeText: img.alternativeText,
        caption: img.caption,
        width: img.width,
        height: img.height,
        formats: img.formats,
        hash: img.hash,
        ext: img.ext,
        mime: img.mime,
        size: img.size,
        url: process.env.EXPO_PUBLIC_API_URL + img.url, // URL com base
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
        publishedAt: img.publishedAt,
      })),
      manual: attrs.manual
        ? {
            id: attrs.manual.id,
            documentId: attrs.manual.documentId,
            name: attrs.manual.name,
            url: process.env.EXPO_PUBLIC_API_URL + attrs.manual.url,
            ext: attrs.manual.ext,
            mime: attrs.manual.mime,
            size: attrs.manual.size,
            createdAt: attrs.manual.createdAt,
            updatedAt: attrs.manual.updatedAt,
            publishedAt: attrs.manual.publishedAt,
          }
        : null,
      createdAt: attrs.createdAt,
      updatedAt: attrs.updatedAt,
      publishedAt: attrs.publishedAt,
    } as Produto;
  });
}

export async function getProductById(documentId: string): Promise<Produto> {
  const res = await api.get(`api/produtos/${documentId}?populate=*`);

  const item = res.data.data;
  const attrs = item;

  return {
    id: item.id,
    documentId: attrs.documentId,
    nome: attrs.nome,
    codigo: attrs.codigo,
    codigo_antigo: attrs.codigo_antigo,
    destaque: attrs.destaque,
    compatibilidade: attrs.compatibilidade,
    descricao: attrs.descricao,
    aplicacoes: attrs.aplicacoes,
    especificacoes: attrs.especificacoes ?? [],
    imagens: attrs.imagens?.map((img: any) => ({
      id: img.id,
      documentId: img.documentId,
      name: img.name,
      alternativeText: img.alternativeText,
      caption: img.caption,
      width: img.width,
      height: img.height,
      formats: img.formats,
      hash: img.hash,
      ext: img.ext,
      mime: img.mime,
      size: img.size,
      url:
        process.env.EXPO_PUBLIC_API_URL + img.url,
      createdAt: img.createdAt,
      updatedAt: img.updatedAt,
      publishedAt: img.publishedAt,
    })),
    manual: attrs.manual
      ? {
          id: attrs.manual.id,
          documentId: attrs.manual.documentId,
          name: attrs.manual.name,
          url:
            process.env.EXPO_PUBLIC_API_URL +
            attrs.manual.url,
          ext: attrs.manual.ext,
          mime: attrs.manual.mime,
          size: attrs.manual.size,
          createdAt: attrs.manual.createdAt,
          updatedAt: attrs.manual.updatedAt,
          publishedAt: attrs.manual.publishedAt,
        }
      : null,
    createdAt: attrs.createdAt,
    updatedAt: attrs.updatedAt,
    publishedAt: attrs.publishedAt,
  } as Produto;
}