"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateApiKey, removeApiKey } from "@/actions/settings";
import { Check, Loader2, Trash2 } from "lucide-react";

interface ApiKeyFormProps {
  type: "primary";
  currentKey: string | null;
}

export function ApiKeyForm({ type, currentKey }: ApiKeyFormProps) {
  const t = useTranslations("settings");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setIsLoading(true);
    setMessage(null);

    const result = await updateApiKey(type, apiKey.trim());

    if (result.success) {
      setMessage({ type: "success", text: t("apiKeySaved") });
      setApiKey("");
    } else {
      setMessage({ type: "error", text: result.error || "Failed to save" });
    }

    setIsLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    setMessage(null);

    const result = await removeApiKey();

    if (result.success) {
      setMessage({ type: "success", text: t("apiKeyRemoved") });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to remove" });
    }

    setIsRemoving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const placeholder = currentKey
    ? `•••••••••• ${currentKey.slice(-4)}`
    : t("apiKeyEnter");

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          id={`api-key-${type}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-9 font-mono placeholder:font-mono"
        />
        <Button type="submit" size="sm" disabled={isLoading || !apiKey.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
        {currentKey && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving}
            className="h-9 w-9 p-0 text-destructive hover:text-destructive"
            aria-label={t("apiKeyRemoved")}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </form>

      {message && (
        <p
          className={`text-xs ${
            message.type === "success" ? "text-green-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
