import { SubPageHeaderSkeleton, PropertyFormSkeleton } from "@/components/skeletons";

export default function AddPropertyLoading() {
  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeaderSkeleton />
      <main className="p-4 max-w-3xl mx-auto">
        <PropertyFormSkeleton />
      </main>
    </div>
  );
}
