import crypto from "crypto";

export const AI_TICKET_COMMAND_TYPES = [
  "CREATE_SESSION",
  "RESCHEDULE_SESSION",
  "CANCEL_SESSION",
  "REPLACE_TEACHER",
  "CREATE_ASSESSMENT_TASK",
  "PACKAGE_ACTIVATION_REVIEW",
  "ACADEMIC_CASE_HANDOFF",
  "SERVICE_CASE_HANDOFF",
  "OPERATION_CORRECTION_REVIEW",
] as const;

export type AiTicketCommandType = (typeof AI_TICKET_COMMAND_TYPES)[number];

export type AiTicketCommand = {
  commandType: AiTicketCommandType;
  idempotencyKey: string;
  sessionId?: string;
  studentId?: string;
  subjectId?: string;
  levelId?: string | null;
  teacherId?: string;
  newTeacherId?: string;
  campusId?: string;
  roomId?: string | null;
  startAt?: string;
  durationMin?: number;
  weeks?: number;
  charge?: boolean;
  note?: string;
  reason?: string;
  nextAction?: string;
  parentPublicSummary?: string;
  label?: string;
  correctionTarget?: string;
  beforeAfter?: string;
  evidence?: string;
};

export type AiTicketExecutionRequest = {
  version: "SGT_AI_TICKET_EXECUTION_V1";
  ticketId: string;
  formalSourceVersion: string;
  formalUpdatedAt: string;
  workflowKey: string;
  idempotencyKey: string;
  commands: AiTicketCommand[];
};

const WORKFLOW_COMMANDS: Record<string, AiTicketCommandType[]> = {
  NEW_SCHEDULE: ["CREATE_SESSION"],
  SUPPLEMENTARY: ["CREATE_SESSION"],
  RESCHEDULE: ["RESCHEDULE_SESSION"],
  CANCEL_LESSON: ["CANCEL_SESSION"],
  CHANGE_TEACHER: ["REPLACE_TEACHER"],
  ASSESSMENT_TRIAL: ["CREATE_ASSESSMENT_TASK"],
  PACKAGE_SALES_ACTIVATION: ["PACKAGE_ACTIVATION_REVIEW"],
  ACADEMIC_CASE: ["ACADEMIC_CASE_HANDOFF"],
  NON_ACADEMIC_SERVICE: ["SERVICE_CASE_HANDOFF"],
  OPERATION_CORRECTION: ["OPERATION_CORRECTION_REVIEW"],
};

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

