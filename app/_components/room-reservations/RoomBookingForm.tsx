"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type BookingResult = { href: string } | { error: string };

export default function RoomBookingForm({ action, children }: {
  action: (data: FormData) => Promise<BookingResult>;
  children: ReactNode;
}) {
  const inFlight = useRef(false);
  const alertRef = useRef<HTMLParagraphElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "unconfirmed">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    inFlight.current = true;
    setStatus("saving");
    setError("");

    try {
      const result = await action(data);
      if ("href" in result) {
        window.location.assign(result.href);
        return;
      }
      setError(result.error);
      inFlight.current = false;
      setStatus("idle");
    } catch {
      setError("Could not confirm the save. Reload the page and check the booking before trying again. / 暂时无法确认是否保存，请刷新页面核对预约后再试。");
      setStatus("unconfirmed");
    }
  }

  return (
    <form method="post" onSubmit={submit}>
      {error ? (
        <p ref={alertRef} tabIndex={-1} role="alert" style={{ color: "#991b1b", background: "#fef2f2", padding: 10, borderRadius: 8 }}>
          {error}
        </p>
      ) : null}
      <fieldset disabled={status !== "idle"} style={{ display: "grid", gap: 10, border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        {children}
      </fieldset>
      {status === "saving" ? <p role="status">Saving… / 正在保存…</p> : null}
    </form>
  );
}
