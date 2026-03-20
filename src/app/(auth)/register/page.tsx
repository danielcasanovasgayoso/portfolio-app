import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Create an account</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start tracking your portfolio
        </p>
      </div>

      <RegisterForm />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleButton mode="signup" />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
