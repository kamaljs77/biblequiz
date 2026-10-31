"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export default function AccountPage() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <div className="max-w-md space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Account</h1>
      <form action={action} className="card space-y-4 p-5">
        <h2 className="font-semibold">Change password</h2>
        {[
          ["current", "Current password", "current-password"],
          ["next", "New password", "new-password"],
          ["confirm", "Confirm new password", "new-password"],
        ].map(([name, label, ac]) => (
          <div key={name}>
            <label htmlFor={name} className="label">
              {label}
            </label>
            <input id={name} name={name} type="password" className="input" autoComplete={ac} required />
          </div>
        ))}
        {state?.error && <p className="text-sm text-bad">{state.error}</p>}
        {state?.ok && <p className="text-sm text-good">Password changed.</p>}
        <button className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </form>
    </div>
  );
}
