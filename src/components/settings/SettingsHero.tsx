import { ArrowLeft, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  GlassLink,
  HeroHeader,
  Pill,
} from "@/components/pulse";
import { getAvatarInitial } from "@/lib/avatarColor";

interface SettingsHeroProps {
  email: string;
  name?: string;
  verified?: boolean;
}

export function SettingsHero({ email, name, verified = false }: SettingsHeroProps) {
  const t = useTranslations("settings");
  const display = name?.trim() || email.split("@")[0] || email;
  const initials = getAvatarInitial(display);

  return (
    <div className="relative">
      <HeroHeader
        left={
          <GlassLink href="/" aria-label={t("backToPortfolio")}>
            <ArrowLeft className="h-4 w-4" />
          </GlassLink>
        }
        center={
          <div className="text-[14px] font-semibold text-white">{t("title")}</div>
        }
        right={null}
      />

      <div className="px-2 pb-2 text-center text-white">
        <div
          className="mx-auto inline-flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-white/30 bg-white/[0.18] text-[26px] font-bold"
          aria-hidden
        >
          {initials}
        </div>
        <div className="mt-3 text-[18px] font-semibold tracking-[-0.01em]">
          {display}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-white/70">{email}</div>
        {verified && (
          <div className="mt-3 flex justify-center">
            <Pill variant="gain" icon={<Check className="h-3 w-3" />}>
              {t("verified")}
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
