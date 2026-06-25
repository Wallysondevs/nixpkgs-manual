import { useState } from "react";
import { Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MarkdownPage } from "@/components/MarkdownPage";
import Home from "@/pages/Home";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--nix-bg))" }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:ml-72">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-6 max-w-5xl mx-auto">
          <Switch hook={useHashLocation}>
            <Route path="/" component={Home} />
            <Route path="/preface">{() => <MarkdownPage path="preface.chapter.md" />}</Route>
            <Route path="/:a/:b/:c">{(p) => <MarkdownPage path={`${p.a}/${p.b}/${p.c}.section.md`} />}</Route>
            <Route path="/:section/:page">{(p) => <MarkdownPage path={`${p.section}/${p.page}.section.md`} />}</Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
