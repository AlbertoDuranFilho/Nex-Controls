// Placeholder: a Task 7 substitui esta pagina pela area do cliente real.
import { getUsuarioAtual } from "@/services/auth";

export default async function AreaClientePage() {
  const usuario = await getUsuarioAtual();
  return (
    <div className="mx-auto max-w-3xl px-6 pt-32 pb-12">
      <h1 className="text-2xl font-bold text-marca-preto">
        <span data-testid="area-cliente-nome">{usuario?.nome}</span>
      </h1>
    </div>
  );
}
