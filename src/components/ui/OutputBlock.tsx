import { ReactNode } from "react";

interface OutputBlockProps {
  /** Tipo da saída — controla a cor. */
  type?: "default" | "success" | "warning" | "error" | "info" | "muted";
  /** Título opcional acima da saída. */
  label?: string;
  children: ReactNode;
}

const colors = {
  default: "text-[hsl(var(--kali-fg))]",
  success: "text-[hsl(var(--kali-green))]",
  warning: "text-[hsl(var(--kali-yellow))]",
  error: "text-[hsl(var(--kali-red))]",
  info: "text-[hsl(var(--kali-cyan))]",
  muted: "text-[hsl(var(--kali-dim))]",
};

/** Bloco de saída sem prompt — só o output cru, com cor temática. */
export function OutputBlock({ type = "default", label, children }: OutputBlockProps) {
  return (
    <div
      className="my-4 rounded-lg border border-white/5 overflow-hidden"
      style={{ background: "hsl(var(--kali-bg))" }}
    >
      {label && (
        <div
          className="px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[hsl(var(--kali-cyan))] border-b border-white/5"
          style={{ background: "hsl(var(--kali-bg-2))" }}
        >
          {label}
        </div>
      )}
      <pre
        className={`kali-scroll m-0 px-4 py-3 text-[13px] font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto ${colors[type]}`}
      >
        {children}
      </pre>
    </div>
  );
}
