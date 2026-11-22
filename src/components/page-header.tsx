export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <span className="text-sm text-muted">{eyebrow}</span>}
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}
