import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "./db";
import { User } from "./models";

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

async function sessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** `superAdmin` = an office admin who may also change site settings (fee, payment QR). */
export type CurrentUser = { id: string; name: string; email: string; role: "member" | "admin"; superAdmin: boolean };

/** Reads the logged-in user from the database (role is always fresh). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const id = await sessionUserId();
  if (!id) return null;
  await connectDB();
  const u = await User.findById(id).lean();
  if (!u) return null;
  const role = u.role as CurrentUser["role"];
  return { id: String(u._id), name: u.name, email: u.email, role, superAdmin: role === "admin" && isSuperAdminEmail(u.email) };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const u = await requireAdmin();
  if (!u.superAdmin) redirect("/admin");
  return u;
}

const emailList = (v: string | undefined) =>
  (v || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export function isSuperAdminEmail(email: string) {
  return emailList(process.env.SUPER_ADMIN_EMAILS).includes(email.toLowerCase());
}

/** Super admins are admins too. */
export function isAdminEmail(email: string) {
  return emailList(process.env.ADMIN_EMAILS).includes(email.toLowerCase()) || isSuperAdminEmail(email);
}
