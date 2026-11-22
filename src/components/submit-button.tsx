"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary", confirm }: { children: React.ReactNode; className?: string; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Bitte warten …" : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; message?: string } }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{state.error}</p>;
  if (state.message) return <p className="rounded-lg bg-ok-soft px-3 py-2 text-sm text-ok" role="status">{state.message}</p>;
  return null;
}
