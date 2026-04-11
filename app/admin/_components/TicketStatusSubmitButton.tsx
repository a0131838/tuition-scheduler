"use client";

import type { CSSProperties, MouseEvent } from "react";

export default function TicketStatusSubmitButton({
  label,
  promptLabel,
  missingNoteAlert,
  style,
}: {
  label: string;
  promptLabel?: string;
  missingNoteAlert?: string;
  style?: CSSProperties;
}) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const nextStatusInput = form.elements.namedItem("nextStatus");
    const completionNoteInput = form.elements.namedItem("completionNote");
    const nextStatus = nextStatusInput instanceof HTMLSelectElement ? nextStatusInput.value : "";
    if (nextStatus !== "Completed") {
      form.requestSubmit();
      return;
    }

    const currentNote =
      completionNoteInput instanceof HTMLInputElement || completionNoteInput instanceof HTMLTextAreaElement
        ? completionNoteInput.value.trim()
        : "";

    if (currentNote) {
      form.requestSubmit();
      return;
    }

    const prompted = window.prompt(
      promptLabel ?? "请填写完成说明 / Please add a completion note before marking this ticket completed",
      ""
    );

    if (prompted === null) {
      return;
    }

    const trimmed = prompted.trim();
    if (!trimmed) {
      window.alert(missingNoteAlert ?? "完成说明不能为空，当前未提交。/ Completion note is required, so nothing was submitted.");
      return;
    }

    if (completionNoteInput instanceof HTMLInputElement || completionNoteInput instanceof HTMLTextAreaElement) {
      completionNoteInput.value = trimmed;
    }
    form.requestSubmit();
  }

  return (
    <button type="button" onClick={handleClick} style={style}>
      {label}
    </button>
  );
}
