"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, InputHTMLAttributes } from "react";

type BlurTimeInputProps = InputHTMLAttributes<HTMLInputElement>;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHHMM(v: string | undefined) {
  if (!v) return { hh: 16, mm: 0 };
  const [h, m] = v.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { hh: 16, mm: 0 };
  return {
    hh: Math.max(0, Math.min(23, h)),
    mm: Math.max(0, Math.min(59, m)),
  };
}

function toMin(v: string | undefined, fallback: number) {
  if (!v) return fallback;
  const { hh, mm } = parseHHMM(v);
  return hh * 60 + mm;
}

export default function BlurTimeInput(props: BlurTimeInputProps) {
  const {
    type,
    name,
    value,
    defaultValue,
    required,
    disabled,
    style,
    className,
    step,
    min,
    max,
    ...rest
  } = props;

  const initial = parseHHMM((value as string | undefined) ?? (defaultValue as string | undefined));

  const minuteStep = useMemo(() => {
    const s = Number(step);
    if (!Number.isFinite(s) || s <= 0) return 10;
    const min = Math.floor(s / 60);
    return Math.max(1, Math.min(30, min || 1));
  }, [step]);

  const minBound = useMemo(() => toMin(typeof min === "string" ? min : undefined, 0), [min]);
  const maxBound = useMemo(() => toMin(typeof max === "string" ? max : undefined, 23 * 60 + 59), [max]);

  const allowedTimes = useMemo(() => {
    const from = Math.ceil(minBound / minuteStep) * minuteStep;
    const to = Math.floor(maxBound / minuteStep) * minuteStep;
    const arr: number[] = [];
    for (let x = from; x <= to; x += minuteStep) arr.push(x);
    return arr.length > 0 ? arr : [from];
  }, [minBound, maxBound, minuteStep]);

  const initialMin = useMemo(() => {
    const raw = initial.hh * 60 + initial.mm;
    if (allowedTimes.includes(raw)) return raw;
    return allowedTimes[0];
  }, [initial.hh, initial.mm, allowedTimes]);

  const [selectedMin, setSelectedMin] = useState<number>(initialMin);

  const hourOptions = useMemo(() => {
    return Array.from(new Set(allowedTimes.map((v) => Math.floor(v / 60))));
  }, [allowedTimes]);

  const hh = Math.floor(selectedMin / 60);
  const mm = selectedMin % 60;

  const minuteOptions = useMemo(() => {
    return allowedTimes.filter((v) => Math.floor(v / 60) === hh).map((v) => v % 60);
  }, [allowedTimes, hh]);

  const hiddenValue = `${pad2(hh)}:${pad2(mm)}`;
  const boxStyle: CSSProperties = { ...(style ?? {}) };
  const selectWidth = boxStyle.width;
  delete boxStyle.width;
  const selectStyle: CSSProperties = selectWidth ? { width: selectWidth } : {};

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4, ...boxStyle }}
      className={className}
    >
      <input type="hidden" name={name} value={hiddenValue} required={required} disabled={disabled} />
      <select
        value={String(hh)}
        style={selectStyle}
        disabled={disabled}
        onChange={(e) => {
          const nextH = Number(e.target.value);
          const firstForHour = allowedTimes.find((v) => Math.floor(v / 60) === nextH);
          if (typeof firstForHour === "number") setSelectedMin(firstForHour);
          e.currentTarget.blur();
        }}
      >
        {hourOptions.map((h) => (
          <option key={h} value={h}>
            {pad2(h)}
          </option>
        ))}
      </select>
      <span>:</span>
      <select
        value={String(mm)}
        style={selectStyle}
        disabled={disabled}
        onChange={(e) => {
          const nextM = Number(e.target.value);
          setSelectedMin(hh * 60 + nextM);
          e.currentTarget.blur();
        }}
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {pad2(m)}
          </option>
        ))}
      </select>
      <input {...rest} type="hidden" value={hiddenValue} />
    </span>
  );
}
