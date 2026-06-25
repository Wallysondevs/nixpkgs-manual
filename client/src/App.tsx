import { useState, useEffect, Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

const Home = lazy(() => import("@/pages/Home"));
const Historia = lazy(() => import("@/pages/Historia"));
const Instalacao = lazy(() => import("@/pages/Instalacao"));
const Interface = lazy(() => import("@/pages/Interface"));
const Terminal = lazy(() => import("@/pages/Terminal"));
const Filesystem = lazy(() => import("@/pages/Filesystem"));
const Permissoes = lazy(() => import("@/pages/Permissoes"));
const Pacotes = lazy(() => import("@/pages/Pacotes"));
const Usuarios = lazy(() => import("@/pages/Usuarios"));
const Servicos = lazy(() => import("@/pages/Servicos"));
const Redes = lazy(() => import("@/pages/Redes"));
const Nmap = lazy(() => import("@/pages/Nmap"));
const Wireshark = lazy(() => import("@/pages/Wireshark"));
const SSH = lazy(() => import("@/pages/SSH"));
const Burpsuite = lazy(() => import("@/pages/Burpsuite"));
const Sqlmap = lazy(() => import("@/pages/Sqlmap"));
const Nikto = lazy(() => import("@/pages/Nikto"));
const Gobuster = lazy(() => import("@/pages/Gobuster"));
const Hydra = lazy(() => import("@/pages/Hydra"));
const John = lazy(() => import("@/pages/John"));
const Hashcat = lazy(() => import("@/pages/Hashcat"));
const Metasploit = lazy(() => import("@/pages/Metasploit"));
const Msfvenom = lazy(() => import("@/pages/Msfvenom"));
const Aircrack = lazy(() => import("@/pages/Aircrack"));
const Wifiphisher = lazy(() => import("@/pages/Wifiphisher"));
const Proxychains = lazy(() => import("@/pages/Proxychains"));
const Tor = lazy(() => import("@/pages/Tor"));
const Forense = lazy(() => import("@/pages/Forense"));
const CTF = lazy(() => import("@/pages/CTF"));
const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Referencias = lazy(() => import("@/pages/Referencias"));
const OSINT = lazy(() => import("@/pages/OSINT"));
const TheHarvester = lazy(() => import("@/pages/TheHarvester"));
const Shodan = lazy(() => import("@/pages/Shodan"));
const GoogleDorks = lazy(() => import("@/pages/GoogleDorks"));
const ReconNg = lazy(() => import("@/pages/ReconNg"));
const Maltego = lazy(() => import("@/pages/Maltego"));
const Dnsenum = lazy(() => import("@/pages/Dnsenum"));
const Masscan = lazy(() => import("@/pages/Masscan"));
const Netcat = lazy(() => import("@/pages/Netcat"));
const Enum4linux = lazy(() => import("@/pages/Enum4linux"));
const Whatweb = lazy(() => import("@/pages/Whatweb"));
const OwaspTop10 = lazy(() => import("@/pages/OwaspTop10"));
const XSSManual = lazy(() => import("@/pages/XSSManual"));
const LfiRfi = lazy(() => import("@/pages/LfiRfi"));
const BeEF = lazy(() => import("@/pages/BeEF"));
const ZapProxy = lazy(() => import("@/pages/ZapProxy"));
const Crunch = lazy(() => import("@/pages/Crunch"));
const CVEResearch = lazy(() => import("@/pages/CVEResearch"));
const PrivescLinux = lazy(() => import("@/pages/PrivescLinux"));
const PrivescWindows = lazy(() => import("@/pages/PrivescWindows"));
const Searchsploit = lazy(() => import("@/pages/Searchsploit"));
const PostExploracao = lazy(() => import("@/pages/PostExploracao"));
const SET = lazy(() => import("@/pages/SET"));
const BufferOverflow = lazy(() => import("@/pages/BufferOverflow"));
const Reaver = lazy(() => import("@/pages/Reaver"));
const ARPSpoofing = lazy(() => import("@/pages/ARPSpoofing"));
const Ettercap = lazy(() => import("@/pages/Ettercap"));
const Responder = lazy(() => import("@/pages/Responder"));
const BloodHound = lazy(() => import("@/pages/BloodHound"));
const Impacket = lazy(() => import("@/pages/Impacket"));
const Kerberoasting = lazy(() => import("@/pages/Kerberoasting"));
const SSHTunneling = lazy(() => import("@/pages/SSHTunneling"));
const Volatility = lazy(() => import("@/pages/Volatility"));
const Steganografia = lazy(() => import("@/pages/Steganografia"));
const Autopsy = lazy(() => import("@/pages/Autopsy"));
const BashPentest = lazy(() => import("@/pages/BashPentest"));
const PythonHacking = lazy(() => import("@/pages/PythonHacking"));
const NetHunter = lazy(() => import("@/pages/NetHunter"));
const DockerKali = lazy(() => import("@/pages/DockerKali"));
const Metodologia = lazy(() => import("@/pages/Metodologia"));
const BugBounty = lazy(() => import("@/pages/BugBounty"));
const OpenVAS = lazy(() => import("@/pages/OpenVAS"));
const SSRF = lazy(() => import("@/pages/SSRF"));
const CSRF = lazy(() => import("@/pages/CSRF"));
const CommandInjection = lazy(() => import("@/pages/CommandInjection"));
const WebShells = lazy(() => import("@/pages/WebShells"));
const APIPentest = lazy(() => import("@/pages/APIPentest"));
const CloudPentest = lazy(() => import("@/pages/CloudPentest"));
const MobilePentest = lazy(() => import("@/pages/MobilePentest"));
const CrackMapExec = lazy(() => import("@/pages/CrackMapExec"));
const Seclists = lazy(() => import("@/pages/Seclists"));
const PayloadObfuscation = lazy(() => import("@/pages/PayloadObfuscation"));
const AntiForense = lazy(() => import("@/pages/AntiForense"));
const Phishing = lazy(() => import("@/pages/Phishing"));
const Deserialization = lazy(() => import("@/pages/Deserialization"));
const PowershellPentest = lazy(() => import("@/pages/PowershellPentest"));
const ReverseEngineering = lazy(() => import("@/pages/ReverseEngineering"));
const WirelessBluetooth = lazy(() => import("@/pages/WirelessBluetooth"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient();

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location] = useHashLocation();
  useEffect(() => {
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 transition-all duration-300">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1">
          <Suspense fallback={<Loading />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/historia" component={Historia} />
        <Route path="/instalacao" component={Instalacao} />
        <Route path="/interface" component={Interface} />
        <Route path="/terminal" component={Terminal} />
        <Route path="/filesystem" component={Filesystem} />
        <Route path="/permissoes" component={Permissoes} />
        <Route path="/pacotes" component={Pacotes} />
        <Route path="/usuarios" component={Usuarios} />
        <Route path="/servicos" component={Servicos} />
        <Route path="/redes" component={Redes} />
        <Route path="/nmap" component={Nmap} />
        <Route path="/wireshark" component={Wireshark} />
        <Route path="/ssh" component={SSH} />
        <Route path="/burpsuite" component={Burpsuite} />
        <Route path="/sqlmap" component={Sqlmap} />
        <Route path="/nikto" component={Nikto} />
        <Route path="/gobuster" component={Gobuster} />
        <Route path="/hydra" component={Hydra} />
        <Route path="/john" component={John} />
        <Route path="/hashcat" component={Hashcat} />
        <Route path="/metasploit" component={Metasploit} />
        <Route path="/msfvenom" component={Msfvenom} />
        <Route path="/aircrack" component={Aircrack} />
        <Route path="/wifiphisher" component={Wifiphisher} />
        <Route path="/proxychains" component={Proxychains} />
        <Route path="/tor" component={Tor} />
        <Route path="/forense" component={Forense} />
        <Route path="/ctf" component={CTF} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/referencias" component={Referencias} />
        <Route path="/osint" component={OSINT} />
        <Route path="/theharvester" component={TheHarvester} />
        <Route path="/shodan" component={Shodan} />
        <Route path="/google-dorks" component={GoogleDorks} />
        <Route path="/recon-ng" component={ReconNg} />
        <Route path="/maltego" component={Maltego} />
        <Route path="/dnsenum" component={Dnsenum} />
        <Route path="/masscan" component={Masscan} />
        <Route path="/netcat" component={Netcat} />
        <Route path="/enum4linux" component={Enum4linux} />
        <Route path="/whatweb" component={Whatweb} />
        <Route path="/owasp-top10" component={OwaspTop10} />
        <Route path="/xss" component={XSSManual} />
        <Route path="/lfi-rfi" component={LfiRfi} />
        <Route path="/beef" component={BeEF} />
        <Route path="/zap" component={ZapProxy} />
        <Route path="/crunch" component={Crunch} />
        <Route path="/cve" component={CVEResearch} />
        <Route path="/privesc-linux" component={PrivescLinux} />
        <Route path="/privesc-windows" component={PrivescWindows} />
        <Route path="/searchsploit" component={Searchsploit} />
        <Route path="/pos-exploracao" component={PostExploracao} />
        <Route path="/set" component={SET} />
        <Route path="/buffer-overflow" component={BufferOverflow} />
        <Route path="/reaver" component={Reaver} />
        <Route path="/arp-spoofing" component={ARPSpoofing} />
        <Route path="/ettercap" component={Ettercap} />
        <Route path="/responder" component={Responder} />
        <Route path="/bloodhound" component={BloodHound} />
        <Route path="/impacket" component={Impacket} />
        <Route path="/kerberoasting" component={Kerberoasting} />
        <Route path="/ssh-tunneling" component={SSHTunneling} />
        <Route path="/volatility" component={Volatility} />
        <Route path="/steganografia" component={Steganografia} />
        <Route path="/autopsy" component={Autopsy} />
        <Route path="/bash-pentest" component={BashPentest} />
        <Route path="/python-hacking" component={PythonHacking} />
        <Route path="/nethunter" component={NetHunter} />
        <Route path="/docker-kali" component={DockerKali} />
        <Route path="/metodologia" component={Metodologia} />
        <Route path="/bug-bounty" component={BugBounty} />
        <Route path="/openvas" component={OpenVAS} />
        <Route path="/ssrf" component={SSRF} />
        <Route path="/csrf" component={CSRF} />
        <Route path="/command-injection" component={CommandInjection} />
        <Route path="/webshells" component={WebShells} />
        <Route path="/api-pentest" component={APIPentest} />
        <Route path="/cloud-pentest" component={CloudPentest} />
        <Route path="/mobile-pentest" component={MobilePentest} />
        <Route path="/crackmapexec" component={CrackMapExec} />
        <Route path="/seclists" component={Seclists} />
        <Route path="/payload-obfuscation" component={PayloadObfuscation} />
        <Route path="/anti-forense" component={AntiForense} />
        <Route path="/phishing" component={Phishing} />
        <Route path="/deserialization" component={Deserialization} />
        <Route path="/powershell-pentest" component={PowershellPentest} />
        <Route path="/reverse-engineering" component={ReverseEngineering} />
        <Route path="/bluetooth" component={WirelessBluetooth} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter hook={useHashLocation}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
