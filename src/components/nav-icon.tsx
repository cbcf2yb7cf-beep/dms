import { BookOpen, FileText, LayoutDashboard, Presentation, Settings, Sparkles, Tags } from "lucide-react";
import type { NavIcon as NavIconName } from "@/lib/nav";

const ICONS = {
  dashboard: LayoutDashboard,
  archive: FileText,
  bible: BookOpen,
  tags: Tags,
  slides: Presentation,
  sparkles: Sparkles,
  settings: Settings,
} as const;

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
