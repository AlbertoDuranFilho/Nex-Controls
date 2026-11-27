import { Search } from "lucide-react";
import Botao from "@/components/ui/Botao";

// Busca por texto (GET): campo com lupa dentro de um cartão. Rótulo e botão "Buscar" mantidos.
export default function BuscaAdmin({ termo, placeholder }: { termo: string; placeholder: string }) {
  return (
    <form
      method="get"
      className="mb-6 flex flex-col gap-2 rounded-2xl border border-marca-cinza-200 bg-marca-branco p-3 shadow-suave sm:flex-row"
    >
      <label htmlFor="busca" className="sr-only">
        Buscar
      </label>
      <div className="relative flex-1">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-marca-cinza-400" />
        <input
          id="busca"
          name="busca"
          type="search"
          defaultValue={termo}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-marca-cinza-300 bg-marca-branco pr-3 pl-10 text-sm text-marca-preto outline-none transition-colors placeholder:text-marca-cinza-400 focus-visible:border-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto motion-reduce:transition-none"
        />
      </div>
      <Botao type="submit" variante="secundario">
        Buscar
      </Botao>
    </form>
  );
}
