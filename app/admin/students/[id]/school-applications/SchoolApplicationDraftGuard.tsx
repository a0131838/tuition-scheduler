"use client";

import { useEffect, useRef } from "react";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function amount(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function focusNamedField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLElement) field.focus();
}

export default function SchoolApplicationDraftGuard() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    if (!(form instanceof HTMLFormElement)) return;

    const onSubmit = (event: SubmitEvent) => {
      const formData = new FormData(form);
      if (!value(formData, "parentName")) {
        event.preventDefault();
        focusNamedField(form, "parentName");
        window.alert("Parent name is required / 请填写家长姓名");
        return;
      }
      if (!value(formData, "agreementDate")) {
        event.preventDefault();
        focusNamedField(form, "agreementDate");
        window.alert("Agreement date is required / 请填写合同日期");
        return;
      }
      if (!value(formData, "targetId_0")) {
        event.preventDefault();
        focusNamedField(form, "targetId_0");
        window.alert("Please select at least the first school/application / 请至少选择第一所学校或申请项目");
        return;
      }

      let total = amount(formData, "addOnFeeAmount");
      for (let i = 0; i < 5; i += 1) {
        total += amount(formData, `serviceFee_${i}`);
        total += amount(formData, `officialFee_${i}`);
      }
      if (total <= 0) {
        event.preventDefault();
        focusNamedField(form, "serviceFee_0");
        window.alert("Total amount must be greater than 0 / 服务费、官方费或增值服务费至少一项需要大于 0");
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  return <span ref={markerRef} hidden />;
}
