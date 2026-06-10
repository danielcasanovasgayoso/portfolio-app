/// <reference types="react/canary" />
import { ViewTransition } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider initialTheme="system">
      <ViewTransition>{children}</ViewTransition>
      <BottomNav />
    </ThemeProvider>
  );
}
