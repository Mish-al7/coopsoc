"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register } from "@/app/actions/auth";
import { useT } from "./lang";

function PasswordInput({ name, autoComplete }: { name: string; autoComplete: string }) {
  const { t } = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={name} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="input pr-24" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-2.5 text-sm font-semibold text-muted hover:text-brand-dark"
      >
        {show ? t("auth.hide") : t("auth.show")}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { t } = useT();
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && (
        <p className="alert alert-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <div>
        <label htmlFor="email" className="label">
          {t("auth.email")}
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.email} className="input" placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("auth.password")}
        </label>
        <PasswordInput name="password" autoComplete="current-password" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? t("auth.loggingIn") : t("auth.loginBtn")}
      </button>
      <p className="text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-semibold text-brand-dark underline-offset-4 hover:underline">
          {t("auth.registerLink")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const { t } = useT();
  const [state, action, pending] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="alert alert-error" role="alert">
          {t(state.error)}
        </p>
      )}
      <div>
        <label htmlFor="name" className="label">
          {t("auth.name")}
        </label>
        <input id="name" name="name" autoComplete="name" required defaultValue={state?.name} className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          {t("auth.email")}
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required defaultValue={state?.email} className="input" placeholder="you@example.com" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("auth.passwordNew")}
        </label>
        <PasswordInput name="password" autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">
          {t("auth.confirm")}
        </label>
        <PasswordInput name="confirm" autoComplete="new-password" />
      </div>
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? t("auth.registering") : t("auth.registerBtn")}
      </button>
      <p className="text-center text-sm text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-brand-dark underline-offset-4 hover:underline">
          {t("auth.loginLink")}
        </Link>
      </p>
    </form>
  );
}
