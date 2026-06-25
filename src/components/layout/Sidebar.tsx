import { Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { cn } from "@/lib/utils";
import { BookOpen, Terminal, Package, Layers, Code, Settings, Wrench, FileText, ChevronRight, Dot, X, Cpu, Globe, Box } from "lucide-react";

const NAV = [
  { title: "Início", items: [
    { path: "/", label: "Bem-vindo", icon: BookOpen },
    { path: "/preface", label: "Prefácio", icon: FileText },
  ]},
  { title: "Usando Nixpkgs", items: [
    { path: "/using/configuration", label: "Configuração", icon: Settings },
    { path: "/using/overlays", label: "Overlays", icon: Layers },
    { path: "/using/overrides", label: "Overrides", icon: Wrench },
    { path: "/using/platform-support", label: "Suporte a Plataformas", icon: Cpu },
  ]},
  { title: "stdenv", items: [
    { path: "/stdenv/stdenv", label: "stdenv (Completo)", icon: Terminal },
    { path: "/stdenv/cross-compilation", label: "Cross-Compilation", icon: Cpu },
    { path: "/stdenv/meta", label: "Meta-atributos", icon: FileText },
    { path: "/stdenv/multiple-output", label: "Múltiplas Saídas", icon: Layers },
    { path: "/stdenv/passthru", label: "Passthru", icon: Package },
    { path: "/stdenv/platform-notes", label: "Notas de Plataforma", icon: Globe },
  ]},
  { title: "Build Helpers", items: [
    { path: "/build-helpers/fetchers", label: "Fetchers", icon: Globe },
    { path: "/build-helpers/trivial-build-helpers", label: "Trivial Builders", icon: Box },
    { path: "/build-helpers/testers", label: "Testers", icon: Wrench },
    { path: "/build-helpers/dev-shell-tools", label: "Dev Shell Tools", icon: Terminal },
    { path: "/build-helpers/images/dockertools", label: "Docker Tools", icon: Box },
    { path: "/build-helpers/images/appimagetools", label: "AppImage Tools", icon: Package },
    { path: "/build-helpers/special/mkshell", label: "mkShell", icon: Terminal },
    { path: "/build-helpers/special/fhs-environments", label: "FHS Environments", icon: Layers },
  ]},
  { title: "Hooks", items: [
    { path: "/hooks/index", label: "Visão Geral", icon: Wrench },
    { path: "/hooks/cmake", label: "CMake", icon: Code },
    { path: "/hooks/meson", label: "Meson", icon: Code },
    { path: "/hooks/autopatchelf", label: "autoPatchelf", icon: Wrench },
    { path: "/hooks/python", label: "Python", icon: Code },
    { path: "/hooks/perl", label: "Perl", icon: Code },
    { path: "/hooks/zig", label: "Zig", icon: Code },
    { path: "/hooks/tauri", label: "Tauri", icon: Code },
  ]},
  { title: "Linguagens", items: [
    { path: "/languages-frameworks/python", label: "Python", icon: Code },
    { path: "/languages-frameworks/rust", label: "Rust", icon: Code },
    { path: "/languages-frameworks/go", label: "Go", icon: Code },
    { path: "/languages-frameworks/javascript", label: "JavaScript/Node", icon: Code },
    { path: "/languages-frameworks/haskell", label: "Haskell", icon: Code },
    { path: "/languages-frameworks/java", label: "Java", icon: Code },
    { path: "/languages-frameworks/dotnet", label: ".NET", icon: Code },
    { path: "/languages-frameworks/ruby", label: "Ruby", icon: Code },
    { path: "/languages-frameworks/php", label: "PHP", icon: Code },
    { path: "/languages-frameworks/dart", label: "Dart", icon: Code },
    { path: "/languages-frameworks/lua", label: "Lua", icon: Code },
    { path: "/languages-frameworks/ocaml", label: "OCaml", icon: Code },
    { path: "/languages-frameworks/qt", label: "Qt", icon: Code },
    { path: "/languages-frameworks/cuda", label: "CUDA", icon: Cpu },
    { path: "/languages-frameworks/gnome", label: "GNOME", icon: Globe },
    { path: "/languages-frameworks/index", label: "Todas as Linguagens", icon: FileText },
  ]},
  { title: "Funções & Lib", items: [
    { path: "/functions/generators", label: "Generators", icon: Code },
    { path: "/functions/debug", label: "Debug", icon: Wrench },
    { path: "/functions/nix-gitignore", label: "nix-gitignore", icon: FileText },
    { path: "/module-system/module-system", label: "Module System", icon: Layers },
  ]},
  { title: "Contribuindo", items: [
    { path: "/contributing/quick-start", label: "Quick Start", icon: Terminal },
    { path: "/contributing/coding-conventions", label: "Convenções", icon: FileText },
    { path: "/contributing/submitting-changes", label: "Submitting Changes", icon: Globe },
    { path: "/contributing/reviewing-contributions", label: "Reviewing", icon: Wrench },
  ]},
];

interface SidebarProps { isOpen: boolean; setIsOpen: (o: boolean) => void; }

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useHashLocation();
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      <aside className={cn("fixed left-0 top-0 h-full w-72 z-50 overflow-y-auto transition-transform duration-300 border-r border-[hsl(var(--nix-blue))]/15", isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")} style={{ background: "hsl(var(--nix-bg))" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 z-10" style={{ background: "hsl(var(--nix-bg-2))" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"/><div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"/><div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"/></div>
            <div className="min-w-0"><h1 className="font-mono font-bold text-sm leading-tight text-[hsl(var(--nix-blue))]">Nixpkgs Manual</h1><p className="text-[10px] text-[hsl(var(--nix-dim))] font-mono leading-tight">26.05 — PT-BR</p></div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 rounded text-gray-400 hover:text-white hover:bg-white/10" aria-label="Fechar"><X className="w-4 h-4"/></button>
        </div>
        <nav className="p-3 space-y-5 pb-8">
          {NAV.map((section, i) => (
            <div key={section.title}>
              <h2 className="text-[10px] font-mono font-semibold text-[hsl(var(--nix-blue))]/80 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5"><span className="text-[hsl(var(--nix-purple))]">[{String(i+1).padStart(2,"0")}]</span>{section.title}</h2>
              <ul className="space-y-0.5">{section.items.map(item => { const active = location === item.path; const Icon = item.icon; return (
                <li key={item.path}><Link href={item.path}><a className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-mono transition-colors", active ? "bg-[hsl(var(--nix-blue))]/15 text-[hsl(var(--nix-blue))] font-semibold" : "text-[hsl(var(--nix-fg))]/75 hover:text-[hsl(var(--nix-blue))] hover:bg-white/5")} onClick={() => setIsOpen(false)}>{active ? <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--nix-purple))]"/> : <Dot className="w-3.5 h-3.5 flex-shrink-0 text-[hsl(var(--nix-dim))]"/>}<Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80"/><span className="flex-1 leading-tight truncate">{item.label}</span></a></Link></li>
              )})}</ul>
            </div>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-white/5 font-mono text-[10px] sticky bottom-0" style={{ background: "hsl(var(--nix-bg-2))" }}>
          <p className="text-[hsl(var(--nix-dim))] m-0"><span className="text-[hsl(var(--nix-green))]">●</span> 192 capítulos traduzidos</p>
          <p className="text-[hsl(var(--nix-dim))] m-0"><span className="text-[hsl(var(--nix-blue))]">$</span> Nixpkgs Manual Oficial PT-BR</p>
        </div>
      </aside>
    </>
  );
}
