#!/usr/bin/env node

const date = String(process.argv[2] ?? "").trim();
const teacherId = String(process.argv[3] ?? "").trim();
const campusId = String(process.argv[4] ?? "").trim();

const base = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
const key = process.env.OPENCLAW_OPS_KEY || "";

if (!key) {
  console.error(JSON.stringify({ ok: false, message: "Missing OPENCLAW_OPS_KEY in env" }, null, 2));
  process.exit(1);
}

const u = new URL("/api/admin/ops/daily-schedule-view", base);
if (date) u.searchParams.set("date", date);
if (teacherId) u.searchParams.set("teacherId", teacherId);
if (campusId) u.searchParams.set("campusId", campusId);
u.searchParams.set("includeExcused", "false");
u.searchParams.set("hideFullyExcused", "true");

const res = await fetch(u, {
  headers: {
    "x-ops-key": key,
  },
});

const text = await res.text();
if (!res.ok) {
  console.error(text);
  process.exit(1);
}
console.log(text);
