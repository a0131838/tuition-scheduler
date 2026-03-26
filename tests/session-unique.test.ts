import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { isSessionDuplicateError } from "../lib/session-unique";

test("session duplicate helper recognizes prisma P2002", () => {
  const error = new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "5.22.0",
  });

  assert.equal(isSessionDuplicateError(error), true);
});

test("session duplicate helper ignores other errors", () => {
  assert.equal(isSessionDuplicateError(new Error("nope")), false);
});
