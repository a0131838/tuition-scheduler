import crypto from "crypto";

export type AcademicAssessmentAiGrade = {
  accepted: boolean;
  score: number | null;
  criteria?: Record<string, number>;
  strength?: string;
  priority?: string;
  confidence?: string;
  model?: string;
  modelRegion?: string;
};

export async function gradeAcademicWriting(input: {
  questionId: string;
  product: string;
  ageBand: string;
  prompt: string;
  answer: string;
  rubric: string;
  maxScore: number;
}, fetchImpl: typeof fetch = fetch): Promise<AcademicAssessmentAiGrade | null> {
  const baseUrl = String(process.env.SGT_AI_BASE_URL || "").trim().replace(/\/$/, "");
  const secret = String(process.env.SGT_AI_MINIAPP_SHARED_SECRET || "").trim();
  if (!baseUrl || secret.length < 32) return null;
  const body = JSON.stringify(input);
  const timestamp = String(Date.now());
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  try {
    const response = await fetchImpl(`${baseUrl}/api/internal/academic-assessment/grade`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sgt-timestamp": timestamp, "x-sgt-signature": signature },
      body,
      signal: AbortSignal.timeout(65_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const result = await response.json() as AcademicAssessmentAiGrade;
    if (typeof result.accepted !== "boolean" || (result.score != null && !Number.isFinite(Number(result.score)))) return null;
    return result;
  } catch {
    return null;
  }
}
