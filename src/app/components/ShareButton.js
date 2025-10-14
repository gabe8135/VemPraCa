"use client";

import { useCallback, useState } from "react";

export default function ShareButton({
  url,
  title = "Compartilhar",
  text = "Confira este link",
  icon = null,
  className = "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold",
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const shareUrl =
        url || (typeof window !== "undefined" ? window.location.href : "");
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      try {
        const shareUrl = url || window.location.href;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [title, text, url]);

  return (
    <button onClick={handleShare} className={className} type="button">
      {copied ? (
        "Link copiado!"
      ) : (
        <span className="inline-flex items-center gap-2">
          {icon}
          {title}
        </span>
      )}
    </button>
  );
}
