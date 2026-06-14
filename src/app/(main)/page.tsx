import { redirect } from "next/navigation";

// The app opens on Investments. The cross-domain net worth overview lives at
// /summary and is reachable from the bottom nav.
export default function RootPage() {
  redirect("/investments");
}
