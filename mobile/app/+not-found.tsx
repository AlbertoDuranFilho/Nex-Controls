import { useRouter } from "expo-router";
import { Compass } from "lucide-react-native";
import { AvisoCentral } from "@/components/ExigeLogin";
import { textos } from "@/constants/textos";

export default function NaoEncontrada() {
  const router = useRouter();
  return (
    <AvisoCentral
      icone={Compass}
      titulo={textos.geral.paginaNaoEncontrada}
      acao={{ titulo: textos.geral.irParaCatalogo, onPress: () => router.replace("/") }}
    />
  );
}
