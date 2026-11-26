
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "acessos_log": {
                  Row: {
                    "created_at": string,"id": number,"ip": unknown,"user_agent": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"ip"?: unknown,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"ip"?: unknown,"user_agent"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"aliquotas_icms_uf": {
                  Row: {
                    "aliquota_interestadual": number | null,"aliquota_interna": number,"uf": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aliquota_interestadual"?: number | null,"aliquota_interna": number,"uf": string
                  }
                  Update: {
                    "aliquota_interestadual"?: number | null,"aliquota_interna"?: number,"uf"?: string
                  }
                  Relationships: [
                    
                  ]
                },"carrinho_itens": {
                  Row: {
                    "id": string,"lojista_id": string,"produto_id": string,"quantidade": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"lojista_id": string,"produto_id": string,"quantidade": number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: string,"lojista_id"?: string,"produto_id"?: string,"quantidade"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "carrinho_itens_lojista_id_fkey"
      columns: ["lojista_id"]
isOneToOne: false
      referencedRelation: "lojistas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "carrinho_itens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"cupons": {
                  Row: {
                    "ativo": boolean,"codigo": string,"created_at": string,"id": string,"lojista_id": string | null,"max_usos": number | null,"tipo": Database["public"]['Enums']["cupom_tipo"],"valido_ate": string | null,"valido_de": string | null,"valor": number,"valor_minimo_pedido": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"codigo": string,"created_at"?: string,"id"?: string,"lojista_id"?: string | null,"max_usos"?: number | null,"tipo": Database["public"]['Enums']["cupom_tipo"],"valido_ate"?: string | null,"valido_de"?: string | null,"valor": number,"valor_minimo_pedido"?: number | null
                  }
                  Update: {
                    "ativo"?: boolean,"codigo"?: string,"created_at"?: string,"id"?: string,"lojista_id"?: string | null,"max_usos"?: number | null,"tipo"?: Database["public"]['Enums']["cupom_tipo"],"valido_ate"?: string | null,"valido_de"?: string | null,"valor"?: number,"valor_minimo_pedido"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "cupons_lojista_id_fkey"
      columns: ["lojista_id"]
isOneToOne: false
      referencedRelation: "lojistas"
      referencedColumns: ["id"]
    }
                  ]
                },"lojista_descontos_produto": {
                  Row: {
                    "desconto_percentual": number,"lojista_id": string,"produto_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "desconto_percentual": number,"lojista_id": string,"produto_id": string
                  }
                  Update: {
                    "desconto_percentual"?: number,"lojista_id"?: string,"produto_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lojista_descontos_produto_lojista_id_fkey"
      columns: ["lojista_id"]
isOneToOne: false
      referencedRelation: "lojistas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lojista_descontos_produto_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"lojistas": {
                  Row: {
                    "anonimizado_em": string | null,"ativo": boolean,"bairro": string | null,"cep": string | null,"cidade": string | null,"complemento": string | null,"created_at": string,"desconto_percentual": number,"documento": string | null,"email": string,"id": string,"indicador_ie": Database["public"]['Enums']["indicador_ie"],"inscricao_estadual": string | null,"logradouro": string | null,"nome": string,"nome_fantasia": string | null,"numero": string | null,"responsavel_nome": string | null,"telefone": string | null,"tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"uf": string | null,"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anonimizado_em"?: string | null,"ativo"?: boolean,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"complemento"?: string | null,"created_at"?: string,"desconto_percentual"?: number,"documento"?: string | null,"email": string,"id": string,"indicador_ie"?: Database["public"]['Enums']["indicador_ie"],"inscricao_estadual"?: string | null,"logradouro"?: string | null,"nome": string,"nome_fantasia"?: string | null,"numero"?: string | null,"responsavel_nome"?: string | null,"telefone"?: string | null,"tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"uf"?: string | null,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "anonimizado_em"?: string | null,"ativo"?: boolean,"bairro"?: string | null,"cep"?: string | null,"cidade"?: string | null,"complemento"?: string | null,"created_at"?: string,"desconto_percentual"?: number,"documento"?: string | null,"email"?: string,"id"?: string,"indicador_ie"?: Database["public"]['Enums']["indicador_ie"],"inscricao_estadual"?: string | null,"logradouro"?: string | null,"nome"?: string,"nome_fantasia"?: string | null,"numero"?: string | null,"responsavel_nome"?: string | null,"telefone"?: string | null,"tipo_pessoa"?: Database["public"]['Enums']["tipo_pessoa"],"uf"?: string | null,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"pedido_itens": {
                  Row: {
                    "desconto_percentual": number,"id": string,"pedido_id": string,"preco_tabela": number,"preco_unitario": number,"produto_codigo": string,"produto_id": string,"produto_nome": string,"quantidade": number
                  }
                  ComputedFields: never
                  Insert: {
                    "desconto_percentual"?: number,"id"?: string,"pedido_id": string,"preco_tabela": number,"preco_unitario": number,"produto_codigo": string,"produto_id": string,"produto_nome": string,"quantidade": number
                  }
                  Update: {
                    "desconto_percentual"?: number,"id"?: string,"pedido_id"?: string,"preco_tabela"?: number,"preco_unitario"?: number,"produto_codigo"?: string,"produto_id"?: string,"produto_nome"?: string,"quantidade"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedido_itens_pedido_id_fkey"
      columns: ["pedido_id"]
isOneToOne: false
      referencedRelation: "pedidos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedido_itens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos": {
                  Row: {
                    "cliente_documento": string,"cliente_indicador_ie": Database["public"]['Enums']["indicador_ie"],"cliente_inscricao_estadual": string | null,"cliente_nome": string,"cliente_tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"created_at": string,"cupom_id": string | null,"desconto_origem": Database["public"]['Enums']["desconto_origem"],"desconto_valor": number,"difal_valor": number,"entrega_bairro": string,"entrega_cep": string,"entrega_cidade": string,"entrega_complemento": string | null,"entrega_logradouro": string,"entrega_numero": string,"entrega_uf": string,"frete_valor": number,"gateway_provider": string | null,"gateway_transaction_id": string | null,"icms_valor": number,"id": string,"lojista_id": string,"maino_nota_id": string | null,"maino_nota_url": string | null,"metodo_pagamento": string | null,"numero": number,"status": Database["public"]['Enums']["pedido_status"],"status_pagamento": string | null,"subtotal": number,"total": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cliente_documento": string,"cliente_indicador_ie": Database["public"]['Enums']["indicador_ie"],"cliente_inscricao_estadual"?: string | null,"cliente_nome": string,"cliente_tipo_pessoa": Database["public"]['Enums']["tipo_pessoa"],"created_at"?: string,"cupom_id"?: string | null,"desconto_origem"?: Database["public"]['Enums']["desconto_origem"],"desconto_valor"?: number,"difal_valor"?: number,"entrega_bairro": string,"entrega_cep": string,"entrega_cidade": string,"entrega_complemento"?: string | null,"entrega_logradouro": string,"entrega_numero": string,"entrega_uf": string,"frete_valor"?: number,"gateway_provider"?: string | null,"gateway_transaction_id"?: string | null,"icms_valor"?: number,"id"?: string,"lojista_id": string,"maino_nota_id"?: string | null,"maino_nota_url"?: string | null,"metodo_pagamento"?: string | null,"numero"?: never,"status"?: Database["public"]['Enums']["pedido_status"],"status_pagamento"?: string | null,"subtotal": number,"total": number,"updated_at"?: string
                  }
                  Update: {
                    "cliente_documento"?: string,"cliente_indicador_ie"?: Database["public"]['Enums']["indicador_ie"],"cliente_inscricao_estadual"?: string | null,"cliente_nome"?: string,"cliente_tipo_pessoa"?: Database["public"]['Enums']["tipo_pessoa"],"created_at"?: string,"cupom_id"?: string | null,"desconto_origem"?: Database["public"]['Enums']["desconto_origem"],"desconto_valor"?: number,"difal_valor"?: number,"entrega_bairro"?: string,"entrega_cep"?: string,"entrega_cidade"?: string,"entrega_complemento"?: string | null,"entrega_logradouro"?: string,"entrega_numero"?: string,"entrega_uf"?: string,"frete_valor"?: number,"gateway_provider"?: string | null,"gateway_transaction_id"?: string | null,"icms_valor"?: number,"id"?: string,"lojista_id"?: string,"maino_nota_id"?: string | null,"maino_nota_url"?: string | null,"metodo_pagamento"?: string | null,"numero"?: never,"status"?: Database["public"]['Enums']["pedido_status"],"status_pagamento"?: string | null,"subtotal"?: number,"total"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_cupom_id_fkey"
      columns: ["cupom_id"]
isOneToOne: false
      referencedRelation: "cupons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pedidos_lojista_id_fkey"
      columns: ["lojista_id"]
isOneToOne: false
      referencedRelation: "lojistas"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_especificacoes": {
                  Row: {
                    "id": string,"nome": string,"ordem": number,"produto_id": string,"valor": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"nome": string,"ordem"?: number,"produto_id": string,"valor": string
                  }
                  Update: {
                    "id"?: string,"nome"?: string,"ordem"?: number,"produto_id"?: string,"valor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_especificacoes_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_imagens": {
                  Row: {
                    "alt": string | null,"id": string,"ordem": number,"produto_id": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string | null,"id"?: string,"ordem"?: number,"produto_id": string,"url": string
                  }
                  Update: {
                    "alt"?: string | null,"id"?: string,"ordem"?: number,"produto_id"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_imagens_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: false
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"produto_precos": {
                  Row: {
                    "preco": number,"produto_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "preco": number,"produto_id": string,"updated_at"?: string
                  }
                  Update: {
                    "preco"?: number,"produto_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "produto_precos_produto_id_fkey"
      columns: ["produto_id"]
isOneToOne: true
      referencedRelation: "produtos"
      referencedColumns: ["id"]
    }
                  ]
                },"produtos": {
                  Row: {
                    "altura_cm": number | null,"aplicacoes": string | null,"ativo": boolean,"cest": string | null,"codigo": string,"codigo_antigo": string | null,"compatibilidade": string | null,"comprimento_cm": number | null,"created_at": string,"descricao": string | null,"destaque": string | null,"ean": string | null,"id": string,"largura_cm": number | null,"manual_url": string | null,"ncm": string | null,"nome": string,"origem": number | null,"peso_kg": number | null,"slug": string,"unidade": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "altura_cm"?: number | null,"aplicacoes"?: string | null,"ativo"?: boolean,"cest"?: string | null,"codigo": string,"codigo_antigo"?: string | null,"compatibilidade"?: string | null,"comprimento_cm"?: number | null,"created_at"?: string,"descricao"?: string | null,"destaque"?: string | null,"ean"?: string | null,"id"?: string,"largura_cm"?: number | null,"manual_url"?: string | null,"ncm"?: string | null,"nome": string,"origem"?: number | null,"peso_kg"?: number | null,"slug": string,"unidade"?: string,"updated_at"?: string
                  }
                  Update: {
                    "altura_cm"?: number | null,"aplicacoes"?: string | null,"ativo"?: boolean,"cest"?: string | null,"codigo"?: string,"codigo_antigo"?: string | null,"compatibilidade"?: string | null,"comprimento_cm"?: number | null,"created_at"?: string,"descricao"?: string | null,"destaque"?: string | null,"ean"?: string | null,"id"?: string,"largura_cm"?: number | null,"manual_url"?: string | null,"ncm"?: string | null,"nome"?: string,"origem"?: number | null,"peso_kg"?: number | null,"slug"?: string,"unidade"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"id": string,"is_admin": boolean,"nome": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"is_admin"?: boolean,"nome"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_admin"?: boolean,"nome"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_importar_produtos":
{ Args: { "p": Json }; Returns: Json
                           },
"anonimizar_auth":
{ Args: { "email_anonimo": string,"uid": string }; Returns: undefined
                           },
"carrinho_adicionar":
{ Args: { "p_produto_id": string,"p_quantidade": number }; Returns: number
                           },
"gerar_slug":
{ Args: { "p_codigo": string,"p_nome": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_lojista_ativo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"precos_cliente":
{ Args: { "p_produto_ids": (string)[] }; Returns: {
              "desconto_percentual": number,"preco_final": number,"preco_tabela": number,"produto_id": string
            }[]
                           }
          }
          Enums: {
            "cupom_tipo": "percentual"|"valor","desconto_origem": "nenhum"|"cliente"|"cupom","indicador_ie": "contribuinte"|"isento"|"nao_contribuinte","pedido_status": "aguardando_pagamento"|"pago"|"faturado"|"enviado"|"entregue"|"cancelado"|"erro_pagamento"|"devolvido","tipo_pessoa": "PF"|"PJ"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cupom_tipo": ["percentual", "valor"],"desconto_origem": ["nenhum", "cliente", "cupom"],"indicador_ie": ["contribuinte", "isento", "nao_contribuinte"],"pedido_status": ["aguardando_pagamento", "pago", "faturado", "enviado", "entregue", "cancelado", "erro_pagamento", "devolvido"],"tipo_pessoa": ["PF", "PJ"]
          }
        }
} as const
