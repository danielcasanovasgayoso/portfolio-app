"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyTickerButton({ ticker }: { ticker: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ticker);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="mr-2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy ticker"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
