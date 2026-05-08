import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <AuthShell
      showIntro={false}
      footerPrompt={
        <>
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-white underline-offset-2 hover:underline">
            {t("signIn")}
          </Link>
        </>
      }
    >
      <div className="mb-3 text-center">
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-white">
          {t("createAccount")}
        </h2>
        <p className="mt-1 text-[12px] text-white/70">{t("startTracking")}</p>
      </div>

      <RegisterForm />

      <div className="my-3.5 flex items-center gap-2.5">
        <span className="h-px flex-1 bg-white/20" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-white/60">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-white/20" aria-hidden />
      </div>

      <GoogleButton mode="signup" />
    </AuthShell>
  );
}
