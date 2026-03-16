"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  href: string;
  noPreviewLabel: string;
};

export default function ImagePreviewWithFallback({
  src,
  alt,
  href,
  noPreviewLabel,
}: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span style={{ color: "#666" }}>{noPreviewLabel}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid #ddd", borderRadius: 4 }}
      />
    </a>
  );
}
