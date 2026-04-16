"use client";

import { useEffect, useState } from "react";

/**
 * Renders `support@evergreen.app` only after hydration, assembled from
 * character codes, to make naive HTML-scraper bot harvesting harder.
 * Not a cryptographic defense — just lifts us above low-effort scrapers.
 */
export function ObfuscatedSupportEmail({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const codes = [
      115, 117, 112, 112, 111, 114, 116, 64, 101, 118, 101, 114, 103, 114, 101,
      101, 110, 46, 97, 112, 112,
    ];
    setEmail(String.fromCharCode(...codes));
  }, []);

  if (!email) {
    // Pre-hydration: show label only, no harvestable address.
    return (
      <span className={className}>
        {children ?? "our support team"}
      </span>
    );
  }

  return (
    <a
      href={`mailto:${email}`}
      className={className}
      rel="nofollow noopener"
    >
      {children ?? email}
    </a>
  );
}
