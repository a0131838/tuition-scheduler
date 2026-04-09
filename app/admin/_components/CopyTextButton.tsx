"use client";

import { useState } from "react";

export default function CopyTextButton({
  text,
  label,
  copiedLabel,
  style,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      style={style}
    >
      {copied ? copiedLabel ?? label : label}
    </button>
  );
}
