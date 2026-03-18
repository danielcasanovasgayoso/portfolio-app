import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TransactionsPage() {
  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/" aria-label="Back to portfolio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Transactions
          </h1>
        </div>
      </header>

      <main className="p-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Coming in Phase 2</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Transaction management with filtering, pagination, and CRUD
              operations will be available in Phase 2.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
