import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const jar = await cookies();
  return (
    <AppShell
      initialCollapsed={jar.get("dms-sidebar")?.value === "1"}
      initialDark={jar.get("dms-theme")?.value === "dark"}
      userName={user.name}
    >
      {children}
    </AppShell>
  );
}