function required(value: unknown, name: string, max = 180) {
  const result = clean(value, max);
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function parseCommand(value: unknown, index: number): AiTicketCommand {
  if (!value || typeof value !== "object") throw new Error(`commands[${index}] is invalid`);
  const row = value as Record<string, unknown>;
  const commandType = clean(row.commandType, 40) as AiTicketCommandType;
  if (!AI_TICKET_COMMAND_TYPES.includes(commandType)) throw new Error(`commands[${index}].commandType is not allowed`);
  const result: AiTicketCommand = {
    commandType,
    idempotencyKey: required(row.idempotencyKey, `commands[${index}].idempotencyKey`, 128),
  };
  const optionalIds = ["sessionId", "studentId", "subjectId", "teacherId", "newTeacherId", "campusId"] as const;
  for (const key of optionalIds) {
    const parsed = clean(row[key], 180);
    if (parsed) result[key] = parsed;
  }
  for (const key of ["levelId", "roomId"] as const) {
    result[key] = row[key] === null ? null : clean(row[key], 180) || undefined;
  }
  for (const key of ["note", "reason", "nextAction", "parentPublicSummary", "label", "correctionTarget", "beforeAfter", "evidence"] as const) {
    const parsed = clean(row[key], 1000);
    if (parsed) result[key] = parsed;
  }
  if (row.startAt !== undefined) {
    const startAt = required(row.startAt, `commands[${index}].startAt`, 80);
    if (Number.isNaN(Date.parse(startAt))) throw new Error(`commands[${index}].startAt is invalid`);
    result.startAt = new Date(startAt).toISOString();
  }
  if (row.durationMin !== undefined) {
    const durationMin = Number(row.durationMin);
    if (!Number.isInteger(durationMin) || durationMin < 15 || durationMin > 360) throw new Error(`commands[${index}].durationMin is invalid`);
    result.durationMin = durationMin;
  }
  if (row.weeks !== undefined) {
    const weeks = Number(row.weeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) throw new Error(`commands[${index}].weeks is invalid`);
    result.weeks = weeks;
  }
  if (row.charge !== undefined) {
    if (typeof row.charge !== "boolean") throw new Error(`commands[${index}].charge is invalid`);
    result.charge = row.charge;
  }
  const needs: Record<AiTicketCommandType, Array<keyof AiTicketCommand>> = {
    CREATE_SESSION: ["subjectId", "teacherId", "campusId", "startAt", "durationMin"],
    RESCHEDULE_SESSION: ["sessionId", "startAt", "durationMin"],
    CANCEL_SESSION: ["sessionId", "studentId", "note"],
    REPLACE_TEACHER: ["sessionId", "newTeacherId", "reason"],
    CREATE_ASSESSMENT_TASK: ["nextAction", "parentPublicSummary"],
    PACKAGE_ACTIVATION_REVIEW: ["label", "parentPublicSummary"],
    ACADEMIC_CASE_HANDOFF: ["studentId", "nextAction", "parentPublicSummary"],
    SERVICE_CASE_HANDOFF: ["studentId", "nextAction", "parentPublicSummary"],
    OPERATION_CORRECTION_REVIEW: ["correctionTarget", "beforeAfter", "evidence", "nextAction", "parentPublicSummary"],
  };
  for (const key of needs[commandType]) if (result[key] === undefined || result[key] === "") throw new Error(`commands[${index}].${key} is required`);
  if (commandType === "CANCEL_SESSION" && typeof result.charge !== "boolean") throw new Error(`commands[${index}].charge is required`);
  return result;
}

export function parseAiTicketExecutionRequest(value: unknown, routeTicketId: string): AiTicketExecutionRequest {
  if (!value || typeof value !== "object") throw new Error("Invalid JSON");
  const row = value as Record<string, unknown>;
  if (row.version !== "SGT_AI_TICKET_EXECUTION_V1") throw new Error("Unsupported execution package version");
  const ticketId = required(row.ticketId, "ticketId");
  if (ticketId !== routeTicketId) throw new Error("Ticket id does not match route");
  if (!Array.isArray(row.commands) || row.commands.length < 1 || row.commands.length > 64) throw new Error("commands must contain 1 to 64 items");
  const commands = row.commands.map(parseCommand);
  const workflowKey = required(row.workflowKey, "workflowKey", 80);
  const allowed = WORKFLOW_COMMANDS[workflowKey];
  if (!allowed || commands.some((command) => !allowed.includes(command.commandType))) throw new Error("Command does not match workflow");
  if (new Set(commands.map((item) => item.idempotencyKey)).size !== commands.length) throw new Error("Command idempotency keys must be unique");
  return {
    version: "SGT_AI_TICKET_EXECUTION_V1",
    ticketId,
    formalSourceVersion: required(row.formalSourceVersion, "formalSourceVersion", 128),
    formalUpdatedAt: (() => {
      const value = required(row.formalUpdatedAt, "formalUpdatedAt", 80);
      if (Number.isNaN(Date.parse(value))) throw new Error("formalUpdatedAt is invalid");
      return new Date(value).toISOString();
    })(),
    workflowKey,
    idempotencyKey: required(row.idempotencyKey, "idempotencyKey", 128),
    commands,
  };
}

export function aiTicketExecutionDigest(value: AiTicketExecutionRequest) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createAiTicketExecutionToken(value: AiTicketExecutionRequest, userId: string, secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error("AI ticket execution confirmation is not configured");
  const payload = Buffer.from(JSON.stringify({ digest: aiTicketExecutionDigest(value), userId, expiresAt: now + 10 * 60_000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAiTicketExecutionToken(token: string, value: AiTicketExecutionRequest, userId: string, secret: string) {
  const [payload, signature] = String(token ?? "").split(".");
  if (!payload || !signature || secret.length < 32) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature); const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded.userId === userId && decoded.digest === aiTicketExecutionDigest(value) && decoded.expiresAt > Date.now();
  } catch { return false; }
}

export function canExecuteAiTicketPackage(
  user: { role: string; workspaceAccesses?: Array<{ workspace: string }> },
  value: AiTicketExecutionRequest
) {
  const roles = new Set([user.role, ...(user.workspaceAccesses || []).map((row) => row.workspace)]);
  return value.commands.every((command) => {
    // Formal academic operations remain restricted to ADMIN. Eva's existing formal
    // account is ADMIN; CS accounts such as Emily cannot execute these commands.
    if (["CREATE_SESSION", "RESCHEDULE_SESSION", "CANCEL_SESSION", "REPLACE_TEACHER"].includes(command.commandType)) return user.role === "ADMIN";
    if (command.commandType === "PACKAGE_ACTIVATION_REVIEW") return roles.has("ADMIN") || roles.has("FINANCE");
    if (command.commandType === "OPERATION_CORRECTION_REVIEW") return roles.has("ADMIN");
    if (command.commandType === "ACADEMIC_CASE_HANDOFF") return roles.has("ADMIN") || roles.has("CS");
    return roles.has("ADMIN") || roles.has("CS") || roles.has("SALES");
  });
}
