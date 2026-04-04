"use client";

import { useEffect } from "react";
import { ensureStudentDetailSectionOpen } from "./studentDetailHash";

export default function StudentDetailHashStateClient() {
  useEffect(() => {
    const apply = () => {
      ensureStudentDetailSectionOpen(window.location.hash);
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return null;
}
