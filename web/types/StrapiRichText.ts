export interface StrapiTextNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

export interface StrapiElementNode {
  type: string; // "paragraph", "list", "list-item", "heading", etc.
  children: StrapiNode[];
}

export type StrapiNode = StrapiTextNode | StrapiElementNode;