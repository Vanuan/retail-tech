"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { VSTShelfExperience, ShelfExperienceResult } from "@/components/vst-shelf-experience";

export default function ShelfExperiencePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const planogramId = params.id as string;
  const instructions = searchParams.get("instructions") || "Please look at the shelf and select the product you would like to purchase today.";

  const handleComplete = (result: ShelfExperienceResult) => {
    // In a real application, we would send these results to a backend API
    console.log("Shelf Experience Completed:", result);

    // For this prototype, we'll log to console and navigate back to library
    // or a "complete" state if we had one.
    alert(`Task Complete!\n\nSelected: ${result.selectedProduct?.name}\nTime: ${result.timeElapsed}s\nInteractions: ${result.interactionLog.length}`);

    router.push("/");
  };

  if (!planogramId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">Error: No planogram ID provided.</p>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <VSTShelfExperience
        planogramId={planogramId}
        instructions={instructions}
        onComplete={handleComplete}
      />
    </main>
  );
}
