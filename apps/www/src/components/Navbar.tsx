import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { manifestoContent } from "@/data/manifesto";
import { Languages, Terminal } from "lucide-react";

export function Navbar() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">OpenSource<span className="text-primary">.Win</span></span>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            <Languages className="mr-2 h-4 w-4" />
            {language === 'en' ? 'EN / 中文' : '中文 / EN'}
          </Button>
          
          <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
            <a href="https://opensource.win/ossheroes/">
              {manifestoContent.meta.navHeroes[language]}
            </a>
          </Button>
        </div>
      </div>
    </nav>
  );
}
