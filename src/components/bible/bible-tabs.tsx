import Link from "next/link";

const TABS = [
  ["/bibel", "Lesen"],
  ["/bibel/suche", "Konkordanz"],
  ["/bibel/merkliste", "Merkliste"],
  ["/bibel/quellen", "Quellen & Lizenzen"],
] as const;

export function BibleTabs({ active }: { active: (typeof TABS)[number][0] }) {
  return (
    <nav aria-label="Bibel" className="flex flex-wrap gap-1 border-b border-border print:hidden">
      {TABS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] ${active === href ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
