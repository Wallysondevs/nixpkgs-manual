import { ReactNode } from "react";
import { FlaskConical, CheckCircle2, Target } from "lucide-react";
import { Terminal } from "./Terminal";

interface PracticeBoxProps {
  title: string;
  goal?: string;
  steps?: string[];
  command?: string;
  expected?: string;
  verify?: string;
  children?: ReactNode;
}

export function PracticeBox({
  title,
  goal,
  steps,
  command,
  expected,
  verify,
  children,
}: PracticeBoxProps) {
  return (
    <div className="my-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-[hsl(var(--kali-magenta))]/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-primary/10 border-b border-primary/20">
        <FlaskConical className="w-5 h-5 text-primary" />
        <h4 className="font-bold text-foreground m-0 border-0 text-base">
          Pratique: {title}
        </h4>
      </div>

      <div className="p-5 space-y-4">
        {goal && (
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] uppercase font-bold text-primary mb-1 tracking-wider">
                Objetivo
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed m-0">
                {goal}
              </p>
            </div>
          </div>
        )}

        {steps && steps.length > 0 && (
          <div>
            <p className="text-[11px] uppercase font-bold text-primary mb-2 tracking-wider">
              Passo a passo
            </p>
            <ol className="text-sm text-foreground/90 space-y-1.5 list-decimal pl-5 m-0 marker:text-primary marker:font-bold">
              {steps.map((step, i) => (
                <li key={i} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {command && (
          <Terminal
            lines={[
              {
                cmd: command,
                out: expected,
                outType: expected ? "success" : "default",
              },
            ]}
          />
        )}

        {!command && expected && (
          <div>
            <p className="text-[11px] uppercase font-bold text-[hsl(var(--kali-green))] mb-1 tracking-wider">
              Saída esperada
            </p>
            <pre
              className="kali-scroll text-[13px] font-mono text-[hsl(var(--kali-green))] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed m-0 border border-white/5"
              style={{ background: "hsl(var(--kali-bg))" }}
            >
              {expected}
            </pre>
          </div>
        )}

        {verify && (
          <div className="flex items-start gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-xs text-green-500 leading-relaxed m-0">
              <strong>Como verificar: </strong>
              {verify}
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
