import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

type ShellSize = "narrow" | "default" | "wide";

const WIDTHS: Record<ShellSize, string> = {
  narrow: "max-w-2xl", // single-column forms (Settings)
  default: "max-w-4xl", // lists and forms (History, Reports, Staff, Tables, ...)
  wide: "max-w-375", // grids (Dashboard, Menu)
};

/** The one page container every dashboard page uses: same width scale, same padding. */
export function pageShell(size: ShellSize = "default") {
  return `mx-auto w-full ${WIDTHS[size]} px-5 py-6 md:px-10 md:py-8`;
}

/**
 * The one page heading every dashboard page uses: title, optional one-line
 * subtitle, optional back link, and an actions slot on the right (it drops
 * under the title on a phone).
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70"
        >
          <ArrowLeft size={13} />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>

          {subtitle && <p className="mt-1 text-sm text-white/45">{subtitle}</p>}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
