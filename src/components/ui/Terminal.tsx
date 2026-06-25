import { ReactNode, useState } from "react";
import { Check, Copy, TerminalSquare } from "lucide-react";

export interface TerminalLine {
  /** Prompt user shown before the command. Default: "wallyson" */
  user?: string;
  /** Prompt host shown after the user. Default: "kali" */
  host?: string;
  /** Path between brackets. Default: "~" */
  path?: string;
  /** Command typed by the user. */
  cmd: string;
  /** Output returned by the command (multiline). */
  out?: ReactNode;
  /** Visual color of the output. */
  outType?: "default" | "success" | "warning" | "error" | "info" | "muted";
  /** If true, this entry has no command (e.g. just a banner / output). */
  noPrompt?: boolean;
  /** Optional comment shown above the command, in green. */
  comment?: string;
}

export interface TerminalProps {
  title?: string;
  /** Default user for all lines that don't override. */
  user?: string;
  /** Default host for all lines that don't override. */
  host?: string;
  /** Default path for all lines that don't override. */
  path?: string;
  lines: TerminalLine[];
  /** Show a fake top blinking cursor at the end. */
  showCursor?: boolean;
  /** Compact mode (less padding). */
  compact?: boolean;
}

const outColor: Record<NonNullable<TerminalLine["outType"]>, string> = {
  default: "text-[hsl(var(--kali-fg))]",
  success: "text-[hsl(var(--kali-green))]",
  warning: "text-[hsl(var(--kali-yellow))]",
  error: "text-[hsl(var(--kali-red))]",
  info: "text-[hsl(var(--kali-cyan))]",
  muted: "text-[hsl(var(--kali-dim))]",
};

/**
 * Terminal estilo Kali Linux. Renderiza prompt completo:
 *   ┌──(user㉿host)-[path]
 *   └─$ comando
 *   <saída>
 *
 * Use para mostrar comandos com saída realista. Para apenas mostrar código
 * de um arquivo (sem execução), use <CodeBlock />.
 */
export function Terminal({
  title,
  user = "wallyson",
  host = "kali",
  path = "~",
  lines,
  showCursor = true,
  compact = false,
}: TerminalProps) {
  const [copied, setCopied] = useState(false);

  const allCommands = lines
    .filter((l) => !l.noPrompt)
    .map((l) => l.cmd)
    .join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(allCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="my-6 rounded-xl overflow-hidden border border-[hsl(var(--kali-cyan))]/25 shadow-[0_8px_32px_-8px_hsl(var(--kali-cyan)/0.25)]"
      style={{ background: "hsl(var(--kali-bg))" }}
    >
      {/* Title bar — janela do terminal */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-white/5"
        style={{ background: "hsl(var(--kali-bg-2))" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <TerminalSquare className="w-3.5 h-3.5 opacity-70" />
            <span>{title ?? `${user}@${host}: ${path}`}</span>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Copiar comandos"
          aria-label="Copiar comandos"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[hsl(var(--kali-green))]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Conteúdo do terminal */}
      <div
        className={`kali-scroll kali-scanlines font-mono text-[13px] leading-relaxed overflow-x-auto ${
          compact ? "p-3" : "p-4"
        }`}
        style={{ color: "hsl(var(--kali-fg))" }}
      >
        {lines.map((line, idx) => {
          const u = line.user ?? user;
          const h = line.host ?? host;
          const p = line.path ?? path;
          const color = outColor[line.outType ?? "default"];
          const isLast = idx === lines.length - 1;

          return (
            <div key={idx} className={idx === 0 ? "" : "mt-3"}>
              {line.comment && (
                <div className="text-[hsl(var(--kali-dim))] italic">
                  # {line.comment}
                </div>
              )}

              {!line.noPrompt && (
                <>
                  <div className="whitespace-pre">
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      ┌──(
                    </span>
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      {u}
                    </span>
                    <span className="text-[hsl(var(--kali-magenta))]">㉿</span>
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      {h}
                    </span>
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      )-[
                    </span>
                    <span className="text-[hsl(var(--kali-cyan))]">{p}</span>
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      ]
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap break-all">
                    <span className="text-[hsl(var(--kali-blue))] font-semibold">
                      └─
                    </span>
                    <span className="text-[hsl(var(--kali-magenta))] font-semibold">
                      $
                    </span>{" "}
                    <span className="text-[hsl(var(--kali-fg))] font-semibold">
                      {line.cmd}
                    </span>
                    {showCursor && isLast && !line.out && (
                      <span className="kali-cursor" />
                    )}
                  </div>
                </>
              )}

              {line.out && (
                <pre
                  className={`whitespace-pre-wrap break-words m-0 mt-1 ${color}`}
                  style={{ fontFamily: "inherit" }}
                >
                  {line.out}
                </pre>
              )}
            </div>
          );
        })}

        {showCursor && lines.length === 0 && (
          <div>
            <span className="text-[hsl(var(--kali-blue))]">┌──(</span>
            <span className="text-[hsl(var(--kali-blue))]">{user}</span>
            <span className="text-[hsl(var(--kali-magenta))]">㉿</span>
            <span className="text-[hsl(var(--kali-blue))]">{host}</span>
            <span className="text-[hsl(var(--kali-blue))]">)-[</span>
            <span className="text-[hsl(var(--kali-cyan))]">{path}</span>
            <span className="text-[hsl(var(--kali-blue))]">]</span>
            <br />
            <span className="text-[hsl(var(--kali-blue))]">└─</span>
            <span className="text-[hsl(var(--kali-magenta))]">$</span>
            <span className="kali-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
