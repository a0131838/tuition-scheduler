"use client";

import { useState } from "react";

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

  async function copyNow() {
    const emailEl = document.getElementById(emailInputId) as HTMLInputElement | null;
    const nameEl = document.getElementById(nameInputId) as HTMLInputElement | null;
    const passwordEl = document.getElementById(passwordInputId) as HTMLInputElement | null;

    const email = emailEl?.value?.trim() ?? "";
    const name = nameEl?.value?.trim() ?? "";
    const password = passwordEl?.value ?? "";
    if (!email || !name || !password) {
      alert("Please fill email, name, and password first.");
      return;
    }

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
    <button type="button" onClick={copyNow}>
      {copied ? "Copied / 已复制" : label}
    </button>
  );
}

