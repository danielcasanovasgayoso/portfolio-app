"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { disconnectGmail } from "@/actions/import";

interface GmailConnectCardProps {
  isConnected: boolean;
  canFetch: boolean;
}

export function GmailConnectCard({
  isConnected,
  canFetch,
}: GmailConnectCardProps) {
  const t = useTranslations("import");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnectGmail();
    setIsDisconnecting(false);
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {t("gmailConnection")}
        </CardTitle>
        <CardDescription>
          {t("gmailConnectionDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              {canFetch ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("connected")}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-yellow-500" />
                  <span>{t("connectedNeedRefresh")}</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("disconnect")}
              </Button>
              {!canFetch && (
                <a
                  href="/api/auth/gmail"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  {t("reconnect")}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("connectPrompt")}
            </p>
            <a
              href="/api/auth/gmail"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Mail className="mr-2 h-4 w-4" />
              {t("connectGmail")}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
