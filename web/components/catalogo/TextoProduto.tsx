// Texto simples: parágrafos separados por linha em branco; blocos cujas linhas
// começam com "- " viram lista. Nunca interpreta HTML (React escapa o conteúdo).
export default function TextoProduto({ texto }: { texto: string | null }) {
  if (!texto) return null;
  const blocos = texto
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocos.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split("\n").map((l) => l.trim());
        if (linhas.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {linhas.map((l, j) => (
                <li key={j}>{l.slice(2).trim()}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{bloco}</p>;
      })}
    </div>
  );
}
