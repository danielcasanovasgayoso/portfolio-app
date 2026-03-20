import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication | Portfolio",
  description: "Sign in or create an account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your investments with precision
          </p>
        </div>

        {/* Auth Form Container */}
        <div className="terminal-card p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
