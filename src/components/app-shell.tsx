"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { NAV, SETTINGS_NAV } from "@/lib/nav";
import { logout } from "@/lib/actions/account";
import { NavIcon } from "./nav-icon";
import { CommandPalette, openSearch } from "./command-palette";

const YEAR = 60 * 60 * 24 * 365;
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  initialCollapsed,
  initialDark,
  userName,
  local,
  children,
}: {
  initialCollapsed: boolean;
  initialDark: boolean;
  userName: string;
  /** Mac-App: kein Abmelden. */
  local: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(initialDark);

  // Beim Seitenwechsel die mobile Navigation schließen.
  useEffect(() => setMobileOpen(false), [pathname]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      setCookie("dms-sidebar", c ? "0" : "1");
      return !c;
    });
  }

  function toggleTheme() {
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      setCookie("dms-theme", d ? "light" : "dark");
      return !d;
    });
  }

  const nav = (compact: boolean) => (
    <>
      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={item.label} icon={item.icon} compact={compact} active={isActive(pathname, item.href)} />
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <NavLink href={SETTINGS_NAV.href} label={SETTINGS_NAV.label} icon={SETTINGS_NAV.icon} compact={compact} active={isActive(pathname, SETTINGS_NAV.href)} />
        <button type="button" onClick={toggleTheme} className={navItemClass(false, compact)} aria-label={compact ? (dark ? "Helle Ansicht" : "Dunkle Ansicht") : undefined} title={compact ? (dark ? "Helle Ansicht" : "Dunkle Ansicht") : undefined}>
          {dark ? <Sun className="size-5 shrink-0" aria-hidden="true" strokeWidth={1.75} /> : <Moon className="size-5 shrink-0" aria-hidden="true" strokeWidth={1.75} />}
          {!compact && <span>{dark ? "Helle Ansicht" : "Dunkle Ansicht"}</span>}
        </button>
        {!local && (
        <form action={logout}>
          <button type="submit" className={navItemClass(false, compact)} aria-label={compact ? "Abmelden" : undefined} title={compact ? `Abmelden (${userName})` : undefined}>
            <LogOut className="size-5 shrink-0" aria-hidden="true" strokeWidth={1.75} />
            {!compact && <span className="truncate">Abmelden <span className="text-muted">· {userName}</span></span>}
          </button>
        </form>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop: ausklappbare Seitenleiste */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 print:!hidden flex-col border-r border-border bg-surface/60 transition-[width] duration-200 md:flex ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        <div className={`flex items-center gap-2 px-4 pt-5 pb-4 ${collapsed ? "flex-col" : "justify-between"}`}>
          <Link href="/" className="flex min-h-11 items-center gap-2.5 rounded-lg px-1" aria-label="DMS – zum Dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            {!collapsed && <span className="font-serif text-xl font-semibold tracking-tight">DMS</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
            aria-label={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
            aria-expanded={!collapsed}
            title={collapsed ? "Navigation ausklappen" : "Navigation einklappen"}
          >
            {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" strokeWidth={1.75} /> : <PanelLeftClose className="size-5" aria-hidden="true" strokeWidth={1.75} />}
          </button>
        </div>
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={openSearch}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-bg px-3 text-sm text-muted hover:border-border-strong ${collapsed ? "justify-center" : ""}`}
            aria-label="Suchen"
            title={collapsed ? "Suchen (⌘K)" : undefined}
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Suchen</span>
                <kbd className="rounded border border-border px-1.5 py-0.5 font-sans text-xs">⌘K</kbd>
              </>
            )}
          </button>
        </div>
        <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col overflow-y-auto px-3 pb-4">
          {nav(collapsed)}
        </nav>
      </aside>

      {/* Mobil: Kopfzeile + Schublade */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-3 py-2 backdrop-blur md:hidden print:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2" aria-label="Navigation öffnen" aria-expanded={mobileOpen}>
            <Menu className="size-6" aria-hidden="true" />
          </button>
          <Link href="/" className="font-serif text-lg font-semibold">DMS</Link>
          <button type="button" onClick={openSearch} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2" aria-label="Suchen">
            <Search className="size-5" aria-hidden="true" />
          </button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Navigation schließen" onClick={() => setMobileOpen(false)} />
            <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface px-3 pt-3 pb-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-serif text-xl font-semibold">DMS</span>
                <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-2" aria-label="Navigation schließen">
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Hauptnavigation" className="flex flex-1 flex-col overflow-y-auto">{nav(false)}</nav>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette />
    </div>
  );
}

function navItemClass(active: boolean, compact: boolean) {
  return `flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${compact ? "justify-center" : ""} ${
    active ? "bg-accent-soft font-semibold text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
  }`;
}

function NavLink({ href, label, icon, compact, active }: { href: string; label: string; icon: Parameters<typeof NavIcon>[0]["name"]; compact: boolean; active: boolean }) {
  return (
    <Link href={href} className={navItemClass(active, compact)} aria-current={active ? "page" : undefined} aria-label={compact ? label : undefined} title={compact ? label : undefined}>
      <NavIcon name={icon} className={`size-5 shrink-0 ${active ? "text-accent" : ""}`} />
      {!compact && <span>{label}</span>}
    </Link>
  );
}
