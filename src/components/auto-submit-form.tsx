"use client";

import { useRef } from "react";

/** GET-Formular, das sich bei Änderung eines Auswahlfelds selbst absendet (funktioniert auch ohne JS über den Knopf). */
export function AutoSubmitForm({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      method="get"
      className={className}
      onChange={(e) => {
        const t = e.target as HTMLElement;
        if (t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type === "checkbox")) ref.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
