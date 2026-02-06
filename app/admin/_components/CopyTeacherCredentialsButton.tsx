"use client";

import { useState } from "react";
import NoticeBanner from "@/app/admin/_components/NoticeBanner";

type Props = {
  emailInputId: string;
  nameInputId: string;
  passwordInputId: string;
  label?: string;
};

export default function CopyTeacherCredentialsButton({
  emailInputId,
  nameInputId,
  passwordInputId,
  label = "Copy login info / 复制登录信息",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copyNow() {
    const emailEl = document.getElementById(emailInputId) as HTMLInputElement | null;
    const nameEl = document.getElementById(nameInputId) as HTMLInputElement | null;
    const passwordEl = document.getElementById(passwordInputId) as HTMLInputElement | null;

    const email = emailEl?.value?.trim() ?? "";
    const name = nameEl?.value?.trim() ?? "";
    const password = passwordEl?.value ?? "";
    if (!email || !name || !password) {
      setError("Please fill email, name, and password first.");
      setTimeout(() => setError(""), 2500);
      return;
    }
    setError("");

    const text = [
      "Teacher account info",
      `Email: ${email}`,
      `Name: ${name}`,
      `Password: ${password}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <span style={{ display: "inline-grid", gap: 6 }}>
      <button type="button" onClick={copyNow}>
        {copied ? "Copied / 已复制" : label}
      </button>
      {error ? <NoticeBanner type="warn" title="Notice" message={error} /> : null}
    </span>
  );
}
