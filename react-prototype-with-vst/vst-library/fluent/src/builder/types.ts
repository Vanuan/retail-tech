import {
  ICoreProcessor,
  PlanogramConfig,
  ProductMetadata,
  PlanogramAction,
} from "@vst/vocabulary-types";

export interface PlanogramBuilderOptions {
  processor: ICoreProcessor;
  strict?: boolean;
}

export interface BuildContext {
  config: PlanogramConfig;
  metadata: Map<string, ProductMetadata>;
  actions: readonly PlanogramAction[];
}
