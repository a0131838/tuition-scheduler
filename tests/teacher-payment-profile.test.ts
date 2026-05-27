import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPayNowType,
  formatTeacherPaymentMethod,
  formatTutorDisplayName,
  maskBankAccountNumber,
  maskPayNowValue,
  nextTutorCodeFromExisting,
  normalizePayNowType,
  normalizeTeacherPaymentMethod,
} from "../lib/teacher-payment-profile";

test("normalizes supported PayNow types only", () => {
  assert.equal(normalizePayNowType("mobile"), "MOBILE");
  assert.equal(normalizePayNowType("NRIC"), "NRIC");
  assert.equal(normalizePayNowType("bank"), null);
  assert.equal(formatPayNowType("UEN"), "UEN");
});

test("normalizes supported teacher payment methods only", () => {
  assert.equal(normalizeTeacherPaymentMethod("paynow"), "PAYNOW");
  assert.equal(normalizeTeacherPaymentMethod("BANK_TRANSFER"), "BANK_TRANSFER");
  assert.equal(normalizeTeacherPaymentMethod("cheque"), null);
  assert.equal(formatTeacherPaymentMethod("BANK_TRANSFER"), "Bank Transfer");
});

test("masks PayNow values for UI display", () => {
  assert.equal(maskPayNowValue("91234567"), "****4567");
  assert.equal(maskPayNowValue("1234"), "1234");
  assert.equal(maskPayNowValue(""), "");
  assert.equal(maskBankAccountNumber("1234567890"), "******7890");
});

test("allocates the next tutor code from existing serials", () => {
  assert.equal(nextTutorCodeFromExisting(["T001", "T009", "ABC", null]), "T010");
  assert.equal(nextTutorCodeFromExisting([]), "T001");
});

test("formats tutor display name with stable code", () => {
  assert.equal(formatTutorDisplayName({ tutorCode: "T012", name: "David" }), "T012 David");
  assert.equal(formatTutorDisplayName({ name: "David" }), "David");
});
