"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <h1 className="font-serif text-2xl font-semibold">Admin sign in</h1>
      <form action={action} className="card space-y-4 p-5">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        {state?.error && <p className="text-sm text-bad">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
