"use client";

import { useState } from "react";

type Props = {
  text: string;
  label?: string;
  copiedLabel?: string;
};

export default function CopyTextButton({
  text,
  label = "Copy / 复制",
  copiedLabel = "Copied / 已复制",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyNow() {
    const payload =
      text.startsWith("/") && typeof window !== "undefined"
        ? `${window.location.origin}${text}`
        : text;
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={copyNow}>
      {copied ? copiedLabel : label}
    </button>
  );
}

