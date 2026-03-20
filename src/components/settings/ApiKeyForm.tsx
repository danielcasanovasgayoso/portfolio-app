"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateApiKey, removeApiKey } from "@/actions/settings";
import { Check, Loader2, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKeyFormProps {
  type: "primary" | "backup";
  currentKey: string | null;
  label: string;
}

export function ApiKeyForm({ type, currentKey, label }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
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
      setMessage({ type: "success", text: "API key saved successfully" });
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

    const result = await removeApiKey(type);

    if (result.success) {
      setMessage({ type: "success", text: "API key removed" });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to remove" });
    }

    setIsRemoving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={`api-key-${type}`}>{label}</Label>
        {currentKey && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            {isRemoving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {currentKey && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <code className="text-sm flex-1 font-mono">
            {showKey ? currentKey : "••••••••••••••••••••••••"}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKey(!showKey)}
            className="h-7 w-7 p-0"
          >
            {showKey ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          id={`api-key-${type}`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={currentKey ? "Enter new key to replace" : "Enter API key"}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !apiKey.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </form>

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-destructive"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
