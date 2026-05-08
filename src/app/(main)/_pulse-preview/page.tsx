import { notFound } from "next/navigation";
import { PulsePreview } from "./PulsePreview";

export default function PulsePreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <PulsePreview />;
}
