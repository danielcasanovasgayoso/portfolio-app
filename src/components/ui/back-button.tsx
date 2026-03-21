"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({ label }: { label: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      aria-label={label}
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-muted transition-colors"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
