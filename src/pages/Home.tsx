import { useLanguage } from "@/contexts/LanguageContext";
import { manifestoContent } from "@/data/manifesto";
import { Typewriter } from "@/components/Typewriter";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal as TerminalIcon, Github, Linkedin } from "lucide-react";

const XIcon = ({ className }: { className?: string }) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className={className}>
    <title>X</title>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);
import heroImg from "@/assets/hero_network.jpg";
import boxImg from "@/assets/breaking_black_box.jpg";
import handImg from "@/assets/human_ai_symbiosis.jpg";

type ManifestoItem = {
  id?: string;
  heading?: string;
  target?: string;
  content: string;
};

/** Renders `**bold**` segments in plain text as <strong> elements. */
function renderBold(text: string) {
  return text.split("**").map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-foreground font-bold">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

/** Renders `[text](url)` links and `**bold**` segments in plain text. */
function renderInline(text: string) {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{renderBold(part)}</span>;
  });
}

export default function Home() {
  const { language } = useLanguage();
  const content = manifestoContent[language];
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(manifestoContent.meta.shareText[language])}&hashtags=OpenSourceWin`;

  return (
    <div className="min-h-screen font-mono selection:bg-primary selection:text-black">
      <Navbar />

      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-8 py-24 overflow-hidden border-b border-border">
        {/* Background Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroImg}
            alt="Open Source Network"
            width={1376}
            height={768}
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background/90" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        </div>

        <div className="relative z-10 max-w-4xl w-full space-y-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            System Broadcast
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-tight">
            <span className="text-primary block mb-2 text-xl sm:text-2xl md:text-3xl opacity-80 font-normal">
              ./manifesto --init
            </span>
            {content.title.map((line, i) => (
              <span
                key={i}
                className={
                  i === 0
                    ? "block text-primary text-xl sm:text-2xl md:text-3xl lg:text-4xl opacity-90 font-normal tracking-tight mb-1"
                    : "block"
                }
              >
                {line}
              </span>
            ))}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl border-l-2 border-primary/50 pl-6 italic">
            {content.subtitle}
          </p>
          
          <div className="pt-8 flex flex-col sm:flex-row gap-4">
             <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-none border border-transparent hover:border-primary/50">
               <a
                 href="#manifesto"
                 onClick={(e) => {
                   e.preventDefault();
                   document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' });
                 }}
               >
                 {language === 'en' ? 'Read Manifesto' : '阅读宣言'} <ArrowRight className="ml-2" />
               </a>
             </Button>
          </div>
        </div>
      </header>

      {/* Intro Section */}
      <section id="manifesto" className="py-24 px-6 border-b border-border bg-card/30 relative scroll-mt-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-lg leading-relaxed">
             <p className="font-bold text-2xl text-foreground/90">
               {content.intro.bold}
             </p>
             {content.intro.text.map((p, i) => (
               <p key={i} className="text-muted-foreground">{renderInline(p)}</p>
             ))}
             <div className="text-3xl font-bold text-primary pt-4 tracking-tight">
               <Typewriter text={content.intro.highlight} speed={50} startDelay={1000} />
             </div>
          </div>
          <div className="relative group perspective-1000">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
             <div className="relative aspect-square overflow-hidden border border-border bg-black">
               <img
                 src={boxImg}
                 alt="Breaking Black Box"
                 width={1024}
                 height={1024}
                 loading="lazy"
                 className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700"
               />
               <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur border border-primary/20 p-3 text-xs text-primary font-mono">
                 <div className="flex justify-between mb-1">
                   <span>STATUS:</span>
                   <span>DECRYPTING...</span>
                 </div>
                 <div className="h-1 bg-primary/20 w-full overflow-hidden">
                   <div className="h-full bg-primary w-[65%] animate-pulse"></div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="max-w-5xl mx-auto py-24 px-6 space-y-32">
        {content.sections.map((section, idx) => (
          <section key={idx} className="relative">
            <div className="absolute -left-12 top-0 text-9xl font-bold text-border/10 select-none -z-10">
              0{idx + 1}
            </div>
            
            <h2 className="text-4xl font-bold mb-12 flex items-center">
              <span className="text-primary mr-4 text-2xl">#</span>
              {section.title}
            </h2>

            {section.intro && (
              <p className="text-xl text-foreground/80 mb-12 max-w-3xl">
                {renderBold(section.intro)}
              </p>
            )}

            <div className="grid gap-12">
              {section.items?.map((item: ManifestoItem, itemIdx: number) => (
                <div key={itemIdx} className="group grid md:grid-cols-[1fr_3fr] gap-6 p-6 border border-border/50 hover:border-primary/50 transition-colors bg-card/20 hover:bg-card/40">
                  <div className="space-y-2">
                    {item.heading && (
                      <h3 className="text-xl font-bold text-primary group-hover:text-primary/80 transition-colors">
                        {item.heading}
                      </h3>
                    )}
                    {item.target && (
                       <h3 className="text-xl font-bold text-secondary-foreground group-hover:text-primary transition-colors">
                        &gt; {item.target}
                      </h3>
                    )}
                    {item.id && <span className="text-xs text-muted-foreground font-mono">ID: {item.id}</span>}
                  </div>
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Break for Section 2 (Human AI) */}
            {idx === 0 && (
              <div className="mt-24 relative h-64 md:h-96 w-full overflow-hidden border-y border-border group">
                 <img
                  src={handImg}
                  alt="Human AI Symbiosis"
                  width={1376}
                  height={768}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                 />
                 <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-black/80 border border-primary px-6 py-2 text-primary tracking-widest uppercase text-sm backdrop-blur-md">
                     System Architecture: Symbiosis
                   </div>
                 </div>
              </div>
            )}

            {section.slogan && (
              <div className="mt-12 text-center space-y-8 py-12 bg-primary/5">
                <div className="text-4xl md:text-6xl font-bold text-primary animate-pulse">
                  {section.slogan}
                </div>
                <div className="space-y-4">
                   {section.content?.map((line: string, i: number) => (
                     <p key={i} className="text-xl text-foreground/80">{line}</p>
                   ))}
                </div>
                <div className="pt-4">
                  <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg h-14 px-8 rounded-none border border-transparent hover:border-primary/50">
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      {language === 'en' ? 'Support Us' : '支持我们'}
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
           <div className="space-y-2">
             <div className="text-2xl font-bold flex items-center gap-2">
               <TerminalIcon className="text-primary" /> OpenSource.Win
             </div>
             <p className="text-muted-foreground text-sm max-w-xs">
               {manifestoContent.meta.footerTagline[language]}
             </p>
           </div>
           
           <div className="text-right space-y-1 self-end md:self-center">
             <p className="font-bold text-foreground">
               <a
                 href="https://sunshineg.github.io/"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="hover:text-primary transition-colors"
               >
                 {manifestoContent.meta.author[language]}
               </a>
             </p>
             {manifestoContent.meta.roles.map((role, i) =>
               role.url ? (
                 <p key={i} className="text-sm text-muted-foreground">
                   <a
                     href={role.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="hover:text-primary transition-colors"
                   >
                     {role[language]}
                   </a>
                 </p>
               ) : (
                 <p key={i} className="text-sm text-muted-foreground">{role[language]}</p>
               )
             )}
             <p className="text-xs text-primary/60 mt-4 font-mono">{manifestoContent.meta.date[language]}</p>
             
             <div className="flex items-center justify-end gap-4 mt-4 pt-2">
                <a href="https://github.com/sunshineg" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="GitHub">
                  <Github className="h-5 w-5" />
                  <span className="sr-only">GitHub</span>
                </a>
                <a href="https://www.linkedin.com/in/sunnygao/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                  <span className="sr-only">LinkedIn</span>
                </a>
                <a href={language === 'zh' ? "https://x.com/gaoyangio" : "https://x.com/sunnyygao"} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="X (Twitter)">
                  <XIcon className="h-4 w-4" />
                  <span className="sr-only">X</span>
                </a>
             </div>
           </div>
        </div>
        <div className="max-w-4xl mx-auto mt-12 text-center text-xs text-muted-foreground">
          Built With{' '}
          <a
            href="https://mindmux.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            MindMux
          </a>
        </div>
      </footer>
    </div>
  );
}
