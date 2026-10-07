import assert from "node:assert/strict";
import test from "node:test";
import { uploadStorageError } from "../lib/upload-storage-error";
for (const code of ["ENOSPC", "EDQUOT"]) {
  test(`${code} returns retryable storage error in three language modes`, () => {
    const err = Object.assign(new Error("sensitive local path"), { code });
    for (const language of ["ZH", "EN", "BILINGUAL"]) {
      const out = uploadStorageError(err, language);
      assert.equal(out.status, 503);
      assert.ok(!out.message.includes("sensitive"));
      assert.equal(/[\u4e00-\u9fff]/.test(out.message), language !== "EN");
    }
  });
}
test("size limit is actionable and different from disk full", () => {
  assert.equal(uploadStorageError(new Error("File too large (max 10MB)"), "EN").status, 413);
});
test("unknown failures do not expose filesystem details", () => {
  const out = uploadStorageError(new Error("/home/private/file"), "EN");
  assert.equal(out.status, 500); assert.ok(!out.message.includes("/home/"));
});
