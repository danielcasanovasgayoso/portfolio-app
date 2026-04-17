import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider initialTheme="system">
      {children}
      <BottomNav />
    </ThemeProvider>
  );
}
