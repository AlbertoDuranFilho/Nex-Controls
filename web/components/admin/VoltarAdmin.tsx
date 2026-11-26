import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Link de volta no topo das páginas de formulário e detalhe (mesmo visual da área do cliente).
export default function VoltarAdmin({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-marca-cinza-600 hover:text-marca-preto focus-visible:ring-2 focus-visible:ring-marca-preto focus-visible:outline-none"
    >
      <ArrowLeft
        aria-hidden
        className="size-4 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
      {children}
    </Link>
  );
}
