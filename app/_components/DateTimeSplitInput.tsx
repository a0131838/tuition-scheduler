"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import BlurTimeInput from "./BlurTimeInput";

type Props = {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  dateStyle?: CSSProperties;
  timeStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
};

function splitDateTimeLocal(raw?: string) {
  if (!raw) return { date: "", time: "00:00" };
  const [datePart = "", timePart = ""] = raw.split("T");
  const normalizedTime = /^\d{2}:\d{2}/.test(timePart) ? timePart.slice(0, 5) : "00:00";
  return { date: datePart, time: normalizedTime };
}

function joinDateTimeLocal(datePart: string, timePart: string) {
  if (!datePart) return "";
  return `${datePart}T${timePart || "00:00"}`;
}

export default function DateTimeSplitInput({
  name,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  dateStyle,
  timeStyle,
  wrapperStyle,
}: Props) {
  const initial = useMemo(
    () => splitDateTimeLocal(value ?? defaultValue),
    [defaultValue, value]
  );
  const [datePart, setDatePart] = useState(initial.date);
  const [timePart, setTimePart] = useState(initial.time);

  useEffect(() => {
    const next = splitDateTimeLocal(value ?? defaultValue);
    setDatePart(next.date);
    setTimePart(next.time);
  }, [defaultValue, value]);

  const combinedValue = joinDateTimeLocal(datePart, timePart);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", ...(wrapperStyle ?? {}) }}>
      {name ? <input type="hidden" name={name} value={combinedValue} /> : null}
      <input
        type="date"
        value={datePart}
        required={required}
        disabled={disabled}
        onChange={(e) => {
          const nextDate = e.target.value;
          setDatePart(nextDate);
          onChange?.(joinDateTimeLocal(nextDate, timePart));
        }}
        style={dateStyle}
      />
      <BlurTimeInput
        value={timePart}
        disabled={disabled}
        step={60}
        onValueChange={(nextTime) => {
          setTimePart(nextTime);
          onChange?.(joinDateTimeLocal(datePart, nextTime));
        }}
        style={timeStyle}
      />
    </span>
  );
}
