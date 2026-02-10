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
  children: React.ReactNode | ((opts: { close: () => void }) => React.ReactNode);
  closeOnSubmit?: boolean;
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const close = () => ref.current?.close();

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
        onSubmit={(e) => {
          // Allow child forms to preventDefault() to keep the modal open.
          if (closeOnSubmit && !e.defaultPrevented) close();
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
          <button type="button" onClick={close}>
            {closeLabel}
          </button>
        </div>
        <div style={{ padding: 16 }}>{typeof children === "function" ? children({ close }) : children}</div>
      </dialog>
    </>
  );
}
