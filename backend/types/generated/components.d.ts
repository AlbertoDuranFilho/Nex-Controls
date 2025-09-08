import type { Schema, Struct } from '@strapi/strapi';

export interface ProdutoEspecificacao extends Struct.ComponentSchema {
  collectionName: 'components_produto_especificacaos';
  info: {
    displayName: 'Especificacao';
  };
  attributes: {
    icone: Schema.Attribute.Media<'images'>;
    nome: Schema.Attribute.String;
    valor: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'produto.especificacao': ProdutoEspecificacao;
    }
  }
}
