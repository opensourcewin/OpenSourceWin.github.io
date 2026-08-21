import { useEffect, useState } from "react";

interface TypewriterProps {
  /** Copy in the current page locale (URL-level i18n — no client-side switching). */
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
}

export default function Typewriter({
  text,
  speed = 30,
  startDelay = 0,
  className = "",
}: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Respect prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
