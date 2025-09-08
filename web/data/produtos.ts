import { Produto } from "@/types/Produto"

export const produtos: Produto[] = [
  {
    id: "cp-3631550",
    codigo: "CP 3631550",
    nome: "Placa controladora digital LTE08 Bivolt",
    destaque: "Superfície Resinada",
    imagens: ["/images/prod1.jpg", "/images/prod2.jpg"],
    compatibilidade: ["A99021901", "70200433"],
    manual: "/manuals/CP3631550.pdf",
    descricao:
      "A função da placa de potência é abastecer a energia e conceder comandos para os componentes da lavadora após receber o comando...",
    especificacoes: "Tensão: Bivolt | Peso: 150g | Dimensões: 12x8cm",
    aplicacoes: "Compatível com modelos LTE08, LTE09, LTE10",
  },
  {
    id: "placa-b",
    codigo: "CP 111111",
    nome: "Placa de Interface Lavadora ZZ",
    destaque: "Alta Durabilidade",
    imagens: ["/images/prod2.jpg", "/images/prod3.jpg"],
    compatibilidade: ["X12345", "X67890"],
    manual: "/manuals/CP111111.pdf",
    descricao: "Interface para comando de funções principais...",
    especificacoes: "Tensão: 220V | Peso: 120g",
    aplicacoes: "Compatível com ZZ-01, ZZ-02",
  },
]