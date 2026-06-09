import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Single header pattern for the whole app (documented in docs/NAVIGATION.md):
//
// - Root pages (the 5 bottom-nav tabs) use <PageHeader>: a large title with
//   optional action buttons, no back button — the bottom nav is the way out.
// - Sub pages use <SubPageHeader>: a sticky compact bar with a back link to an
//   EXPLICIT parent href (never router.back(), so the destination is always
//   predictable regardless of how the page was reached), the title, and
//   optional actions.

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center px-4 md:px-8 pt-[max(1.5rem,env(safe-area-inset-top))] mb-8 max-w-5xl mx-auto">
      <h1 className="text-[1.75rem] font-bold tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface SubPageHeaderProps {
  title: string;
  /** Explicit parent route this page returns to. */
  backHref: string;
  /** Accessible label for the back link, e.g. "Volver a inversiones". */
  backLabel: string;
  actions?: React.ReactNode;
}

export function SubPageHeader({
  title,
  backHref,
  backLabel,
  actions,
}: SubPageHeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="inline-flex shrink-0 items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
