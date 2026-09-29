"use client";

import { useState } from "react";
import ui from "@/components/ui.module.css";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`${ui.secondary} ${ui.small}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Скопировано" : "Скопировать"}
    </button>
  );
}
