"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const MESSAGES = [
  "Evergreen is working…",
  "Following brand instructions…",
  "Fine-tuning the palette…",
  "Loading brand assets…",
  "Consulting the bot creative agency…",
  "Briefing the art director…",
  "Placing the logo just so…",
  "Scouting a composition…",
  "Matching your pillar…",
  "Channeling the voice guide…",
  "Negotiating with the render farm…",
  "Mixing light and shadow…",
  "Calling in the stylists…",
  "Art-directing every pixel…",
  "Rendering (patience, please)…",
  "Routing through creative review…",
  "Conferring with gpt-image-2…",
  "Checking the taboos list one more time…",
];

/**
 * Cycles through playful status messages while the image generates.
 * Crossfades between messages every ~2.8s.
 */
export function RotatingStatusToast() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Start from a random position each mount so repeat generations feel fresh
    setIdx(Math.floor(Math.random() * MESSAGES.length));

    const tick = setInterval(() => {
      // Fade out
      setVisible(false);
      // After fade-out, swap message and fade back in
      setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 2800);

    return () => clearInterval(tick);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[60]">
      <div className="bg-white border border-slate-line rounded-full px-4 py-2 shadow-lg inline-flex items-center gap-2 text-xs font-semibold text-evergreen-700 min-w-[280px] justify-center">
        <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
        <span
          className={`transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {MESSAGES[idx]}
        </span>
      </div>
    </div>
  );
}
