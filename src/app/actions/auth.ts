"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { createSession, deleteSession, isAdminEmail } from "@/lib/session";

/** `error` is an i18n key. */
export type AuthState = { error?: string; email?: string; name?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Used so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function safeNext(next: FormDataEntryValue | null): string | null {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

export async function register(_: AuthState, fd: FormData): Promise<AuthState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const back = { name, email };

  if (name.length < 2) return { ...back, error: "err.nameRequired" };
  if (!EMAIL_RE.test(email)) return { ...back, error: "err.email" };
  if (password.length < 8) return { ...back, error: "err.passwordShort" };
  if (password !== confirm) return { ...back, error: "err.passwordMismatch" };

  await connectDB();
  if (await User.exists({ email })) return { ...back, error: "err.emailTaken" };

  const role = isAdminEmail(email) ? "admin" : "member";
  let userId: string;
  try {
    const u = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role });
    userId = String(u._id);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { ...back, error: "err.emailTaken" };
    throw e;
  }
  await createSession(userId);
  redirect(role === "admin" ? "/admin" : "/apply");
}

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { email, error: "err.loginRequired" };

  await connectDB();
  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { email, error: "err.loginFailed" };

  if (user.role !== "admin" && isAdminEmail(email)) {
    user.role = "admin";
    await user.save();
  }
  await createSession(String(user._id));
  redirect(safeNext(fd.get("next")) ?? (user.role === "admin" ? "/admin" : "/dashboard"));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
