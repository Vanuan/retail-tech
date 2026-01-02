"use client";

import { Suspense, use } from "react";
import { VSTPlanogramEditor } from "@/components/vst-planogram-editor";

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <VSTPlanogramEditor planogramId={id} />
    </Suspense>
  );
}
