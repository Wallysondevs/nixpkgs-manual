import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export function MarkdownPage({ path }: { path: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    setLoading(true);
    const tryPaths = [
      `${base}docs/${path}`,
      `${base}docs/${path.replace(".section.md", ".chapter.md")}`,
      `${base}docs/${path.replace(".section.md", ".md")}`,
    ];
    const tryNext = (i: number) => {
      if (i >= tryPaths.length) { setContent("# Página não encontrada"); setLoading(false); return; }
      fetch(tryPaths[i]).then(r => r.ok ? r.text().then(t => { setContent(t); setLoading(false); }) : tryNext(i + 1)).catch(() => tryNext(i + 1));
    };
    tryNext(0);
  }, [path, base]);

  if (loading) return <div className="animate-pulse text-[hsl(var(--nix-dim))]">Carregando...</div>;
  return <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown></div>;
}
