"use client";

import { useEffect, useState } from "react";

export function ShareButtons({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = origin + path;
  const text = encodeURIComponent(`${title} — ${url}`);
  const enc = encodeURIComponent(url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${text}` },
    { label: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${text}` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="btn-secondary">
        {copied ? "Link copied ✓" : "Copy link"}
      </button>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          {l.label}
        </a>
      ))}
    </div>
  );
}
