import type { RootNode } from "@strapi/blocks-react-renderer";
export interface Produto {
  id: number;
  documentId: string;

  // Campos básicos
  nome: string;
  codigo: string;
  codigo_antigo?: string;
  destaque?: string;
  compatibilidade?: string;

  // Descrição e aplicações vêm como JSON richtext (array de blocos)
  descricao?: RootNode[];
  aplicacoes?: RootNode[];

  // Especificações fixas opcionais (caso você tenha criado no Strapi)
  especificacoes: Array<{
    id: number,
    nome: string,
    valor: string
  }>;

  // Relações com media
  imagens?: Imagem[];
  manual?: Arquivo | null;

  // Datas
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// 📌 Tipo de uma imagem do Strapi
export interface Imagem {
  id: number;
  documentId: string;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: MediaFormat;
    small?: MediaFormat;
    medium?: MediaFormat;
    large?: MediaFormat;
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: string | null;
  provider: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// 📌 Tipo de um arquivo genérico (ex: PDF)
export interface Arquivo {
  id: number;
  documentId: string;
  name: string;
  url: string;
  ext: string;
  mime: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// 📌 Formatos de imagem gerados pelo Strapi
export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  path?: string | null;
  width: number;
  height: number;
  size: number;
  url: string;
}
