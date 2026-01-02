"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewEditorPage() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new UUID for the fresh planogram and redirect
    // This ensures every planogram has a unique URL from the start
    const newId = crypto.randomUUID();
    router.replace(`/editor/${newId}`);
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">
        Initializing new planogram...
      </div>
    </div>
  );
}
