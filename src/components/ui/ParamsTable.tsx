interface Param {
  flag: string;
  desc: string;
  exemplo?: string;
}

interface ParamsTableProps {
  title?: string;
  params: Param[];
}

export function ParamsTable({ title = "Parâmetros e Flags", params }: ParamsTableProps) {
  return (
    <div className="my-6">
      <h3 className="text-base font-bold text-foreground mb-3 mt-0">{title}</h3>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] text-xs font-semibold bg-primary/10 text-primary border-b border-border">
          <div className="px-4 py-2">Flag / Parâmetro</div>
          <div className="px-4 py-2">Descrição em Português</div>
        </div>
        {params.map((p, i) => (
          <div
            key={i}
            className={`grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] border-b border-border last:border-0 ${
              i % 2 === 0 ? "bg-card" : "bg-muted/20"
            }`}
          >
            <div className="px-4 py-3 font-mono text-primary text-xs leading-relaxed self-start pt-3">
              {p.flag}
            </div>
            <div className="px-4 py-3 text-sm text-foreground/90 leading-relaxed">
              {p.desc}
              {p.exemplo && (
                <div className="mt-1">
                  <code className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                    ex: {p.exemplo}
                  </code>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
