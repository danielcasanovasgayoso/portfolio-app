"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassField } from "./GlassField";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError(t("passwordsNoMatch"));
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError(t("passwordMinLength"));
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4 py-2 text-center text-white">
        <CheckCircle2 className="mx-auto h-12 w-12" />
        <div>
          <h3 className="font-semibold">{t("checkEmail")}</h3>
          <p className="mt-1 text-[13px] text-white/80">
            {t("confirmationSent")}{" "}
            <span className="font-mono font-semibold">{email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/[0.12] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/20"
        >
          {t("backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-xl border border-white/20 bg-loss-muted px-3 py-2 text-[12px] font-medium text-white">
          {error}
        </div>
      )}

      <GlassField
        id="email"
        label={t("email")}
        icon={<Mail className="h-3.5 w-3.5" />}
        type="email"
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="email"
      />

      <GlassField
        id="password"
        label={t("password")}
        icon={<Lock className="h-3.5 w-3.5" />}
        type="password"
        placeholder={t("createPassword")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="new-password"
      />

      <GlassField
        id="confirmPassword"
        label={t("confirmPassword")}
        icon={<Lock className="h-3.5 w-3.5" />}
        type="password"
        placeholder={t("confirmPasswordPlaceholder")}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="new-password"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[14px] font-bold text-primary transition-colors hover:bg-white/90 disabled:opacity-60"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("creatingAccount")}
          </>
        ) : (
          <>
            {t("createAccountButton")}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
