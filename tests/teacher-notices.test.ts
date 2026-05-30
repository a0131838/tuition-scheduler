import assert from "node:assert/strict";
import { test } from "node:test";

import { activeTeacherNoticeAttachments, activeTeacherNotices, sanitizeTeacherNoticeReads, sanitizeTeacherNotices } from "@/lib/teacher-notices";

test("teacher notice sanitizer keeps valid configurable notices", () => {
  const notices = sanitizeTeacherNotices([
    {
      id: "n1",
      category: "FINANCE",
      titleEn: "English",
      titleZh: "中文",
      bodyEn: "Body",
      bodyZh: "内容",
      publishedAt: "2026-05-08",
      expiresAt: "2026-05-30",
      important: true,
      requiresAck: true,
      active: true,
      attachmentDocumentId: "doc-1",
    },
  ]);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].id, "n1");
  assert.equal(notices[0].category, "FINANCE");
  assert.equal(notices[0].important, true);
  assert.equal(notices[0].requiresAck, true);
  assert.equal(notices[0].attachmentDocumentId, "doc-1");
});

test("teacher notice sanitizer falls back when configured notices are invalid", () => {
  const notices = sanitizeTeacherNotices([{ id: "bad" }]);
  assert.equal(notices[0].id, "company-name-update-20260508");
});

test("teacher notices only show active published notices first by importance", () => {
  const notices = activeTeacherNotices(
    sanitizeTeacherNotices([
      { id: "future", titleEn: "F", titleZh: "F", bodyEn: "F", bodyZh: "F", publishedAt: "2099-01-01", important: true, active: true },
      { id: "normal", titleEn: "N", titleZh: "N", bodyEn: "N", bodyZh: "N", publishedAt: "2026-05-01", important: false, active: true },
      { id: "important", titleEn: "I", titleZh: "I", bodyEn: "I", bodyZh: "I", publishedAt: "2026-05-01", important: true, active: true },
      { id: "expired", titleEn: "E", titleZh: "E", bodyEn: "E", bodyZh: "E", publishedAt: "2026-05-01", expiresAt: "2026-05-07", important: true, active: true },
      { id: "inactive", titleEn: "X", titleZh: "X", bodyEn: "X", bodyZh: "X", publishedAt: "2026-05-01", important: true, active: false },
    ]),
    new Date("2026-05-08T00:00:00.000Z"),
  );
  assert.deepEqual(notices.map((x) => x.id), ["important", "normal"]);
});

test("teacher notice attachments only include active published notices", () => {
  const notices = sanitizeTeacherNotices([
    { id: "future", titleEn: "F", titleZh: "F", bodyEn: "F", bodyZh: "F", publishedAt: "2099-01-01", important: true, active: true, attachmentDocumentId: "future-doc" },
    { id: "active", titleEn: "A", titleZh: "A", bodyEn: "A", bodyZh: "A", publishedAt: "2026-05-01", important: true, active: true, attachmentDocumentId: "active-doc" },
    { id: "expired", titleEn: "E", titleZh: "E", bodyEn: "E", bodyZh: "E", publishedAt: "2026-05-01", expiresAt: "2026-05-07", important: true, active: true, attachmentDocumentId: "expired-doc" },
    { id: "inactive", titleEn: "X", titleZh: "X", bodyEn: "X", bodyZh: "X", publishedAt: "2026-05-01", important: true, active: false, attachmentDocumentId: "inactive-doc" },
  ]);
  const attachments = activeTeacherNoticeAttachments(notices, new Date("2026-05-08T00:00:00.000Z"));
  assert.deepEqual(Array.from(attachments), ["active-doc"]);
});

test("teacher notice read sanitizer drops malformed read rows", () => {
  const store = sanitizeTeacherNoticeReads({
    readsByUser: {
      u1: { n1: "2026-05-08T00:00:00.000Z", bad: "" },
      u2: "bad",
    },
  });
  assert.deepEqual(store, { readsByUser: { u1: { n1: "2026-05-08T00:00:00.000Z" } } });
});
