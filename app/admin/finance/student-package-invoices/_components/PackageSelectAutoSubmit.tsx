"use client";

type Option = {
  value: string;
  label: string;
};

export default function PackageSelectAutoSubmit({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      style={{ minWidth: 340 }}
      onChange={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        try {
          form.requestSubmit();
        } catch {
          form.submit();
        }
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
