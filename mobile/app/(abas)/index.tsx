import { LayoutGrid } from "lucide-react-native";
import { AvisoCentral } from "@/components/ExigeLogin";
import { textos } from "@/constants/textos";

// Catálogo público (visitante vê sem preço). Conteúdo real na Task 3.
export default function TelaCatalogo() {
  return (
    <AvisoCentral icone={LayoutGrid} titulo={textos.catalogo.titulo} descricao={textos.catalogo.emBreve} />
  );
}
