import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const SESSION_COOKIE = "ts_admin_session";
const SESSION_DAYS = 30;

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  language: "BILINGUAL" | "ZH" | "EN";
};

function hashPassword(password: string, salt: string) {
  const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return hash.toString("hex");
}

export function createPasswordHash(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return { salt, hash };
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const calc = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash));
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: { userId, token, expiresAt },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { token } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.authSession.delete({ where: { token } });
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as AuthUser["role"],
    language: u.language as AuthUser["language"],
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/admin/login");
  return user;
}
