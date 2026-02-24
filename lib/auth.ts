import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

const SESSION_COOKIE = "ts_admin_session";
const SESSION_DAYS = 30;
const DEFAULT_OWNER_MANAGER_EMAIL = "zhaohongwei0880@gmail.com";
const STRICT_SUPER_ADMIN_EMAIL = "zhaohongwei0880@gmail.com";
const STRICT_SUPER_ADMIN_NAME = "zhao hongwei";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "FINANCE" | "TEACHER" | "STUDENT";
  language: "BILINGUAL" | "ZH" | "EN";
  teacherId: string | null;
};

function managerEmailSet() {
  const raw = process.env.MANAGER_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function managerEmailsFromEnv() {
  return Array.from(managerEmailSet());
}

export async function getManagerEmailSet() {
  const set = managerEmailSet();
  try {
    const rows = await prisma.managerAcl.findMany({
      where: { isActive: true },
      select: { email: true },
    });
    for (const row of rows) set.add(row.email.trim().toLowerCase());
  } catch {
    // Fallback to env-only when table is not available yet.
  }
  return set;
}

export async function isManagerUser(user: Pick<AuthUser, "role" | "email"> | null | undefined) {
  if (!user) return false;
  if (user.role !== "ADMIN" && user.role !== "TEACHER") return false;
  const set = await getManagerEmailSet();
  if (set.size === 0) return user.role === "ADMIN";
  return set.has(user.email.toLowerCase());
}

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
  const calcBuf = Buffer.from(calc, "utf8");
  const hashBuf = Buffer.from(hash, "utf8");
  if (calcBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(calcBuf, hashBuf);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: { userId, token, expiresAt },
  });

  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { token } });
  }
  c.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
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
    teacherId: u.teacherId ?? null,
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
    throw new Error("unreachable");
  }
  if (user.role === "ADMIN" || user.role === "FINANCE") return user;
  if (await isManagerUser(user)) return user;
  redirect("/admin/login");
  throw new Error("unreachable");
}

export async function requireManager() {
  const user = await requireAdmin();
  if (!(await isManagerUser(user))) redirect("/admin");
  return user;
}

export function isOwnerManager(user: Pick<AuthUser, "role" | "email"> | null | undefined) {
  if (!user || user.role !== "ADMIN") return false;
  const owner = (process.env.OWNER_MANAGER_EMAIL ?? DEFAULT_OWNER_MANAGER_EMAIL).trim().toLowerCase();
  if (!owner) return false;
  return user.email.toLowerCase() === owner;
}

export function isStrictSuperAdmin(user: Pick<AuthUser, "role" | "email" | "name"> | null | undefined) {
  if (!user || user.role !== "ADMIN") return false;
  const email = user.email.trim().toLowerCase();
  const name = user.name.trim().toLowerCase().replace(/\s+/g, " ");
  return email === STRICT_SUPER_ADMIN_EMAIL && name === STRICT_SUPER_ADMIN_NAME;
}

export async function requireOwnerManager() {
  const user = await requireManager();
  if (!isOwnerManager(user)) redirect("/admin/manager/users?err=Only+owner+manager+can+edit");
  return user;
}

export async function requireTeacher(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (user.role === "TEACHER") return user;
  // Allow admin accounts that are linked to a teacher profile to use teacher portal.
  if (user.role === "ADMIN" && user.teacherId) return user;
  redirect("/admin/login");
}

export async function requireTeacherProfile() {
  const user = await requireTeacher();
  if (user.teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: user.teacherId } });
    if (teacher) return { user, teacher };
  }

  // Transitional fallback: existing accounts that were created before User.teacherId.
  const teacherByName = await prisma.teacher.findFirst({ where: { name: user.name } });
  if (teacherByName) {
    await prisma.user.update({
      where: { id: user.id },
      data: { teacherId: teacherByName.id },
    });
    return { user: { ...user, teacherId: teacherByName.id }, teacher: teacherByName };
  }

  return { user, teacher: null };
}
