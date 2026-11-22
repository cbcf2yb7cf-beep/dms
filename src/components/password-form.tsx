"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/account";
import { FormMessage, SubmitButton } from "./submit-button";

export function PasswordForm() {
  const [state, formAction] = useActionState(changePassword, undefined);
  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div>
        <label htmlFor="pw-current" className="label">Aktuelles Passwort</label>
        <input id="pw-current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label htmlFor="pw-next" className="label">Neues Passwort (mind. 12 Zeichen)</label>
        <input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={12} required className="input" />
      </div>
      <div>
        <label htmlFor="pw-repeat" className="label">Neues Passwort wiederholen</label>
        <input id="pw-repeat" name="repeat" type="password" autoComplete="new-password" minLength={12} required className="input" />
      </div>
      <FormMessage state={state} />
      <div><SubmitButton>Passwort ändern</SubmitButton></div>
    </form>
  );
}
