import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell
      showIntro
      footerPrompt={
        <>
          {t("noAccount")}{" "}
          <Link href="/register" className="font-semibold text-white underline-offset-2 hover:underline">
            {t("signUp")}
          </Link>
        </>
      }
    >
      <LoginForm />

      <div className="my-3.5 flex items-center gap-2.5">
        <span className="h-px flex-1 bg-white/20" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/60">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-white/20" aria-hidden />
      </div>

      <GoogleButton />
    </AuthShell>
  );
}
