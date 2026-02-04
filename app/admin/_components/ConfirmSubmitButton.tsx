"use client";

import React from "react";

export default function ConfirmSubmitButton({
  message,
  children,
}: {
  message: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}