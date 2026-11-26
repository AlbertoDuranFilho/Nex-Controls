import { Bloco, EsqueletoCartoes } from "@/components/ui/Esqueleto";

export default function Loading() {
  return (
    <div className="pt-24">
      <div className="border-b border-marca-cinza-200 bg-marca-cinza-50">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 md:py-10">
          <Bloco className="h-4 w-40" />
          <Bloco className="h-9 w-56" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 sm:px-6 md:pt-8">
        <EsqueletoCartoes />
      </div>
    </div>
  );
}
