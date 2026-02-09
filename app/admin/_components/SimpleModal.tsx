"use client";

import { useRef } from "react";

export default function SimpleModal({
  buttonLabel,
  title,
  children,
  closeOnSubmit = false,
  closeLabel = "Close / 关闭",
}: {
  buttonLabel: string;
  title: string;
  children: React.ReactNode;
  closeOnSubmit?: boolean;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}>
        {buttonLabel}
      </button>
      <dialog
        ref={ref}
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 0,
          width: "min(920px, 92vw)",
        }}
        onSubmitCapture={() => {
          if (closeOnSubmit) ref.current?.close();
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <b>{title}</b>
          <button type="button" onClick={() => ref.current?.close()}>
            {closeLabel}
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </dialog>
    </>
  );
}
