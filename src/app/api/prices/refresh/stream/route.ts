import { after } from "next/server";
import { getUserId } from "@/lib/auth";
import { refreshAllPrices, backfillAllHistoricalPrices } from "@/services/price.service";
import { revalidatePath } from "next/cache";
import type { SSEEvent } from "@/types/price-refresh";

export const dynamic = "force-dynamic";

function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  let userId: string;
  try {
    userId = await getUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await refreshAllPrices(
          userId,
          { forceRefresh: true },
          (event: SSEEvent) => {
            controller.enqueue(encoder.encode(formatSSE(event)));
          }
        );

        revalidatePath("/");
        revalidatePath("/portfolio", "layout");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(formatSSE({ type: "done", updated: 0, errors: 1 }))
        );
        console.error("[SSE] Stream error:", msg);
      } finally {
        controller.close();
      }

      after(async () => {
        try {
          await backfillAllHistoricalPrices(userId);
        } catch (error) {
          console.error("[SSE] Background backfill failed:", error);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
