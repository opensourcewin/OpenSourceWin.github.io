import { useEffect, useState } from "react";

type Language = "en" | "zh";

interface TypewriterProps {
  /** Bilingual copy; re-types when the active language changes. */
  texts: Record<Language, string>;
  speed?: number;
  startDelay?: number;
  className?: string;
}

/** Reads the persisted language, mirroring the `osw-language` key shared with ossheroes. */
function detectLanguage(): Language {
  try {
    const stored = window.localStorage.getItem("osw-language");
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // localStorage unavailable (private mode) — fall through to navigator.
  }
  return (navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
}

export default function Typewriter({
  texts,
  speed = 30,
  startDelay = 0,
  className = "",
}: TypewriterProps) {
  // Use a deterministic SSR value, then read browser preferences after hydration.
  const [language, setLanguage] = useState<Language>("en");
  const [displayed, setDisplayed] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setLanguage(detectLanguage());
  }, []);

  // Respect prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // React to the language toggle dispatched by the page's i18n script.
  useEffect(() => {
    const onChange = (event: Event) => {
      const lang = (event as CustomEvent<{ language?: string }>).detail?.language;
      if (lang === "en" || lang === "zh") setLanguage(lang);
    };
    window.addEventListener("osw:languagechange", onChange as EventListener);
    return () => window.removeEventListener("osw:languagechange", onChange as EventListener);
  }, []);

  const text = texts[language];

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      let i = 0;
      interval = window.setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length && interval !== undefined) window.clearInterval(interval);
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [text, speed, startDelay, reducedMotion]);

  return (
    <span className={`font-mono ${className}`}>
      {displayed}
      <span className="animate-cursor-blink inline-block w-[0.6ch] h-[1.2em] bg-primary align-middle ml-1" />
    </span>
  );
}