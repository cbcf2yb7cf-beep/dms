import { NavIcon } from "./nav-icon";
import type { NavIcon as NavIconName } from "@/lib/nav";
import { PageHeader } from "./page-header";

/** Ehrlicher Platzhalter für Bereiche, die in einer späteren Phase gebaut werden. */
export function ComingSoon({ icon, title, phase, intro, features }: { icon: NavIconName; title: string; phase: number; intro: string; features: string[] }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-10 sm:px-10">
      <PageHeader title={title} />
      <section className="card flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <NavIcon name={icon} className="size-5" />
          </span>
          <span className="rounded-full border border-border-strong px-3 py-1 text-sm text-ink-2">Noch nicht gebaut · Phase {phase}</span>
        </div>
        <p className="text-[17px] leading-relaxed text-ink-2">{intro}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex gap-2 text-[15px] text-ink-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
