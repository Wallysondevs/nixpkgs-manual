import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[hsl(var(--nix-blue))]/10 px-4 py-3 lg:hidden" style={{ background: "hsl(var(--nix-bg-2))" }}>
      <button onClick={onMenuClick} className="p-2 rounded hover:bg-white/10" aria-label="Menu">
        <Menu className="w-5 h-5 text-[hsl(var(--nix-fg))]" />
      </button>
    </header>
  );
}
