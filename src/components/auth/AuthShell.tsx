import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface AuthShellProps {
  children: ReactNode;
  /** Footer prompt + link, e.g. "Already have an account? Sign in" — already-translated nodes. */
  footerPrompt: ReactNode;
  /** Whether to render the marketing intro block. Login: true; register: false. */
  showIntro?: boolean;
}

export async function AuthShell({
  children,
  footerPrompt,
  showIntro = true,
}: AuthShellProps) {
  const t = await getTranslations("auth");

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-pulse-hero-login text-white">
      <Orbits />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-[max(3.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 self-start"
          aria-label="Portfolio"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-white to-[#E0DEFF] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 17l4-4 3 3 7-7M14 9h6v6"
                stroke="#4648D4"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[14px] font-bold tracking-[-0.01em]">Portfolio</span>
        </Link>

        {showIntro && (
          <div className="mt-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/70">
              {t("marketingEyebrow")}
            </div>
            <h1 className="mt-3 whitespace-pre-line text-[36px] font-semibold leading-[1.05] tracking-[-0.025em] text-white">
              {t("marketingHeadline")}
            </h1>
            <p className="mt-3 max-w-xs text-[14px] leading-[1.5] text-white/80">
              {t("marketingBlurb")}
            </p>
          </div>
        )}

        <div className="flex-1" />

        <div className="rounded-[22px] border border-white/[0.22] bg-white/[0.14] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] backdrop-blur-[24px]">
          {children}
        </div>

        <p className="mt-4 text-center text-[12px] text-white/70">{footerPrompt}</p>
      </div>
    </div>
  );
}

function Orbits() {
  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-16 top-16 opacity-[0.22]"
        width={280}
        height={280}
        viewBox="0 0 280 280"
      >
        <circle cx="140" cy="140" r="130" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="140" cy="140" r="100" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="140" cy="140" r="70" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-10 opacity-[0.16]"
        width={240}
        height={240}
        viewBox="0 0 240 240"
      >
        <circle cx="120" cy="120" r="110" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
        <circle cx="120" cy="120" r="80" fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2 6" />
      </svg>
    </>
  );
}
