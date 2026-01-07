"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingCart,
  Clock,
  Eye,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { dal } from "@vst/data-access";
import {
  PlanogramConfig,
  ProductMetadata,
  SourceProduct,
} from "@vst/vocabulary-types";
import { PlanogramReadOnlyPreview } from "@/components/publisher/planogram-readonly-preview";
import {
  VSTShelfExperience,
  ShelfExperienceResult,
  InteractionEvent,
} from "@/components/vst-shelf-experience";

// Simulated test configuration
const mockTestConfig = {
  testId: "test-1",
  testName: "Cereal Aisle Endcap Test",
  variantId: "v2",
  variantName: "Premium Placement",
  instructions:
    "You are shopping for breakfast cereal for your family. Browse the shelf and select the product you would most likely purchase.",
  taskType: "purchase_selection",
  timeLimit: 180, // seconds
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ParticipantFlow />
    </Suspense>
  );
}

function ParticipantFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [flowStep, setFlowStep] = useState<
    "welcome" | "loading" | "shelf" | "complete" | "error"
  >("welcome");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [interactionLog, setInteractionLog] = useState<InteractionEvent[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [planogramConfig, setPlanogramConfig] =
    useState<PlanogramConfig | null>(null);
  const [productsMetadata, setProductsMetadata] = useState<ProductMetadata[]>(
    [],
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load planogram data
  useEffect(() => {
    if (!token) {
      setErrorMsg("Missing session token");
      setFlowStep("error");
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        await dal.initialize();
        const config = await dal.planograms.getById(token);
        if (config) {
          setPlanogramConfig(config);

          // Fetch products metadata
          const uniqueSkus = Array.from(
            new Set(config.products.map((p: SourceProduct) => p.sku)),
          );
          const metadata = await Promise.all(
            uniqueSkus.map((sku) => dal.products.getBySku(sku as string)),
          );
          setProductsMetadata(
            metadata.filter(
              (m: ProductMetadata | null): m is ProductMetadata => !!m,
            ),
          );
        } else {
          setErrorMsg("Session not found");
          setFlowStep("error");
        }
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load session data");
        setFlowStep("error");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [token]);

  // Simulate loading progress
  useEffect(() => {
    if (flowStep === "loading") {
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setFlowStep("shelf"), 500);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [flowStep]);

  // Log interactions
  const logInteraction = (action: string, details: any) => {
    const interaction: InteractionEvent = {
      timestamp: Date.now(),
      timeElapsed,
      action,
      details,
    };
    setInteractionLog((prev) => [...prev, interaction]);
  };

  const handleStart = () => {
    if (!planogramConfig && !isLoadingData) {
      // If failed to load earlier
      setErrorMsg("Session data unavailable");
      setFlowStep("error");
      return;
    }
    setFlowStep("loading");
    logInteraction("session_start", { token });
  };

  const handleShelfComplete = (result: ShelfExperienceResult) => {
    setSelectedProduct(result.selectedProduct);
    setTimeElapsed(result.timeElapsed);
    setInteractionLog(result.interactionLog);
    setFlowStep("complete");

    // Simulate postback to panel provider
    console.log(
      "Postback sent to:",
      `https://vst-platform.com/api/postback/${token}/complete`,
    );
    console.log("Interaction data:", result.interactionLog);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Error Screen
  if (flowStep === "error") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8 shadow-xl border-destructive/20">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="mb-2 text-center text-xl font-bold text-foreground">
            Session Error
          </h1>
          <p className="text-center text-muted-foreground">
            {errorMsg || "An unknown error occurred"}
          </p>
        </Card>
      </div>
    );
  }

  // Welcome Screen
  if (flowStep === "welcome") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-2xl p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <ShoppingCart className="h-12 w-12 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
            Virtual Shelf Shopping Experience
          </h1>
          <p className="mb-6 text-center text-muted-foreground">
            Thank you for participating in our retail research study
          </p>

          <div className="mb-8 rounded-lg bg-muted/50 p-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Your Task
            </h2>
            <p className="mb-4 text-sm text-foreground leading-relaxed">
              {mockTestConfig.instructions}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Estimated time: 2-3 minutes</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>Natural shopping behavior</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Important Information
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    Your responses are completely anonymous and will be used for
                    research purposes only
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    We'll track your interactions with the virtual shelf to
                    understand shopping behavior
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    There are no right or wrong answers - shop as you normally
                    would
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>
                    Once you complete the task, you'll receive your incentive
                    from the panel provider
                  </span>
                </li>
              </ul>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleStart}
              disabled={isLoadingData || !planogramConfig}
            >
              {isLoadingData ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  Start Shopping Experience
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Session ID: {token}
          </p>
        </Card>
      </div>
    );
  }

  // Loading Screen
  if (flowStep === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>

          <h2 className="mb-2 text-center text-xl font-semibold text-foreground">
            Loading Virtual Shelf
          </h2>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Preparing your shopping environment...
          </p>

          <Progress value={loadingProgress} className="mb-4" />

          <p className="text-center text-xs text-muted-foreground">
            {loadingProgress}% Complete
          </p>
        </Card>
      </div>
    );
  }

  // Virtual Shelf Screen
  if (flowStep === "shelf" && token) {
    return (
      <VSTShelfExperience
        planogramId={token}
        instructions={mockTestConfig.instructions}
        onComplete={handleShelfComplete}
      />
    );
  }

  // Completion Screen
  if (flowStep === "complete") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-2xl p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>

          <h1 className="mb-2 text-center text-2xl font-bold text-foreground">
            Thank You!
          </h1>
          <p className="mb-8 text-center text-muted-foreground">
            You have successfully completed the shopping experience
          </p>

          <div className="mb-6 rounded-lg bg-muted/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Session Summary
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-card p-4">
                <p className="mb-1 text-xs text-muted-foreground">
                  Your Selection
                </p>
                <p className="font-semibold text-foreground">
                  {selectedProduct?.name}
                </p>
              </div>

              <div className="rounded-lg bg-card p-4">
                <p className="mb-1 text-xs text-muted-foreground">Time Taken</p>
                <p className="font-mono font-semibold text-foreground">
                  {formatTime(timeElapsed)}
                </p>
              </div>

              <div className="rounded-lg bg-card p-4">
                <p className="mb-1 text-xs text-muted-foreground">
                  Interactions
                </p>
                <p className="font-mono font-semibold text-foreground">
                  {interactionLog.length} events
                </p>
              </div>

              <div className="rounded-lg bg-card p-4">
                <p className="mb-1 text-xs text-muted-foreground">
                  Data Status
                </p>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="font-semibold text-green-500">Submitted</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    Completion Confirmed
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Your response has been recorded and your panel provider has
                    been notified. Your incentive will be processed according to
                    their standard timeline.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                What Happens Next?
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">1.</span>
                  <span>
                    Your anonymous data helps retailers understand shopping
                    preferences
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">2.</span>
                  <span>
                    Your panel provider will credit your account with the
                    promised incentive
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">3.</span>
                  <span>You can safely close this window</span>
                </li>
              </ul>
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => window.close()}
            >
              Close Window
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Session ID: {token} • Completed at {new Date().toLocaleTimeString()}
          </p>
        </Card>
      </div>
    );
  }

  return null;
}
