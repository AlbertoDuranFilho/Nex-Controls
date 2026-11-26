import { Package } from "lucide-react-native";
import { AvisoCentral, ExigeLogin } from "@/components/ExigeLogin";
import { textos } from "@/constants/textos";

// Pedidos do lojista (inativo também vê o histórico, como no site). Conteúdo real na Task 4.
export default function TelaPedidos() {
  return (
    <ExigeLogin>
      <AvisoCentral icone={Package} titulo={textos.pedidos.titulo} descricao={textos.pedidos.emBreve} />
    </ExigeLogin>
  );
}
