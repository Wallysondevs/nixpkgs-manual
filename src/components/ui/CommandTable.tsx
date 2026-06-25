interface Variation {
  /** Comando ou flag (ex: "nmap -sV", "--script vuln"). */
  cmd: string;
  /** Descrição curta do que faz. */
  desc: string;
  /** Saída/efeito esperado. Pode ser multiline. */
  output?: string;
}

interface CommandTableProps {
  title?: string;
  variations: Variation[];
}

/**
 * Tabela tipo "página de manual": comando | descrição | saída.
 * Usado para listar todas as variações de um comando de forma compacta
 * mas detalhada, com a saída de cada uma já visível.
 */
export function CommandTable({ title = "Variações do comando", variations }: CommandTableProps) {
  return (
    <div className="my-6">
      <h3 className="text-base font-bold text-foreground mb-3 mt-0 border-0 flex items-center gap-2">
        <span className="text-primary font-mono">[ man ]</span> {title}
      </h3>
      <div
        className="rounded-xl overflow-hidden border border-white/5"
        style={{ background: "hsl(var(--kali-bg))" }}
      >
        {variations.map((v, i) => (
          <div
            key={i}
            className={`border-b border-white/5 last:border-0 ${
              i % 2 === 0 ? "" : "bg-white/[0.015]"
            }`}
          >
            <div className="px-4 pt-3 pb-1 flex items-start gap-3 flex-wrap">
              <code className="font-mono text-[13px] text-[hsl(var(--kali-green))] bg-black/30 px-2 py-0.5 rounded shrink-0">
                {v.cmd}
              </code>
              <p className="text-sm text-[hsl(var(--kali-fg))]/80 m-0 flex-1 min-w-[200px]">
                {v.desc}
              </p>
            </div>
            {v.output && (
              <pre className="kali-scroll px-4 pb-3 pt-1 m-0 text-xs font-mono text-[hsl(var(--kali-cyan))]/85 whitespace-pre-wrap break-words overflow-x-auto">
                <span className="text-[hsl(var(--kali-dim))]">↳ saída: </span>
                {v.output}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
