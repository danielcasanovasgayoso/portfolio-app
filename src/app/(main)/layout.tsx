import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSettings } from "@/actions/settings";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <ThemeProvider initialTheme={settings.theme as "light" | "dark" | "system"}>
      {children}
      <BottomNav />
    </ThemeProvider>
  );
}
