import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  startDelay?: number;
}

export function Typewriter({ text, speed = 30, className, onComplete, startDelay = 0 }: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      onComplete?.();
      return;
    }

    const startTimeout = setTimeout(() => {
      setIsStarted(true);
    }, startDelay);
    return () => clearTimeout(startTimeout);
  }, [startDelay, prefersReducedMotion, text, onComplete]);

  useEffect(() => {
    if (!isStarted || prefersReducedMotion) return;

    let i = 0;
    setDisplayedText(""); // Reset when text changes
    
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => {
        if (i >= text.length) {
          clearInterval(intervalId);
          onComplete?.();
          return text;
        }
        const nextChar = text.charAt(i);
        i++;
        return prev + nextChar;
      });
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, isStarted, prefersReducedMotion, onComplete]);

  return (
    <span className={cn("font-mono", className)}>
      {displayedText}
      <span className="animate-cursor-blink inline-block w-[0.6ch] h-[1.2em] bg-primary align-middle ml-1" />
    </span>
  );
}
