import { ShoppingCart } from "lucide-react-native";
import { AvisoCentral, ExigeLogin } from "@/components/ExigeLogin";
import { textos } from "@/constants/textos";

// Carrinho do lojista ativo. Conteúdo real na Task 4.
export default function TelaCarrinho() {
  return (
    <ExigeLogin exigirAtivo>
      <AvisoCentral icone={ShoppingCart} titulo={textos.carrinho.titulo} descricao={textos.carrinho.emBreve} />
    </ExigeLogin>
  );
}
