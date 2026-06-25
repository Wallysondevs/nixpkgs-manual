export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[hsl(var(--nix-blue))] mb-4">Nixpkgs Manual 26.05</h1>
        <p className="text-lg text-[hsl(var(--nix-dim))]">Manual oficial do Nixpkgs traduzido para PT-BR</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <a href="#/stdenv/stdenv" className="block p-6 rounded-lg border border-[hsl(var(--nix-blue))]/20 bg-[hsl(var(--nix-bg-2))] hover:border-[hsl(var(--nix-blue))]/50 transition-colors">
          <h3 className="font-mono font-bold text-[hsl(var(--nix-blue))] mb-2">stdenv</h3>
          <p className="text-sm text-[hsl(var(--nix-dim))]">O ambiente padrão de build: fases, hooks, derivations, mkDerivation.</p>
        </a>
        <a href="#/languages-frameworks/python" className="block p-6 rounded-lg border border-[hsl(var(--nix-blue))]/20 bg-[hsl(var(--nix-bg-2))] hover:border-[hsl(var(--nix-blue))]/50 transition-colors">
          <h3 className="font-mono font-bold text-[hsl(var(--nix-blue))] mb-2">Linguagens</h3>
          <p className="text-sm text-[hsl(var(--nix-dim))]">Python, Rust, Go, JS, Haskell, Java, .NET, Ruby e mais.</p>
        </a>
        <a href="#/build-helpers/fetchers" className="block p-6 rounded-lg border border-[hsl(var(--nix-blue))]/20 bg-[hsl(var(--nix-bg-2))] hover:border-[hsl(var(--nix-blue))]/50 transition-colors">
          <h3 className="font-mono font-bold text-[hsl(var(--nix-blue))] mb-2">Build Helpers</h3>
          <p className="text-sm text-[hsl(var(--nix-dim))]">Fetchers, Docker tools, testers, trivial builders, mkShell.</p>
        </a>
        <a href="#/using/overlays" className="block p-6 rounded-lg border border-[hsl(var(--nix-blue))]/20 bg-[hsl(var(--nix-bg-2))] hover:border-[hsl(var(--nix-blue))]/50 transition-colors">
          <h3 className="font-mono font-bold text-[hsl(var(--nix-blue))] mb-2">Usando Nixpkgs</h3>
          <p className="text-sm text-[hsl(var(--nix-dim))]">Configuração, overlays, overrides, plataformas.</p>
        </a>
      </div>
      <div className="p-4 rounded-lg border border-[hsl(var(--nix-purple))]/20 bg-[hsl(var(--nix-bg-2))]">
        <p className="text-xs text-[hsl(var(--nix-dim))] mt-2">192 capítulos traduzidos do Nixpkgs Manual oficial via Vertex AI (Gemini 2.5 Flash)</p>
      </div>
    </div>
  );
}
