function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDate(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fmtTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtDateTime(d: Date) {
  return `${fmtDate(d)} ${fmtTime(d)}`;
}

export function installGlobalDateFormat() {
  const g = globalThis as any;
  if (g.__tuitionSchedulerDateFormatInstalled) return;
  g.__tuitionSchedulerDateFormatInstalled = true;

  const proto = Date.prototype as any;
  proto.toLocaleDateString = function toLocaleDateStringPatched() {
    return fmtDate(this as Date);
  };
  proto.toLocaleTimeString = function toLocaleTimeStringPatched() {
    return fmtTime(this as Date);
  };
  proto.toLocaleString = function toLocaleStringPatched() {
    return fmtDateTime(this as Date);
  };
}

installGlobalDateFormat();

