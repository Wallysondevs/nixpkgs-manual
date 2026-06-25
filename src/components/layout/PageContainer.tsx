import { ReactNode, useEffect, useState } from "react";
import { DifficultyBadge } from "../ui/DifficultyBadge";
import { motion } from "framer-motion";
import { Clock4, Terminal } from "lucide-react";

interface PageContainerProps {
  title: string;
  subtitle?: string;
  difficulty?: "iniciante" | "intermediario" | "avancado";
  timeToRead?: string;
  /** Caminho exibido no "breadcrumb" terminal acima do título. */
  prompt?: string;
  children: ReactNode;
}

export function PageContainer({
  title,
  subtitle,
  difficulty,
  timeToRead,
  prompt,
  children,
}: PageContainerProps) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scroll = windowHeight > 0 ? totalScroll / windowHeight : 0;
      setScrollProgress(scroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div
        className="fixed top-0 left-0 h-[3px] z-50 transition-[width] duration-100 ease-out"
        style={{
          width: `${scrollProgress * 100}%`,
          background:
            "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--kali-magenta)) 100%)",
          boxShadow: "0 0 12px hsl(var(--primary) / 0.6)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Breadcrumb estilo terminal */}
        {prompt && (
          <div
            className="rounded-lg border border-white/5 mb-6 px-4 py-2 font-mono text-xs flex items-center gap-2"
            style={{ background: "hsl(var(--kali-bg-2))" }}
          >
            <Terminal className="w-3.5 h-3.5 text-[hsl(var(--kali-cyan))]/80" />
            <span className="text-[hsl(var(--kali-blue))]">~</span>
            <span className="text-[hsl(var(--kali-dim))]">/</span>
            <span className="text-[hsl(var(--kali-cyan))]">{prompt}</span>
            <span className="text-[hsl(var(--kali-magenta))] ml-auto">●</span>
          </div>
        )}

        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {difficulty && <DifficultyBadge level={difficulty} />}
            {timeToRead && (
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card">
                <Clock4 className="w-3 h-3" />
                {timeToRead} de leitura
              </span>
            )}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </header>

        <div className="prose prose-invert max-w-none">{children}</div>
      </motion.div>
    </div>
  );
}
