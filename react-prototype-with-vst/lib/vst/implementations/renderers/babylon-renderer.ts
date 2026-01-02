import * as BABYLON from "@babylonjs/core";
import {
  IVstRenderer,
  RenderEngineConfig,
  RenderProjection,
} from "../../types/rendering/engine";
import { RenderInstance } from "../../types/rendering/instance";
import { FixtureConfig, ShelfConfig } from "../../types/planogram/config";
import { Vector2, Vector3 } from "../../types/core/geometry";
import { IBrowserAssetProvider } from "../../types/repositories/providers";
import { LabelUtils } from "./shared/label-utils";
import { ShopperCameraInput } from "./shared/shopper-camera-input";

type CameraState = {
  position: BABYLON.Vector3;
  target: BABYLON.Vector3;
};

type CameraMode = "baseline" | "focused" | "free";

/**
 * BabylonRenderer
 *
 * A high-fidelity 3D implementation of IVstRenderer using Babylon.js.
 * Matches the capability and structural interface of TescoRenderer but in 3D.
 */
export class BabylonRenderer implements IVstRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private engine: BABYLON.Engine | null = null;
  private scene: BABYLON.Scene | null = null;
  private camera: BABYLON.UniversalCamera | null = null;
  private assetProvider: IBrowserAssetProvider;

  private currentFixture: FixtureConfig | null = null;
  private currentInstances: RenderInstance[] = [];
  private instanceMap: Map<string, RenderInstance> = new Map();
  private selectedProductId: string | null = null;
  private selectedInstanceIds: Set<string> = new Set();
  private hoveredInstanceId: string | null = null;
  private checkmarkTexture: BABYLON.DynamicTexture | null = null;

  // Mesh caches to avoid re-creating everything on every render call
  private productMeshes: Map<string, BABYLON.AbstractMesh> = new Map();
  private textureCache: Map<string, BABYLON.Texture> = new Map();
  private shelfMeshes: BABYLON.Mesh[] = [];
  private labelMeshes: Map<string, BABYLON.Mesh> = new Map();
  private showPriceLabels: boolean = true;

  // Camera State
  private baselineState: CameraState | null = null;
  private focusedState: CameraState | null = null;
  private mode: CameraMode = "baseline";

  constructor(assetProvider: IBrowserAssetProvider) {
    this.assetProvider = assetProvider;
  }

  setSelection(
    productId: string | null,
    hoveredId: string | null,
    instanceIds: string[] = [],
  ) {
    this.selectedProductId = productId;
    this.hoveredInstanceId = hoveredId;
    this.selectedInstanceIds = new Set(instanceIds);
    this.updateVisualSelection();
  }

  public focusOn(instanceId: string) {
    const inst = this.instanceMap.get(instanceId);
    if (!inst || !this.baselineState) return;

    // Focus Point (Center of instance)
    const focusPoint = new BABYLON.Vector3(
      inst.worldPosition.x + inst.worldDimensions.width / 2,
      inst.worldPosition.y + inst.worldDimensions.height / 2,
      // inst.worldPosition.z, // 0 usually
      inst.worldPosition.z + inst.worldDimensions.depth / 2,

    );

    // Calculate desired camera position
    const baselineY = this.baselineState.position.y;
    // Maintain current zoom level (Z depth)
    const currentZ = this.camera?.position.z ?? focusPoint.z - 1200;

    // Clamp X to aisle width (handled by constraints, but good to target correctly)
    const targetPos = new BABYLON.Vector3(
      focusPoint.x,
      baselineY,
      currentZ,
    );

    this.focusedState = {
      position: targetPos,
      target: focusPoint.clone(),
    };
    this.mode = "focused";
  }

  setShowPriceLabels(show: boolean) {
    this.showPriceLabels = show;
  }

  initialize(el: HTMLElement, config: RenderEngineConfig): void {
    if (this.engine) return; // Already initialized

    if (el instanceof HTMLCanvasElement) {
      this.canvas = el;
    } else {
      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      el.appendChild(canvas);
      this.canvas = canvas;
    }

    this.engine = new BABYLON.Engine(
      this.canvas,
      true,
      {
        preserveDrawingBuffer: true,
        stencil: true,
      },
      true,
    );
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.95, 0.95, 0.95, 1);

    // Default Camera - will be adjusted in render()
    this.camera = new BABYLON.UniversalCamera(
      "camera",
      new BABYLON.Vector3(0, 1600, -2000),
      this.scene,
    );
    this.camera.minZ = 10;
    this.camera.maxZ = 10000;
    this.camera.fov = 0.8;

    // Custom Shopper Input
    this.camera.inputs.clear();
    const shopperInput = new ShopperCameraInput();
    shopperInput.onInteract = () => {
      this.mode = "free";
    };
    this.camera.inputs.add(shopperInput);
    this.camera.attachControl(this.canvas, true);

    // Return to baseline on background click
    this.scene.onPointerObservable.add((pi) => {
      if (
        pi.type === BABYLON.PointerEventTypes.POINTERTAP &&
        pi.event.button === 0
      ) {
        // If pick missed or hit something without product metadata (like floor)
        if (!pi.pickInfo?.hit || !pi.pickInfo.pickedMesh?.metadata) {
          this.mode = "baseline";
        }
      }
    });

    // Constraints Loop
    this.scene.onBeforeRenderObservable.add(() => {
      this.animateCamera();
      this.enforceCameraConstraints();
    });

    // Lighting
    const hemiLight = new BABYLON.HemisphericLight(
      "hemiLight",
      new BABYLON.Vector3(0, 1, 0),
      this.scene,
    );
    hemiLight.intensity = 1.0;

    const dirLight = new BABYLON.DirectionalLight(
      "dirLight",
      new BABYLON.Vector3(-1, -2, -1),
      this.scene,
    );
    dirLight.position = new BABYLON.Vector3(0, 2000, 1000);
    dirLight.intensity = 0.7;

    // Environment
    this.drawEnvironment();

    this.engine.runRenderLoop(() => {
      this.scene?.render();
    });

    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    this.engine?.resize();
  };

  render(
    instances: RenderInstance[],
    fixture: FixtureConfig,
    projection: RenderProjection,
  ): void {
    if (!this.scene) return;

    const fixtureChanged = this.currentFixture !== fixture;
    this.currentFixture = fixture;
    this.currentInstances = instances;
    this.instanceMap.clear();
    instances.forEach((inst) => this.instanceMap.set(inst.id, inst));

    // Update Camera based on projection/fixture if it's the first render or fixture changed
    if (fixtureChanged || this.camera?.radius === 1000) {
      this.setupCamera(fixture);
    }

    // 1. Draw Fixture (Shelves, Backboard)
    if (fixtureChanged || this.shelfMeshes.length === 0) {
      this.drawFixture(fixture);
    }

    // 2. Draw Instances
    this.drawInstances(instances);

    // 3. Draw Price Labels
    this.drawPriceLabels(instances);

    // 4. Update selection highlights
    this.updateVisualSelection();
  }

  private setupCamera(fixture: FixtureConfig) {
    if (!this.camera) return;
    const { width, height } = fixture.dimensions;

    // Shopper starting position
    const centerX = width / 2;
    // Eye height: roughly 1.6m or relative to shelf
    const eyeHeight = height * 0.6;
    const distance = Math.max(width, height) * 1.2;

    const initialPos = new BABYLON.Vector3(centerX, eyeHeight, -distance);
    const initialTarget = new BABYLON.Vector3(centerX, eyeHeight, 0);

    this.camera.position = initialPos.clone();
    this.camera.setTarget(initialTarget.clone());
    // Reset rotation (looking straight ahead)
    this.camera.rotation.x = 0;
    this.camera.rotation.y = 0;

    // Capture baseline
    this.baselineState = {
      position: initialPos.clone(),
      target: initialTarget.clone(),
    };
    this.mode = "baseline";
  }

  private animateCamera() {
    if (!this.camera) return;

    // 1. Focused Mode: Strong guidance to target
    if (this.mode === "focused" && this.focusedState) {
      this.camera.position = BABYLON.Vector3.Lerp(
        this.camera.position,
        this.focusedState.position,
        0.12,
      );
      this.camera.setTarget(
        BABYLON.Vector3.Lerp(
          this.camera.getTarget(),
          this.focusedState.target,
          0.12,
        ),
      );
      return;
    }

    // 2. Baseline Mode: Soft return to aisle viewing parameters
    if (this.mode === "baseline" && this.baselineState) {
      // Dynamic Baseline: Keep current X (user's aisle position)
      // but gently restore Z (distance) and Y (height)
      const targetPos = new BABYLON.Vector3(
        this.camera.position.x,
        this.baselineState.position.y,
        this.baselineState.position.z,
      );

      const targetLook = new BABYLON.Vector3(
        this.camera.position.x,
        this.baselineState.target.y,
        this.baselineState.target.z,
      );

      this.camera.position = BABYLON.Vector3.Lerp(
        this.camera.position,
        targetPos,
        0.05,
      );

      // this.camera.setTarget(
      //   BABYLON.Vector3.Lerp(this.camera.getTarget(), targetLook, 0.05),
      // );
    }
  }

  private enforceCameraConstraints() {
    if (!this.camera) return;

    // 1. Clamp Rotation (Head Tilt)
    // Look up/down limit (+/- 80 deg) - Relaxed for top/bottom shelves
      // this.camera.rotation.x = BABYLON.Scalar.Clamp(
      //   this.camera.rotation.x,
      //   -Math.PI / 2.2,
      //   Math.PI / 2.2,
      // );
      const target = this.camera.getTarget();

      const minTargetY = 200; // bottom shelf comfort
      const maxTargetY = this.currentFixture
        ? this.currentFixture.dimensions.height + 200
        : 3000;

      target.y = BABYLON.Scalar.Clamp(target.y, minTargetY, maxTargetY);
      this.camera.setTarget(target);

    // 2. Clamp Position
    // Z (Depth): -5000 (far) to -400 (close)
    this.camera.position.z = BABYLON.Scalar.Clamp(
      this.camera.position.z,
      -5000,
      -400,
    );

    // X (Sidestep): Constrain to aisle width + margin
    if (this.currentFixture) {
      const w = this.currentFixture.dimensions.width;
      this.camera.position.x = BABYLON.Scalar.Clamp(
        this.camera.position.x,
        -500,
        w + 500,
      );
    }
  }

  private drawEnvironment() {
    if (!this.scene) return;

    // Floor
    const floor = BABYLON.MeshBuilder.CreatePlane(
      "floor",
      { size: 10000 },
      this.scene,
    );
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -100; // Slightly below fixture base
    const floorMat = new BABYLON.PBRMaterial("floorMat", this.scene);
    floorMat.albedoColor = BABYLON.Color3.FromHexString("#cbd5e1");
    floorMat.metallic = 0.1;
    floorMat.roughness = 0.5;
    floor.material = floorMat;
  }

  private drawFixture(fixture: FixtureConfig) {
    if (!this.scene) return;

    // Clear old shelf meshes
    this.shelfMeshes.forEach((m) => m.dispose());
    this.shelfMeshes = [];

    const { width, height } = fixture.dimensions;
    const depth = fixture.dimensions.depth || 450; // Default depth if not specified
    const vProps = fixture.visualProperties;

    // Branded Material (similar to TescoRenderer)
    const backMaterial = new BABYLON.PBRMaterial("backMat", this.scene);
    backMaterial.albedoColor = BABYLON.Color3.FromHexString("#3d1e5f");
    backMaterial.metallic = 0.1;
    backMaterial.roughness = 0.8;

    // Backboard - positioned behind products (Z is depth, extending backwards)
    const backboardThickness = 10;
    const backboard = BABYLON.MeshBuilder.CreateBox(
      "backboard",
      { width, height, depth: backboardThickness },
      this.scene,
    );
    // In VST, depth extends from Z=0 (front) towards positive Z.
    // We place the backboard so its front face is at exactly depth or slightly further.
    backboard.position = new BABYLON.Vector3(
      width / 2,
      height / 2,
      depth + backboardThickness / 2,
    );
    backboard.material = backMaterial;
    this.shelfMeshes.push(backboard);

    // Header section decoration
    const headerHeight = vProps?.dimensions?.headerHeight ?? 120;
    const header = BABYLON.MeshBuilder.CreateBox(
      "header",
      { width, height: headerHeight, depth: 15 },
      this.scene,
    );
    header.position = new BABYLON.Vector3(
      width / 2,
      height - headerHeight / 2,
      depth + 7.5,
    );
    const headerMat = new BABYLON.PBRMaterial("headerMat", this.scene);
    headerMat.albedoColor = BABYLON.Color3.FromHexString("#4a2570");
    header.material = headerMat;
    this.shelfMeshes.push(header);

    // Header Text (Taste the Difference style)
    const dynamicTexture = new BABYLON.DynamicTexture(
      "headerTextTex",
      { width: 512, height: 128 },
      this.scene,
    );
    dynamicTexture.hasAlpha = true;
    dynamicTexture.drawText(
      "taste THE DIFFERENCE",
      null,
      null,
      "italic bold 44px serif",
      "#d4af37",
      "transparent",
      true,
    );

    const headerTextPlane = BABYLON.MeshBuilder.CreatePlane(
      "headerText",
      { width: width * 0.8, height: headerHeight * 0.6 },
      this.scene,
    );
    headerTextPlane.position = new BABYLON.Vector3(
      width / 2,
      height - headerHeight / 2,
      depth + 15.1,
    );
    // Rotate text to face forward (Z-axis negative direction)
    headerTextPlane.rotation.y = Math.PI;
    const headerTextMat = new BABYLON.StandardMaterial(
      "headerTextMat",
      this.scene,
    );
    headerTextMat.diffuseTexture = dynamicTexture;
    headerTextMat.useAlphaFromDiffuseTexture = true;
    headerTextPlane.material = headerTextMat;
    this.shelfMeshes.push(headerTextPlane);

    // Uprights
    const uprightWidth = vProps?.dimensions?.uprightWidth ?? 45;
    const uprightMat = new BABYLON.PBRMaterial("uprightMat", this.scene);
    uprightMat.albedoColor = BABYLON.Color3.FromHexString("#f5f5f5");

    const leftUpright = BABYLON.MeshBuilder.CreateBox(
      "leftUpright",
      { width: uprightWidth, height: height + 100, depth: depth + 20 },
      this.scene,
    );
    leftUpright.position = new BABYLON.Vector3(
      -uprightWidth / 2,
      height / 2,
      depth / 2,
    );
    leftUpright.material = uprightMat;
    this.shelfMeshes.push(leftUpright);

    const rightUpright = BABYLON.MeshBuilder.CreateBox(
      "rightUpright",
      { width: uprightWidth, height: height + 100, depth: depth + 20 },
      this.scene,
    );
    rightUpright.position = new BABYLON.Vector3(
      width + uprightWidth / 2,
      height / 2,
      depth / 2,
    );
    rightUpright.material = uprightMat;
    this.shelfMeshes.push(rightUpright);

    // Shelves
    const shelfMaterial = new BABYLON.PBRMaterial("shelfMat", this.scene);
    shelfMaterial.albedoColor = new BABYLON.Color3(0.95, 0.95, 0.95);
    shelfMaterial.metallic = 0.2;
    shelfMaterial.roughness = 0.3;

    const railMaterial = new BABYLON.StandardMaterial("railMat", this.scene);
    railMaterial.diffuseColor = BABYLON.Color3.FromHexString("#18181b");
    railMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const shelves = (fixture.config.shelves as ShelfConfig[]) || [];
    shelves.forEach((shelf, idx) => {
      const shelfWidth = width;
      const shelfDepth = depth;
      const shelfHeight = 15; // thickness

      const shelfBox = BABYLON.MeshBuilder.CreateBox(
        `shelf_${idx}`,
        { width: shelfWidth, height: shelfHeight, depth: shelfDepth },
        this.scene!,
      );
      shelfBox.position = new BABYLON.Vector3(
        shelfWidth / 2,
        shelf.baseHeight - shelfHeight / 2,
        shelfDepth / 2,
      );
      shelfBox.material = shelfMaterial;
      this.shelfMeshes.push(shelfBox);

      // Price Rail
      const railHeight = vProps?.dimensions?.priceRailHeight ?? 35;
      const rail = BABYLON.MeshBuilder.CreateBox(
        `rail_${idx}`,
        { width: shelfWidth, height: railHeight, depth: 5 },
        this.scene!,
      );
      rail.position = new BABYLON.Vector3(
        shelfWidth / 2,
        shelf.baseHeight - railHeight / 2,
        -2.5, // Front edge is at Z=0
      );
      rail.material = railMaterial;
      this.shelfMeshes.push(rail);

      // --- Space usage indicator ---
      this.drawShelfSpaceUsage(shelf, idx, width, depth);
    });
  }

  private drawShelfSpaceUsage(
    shelf: ShelfConfig,
    index: number,
    fixtureWidth: number,
    fixtureDepth: number,
  ) {
    if (!this.scene) return;

    const shelfInstances = this.currentInstances.filter(
      (inst) =>
        inst.semanticCoordinates.model === "shelf-surface" &&
        inst.semanticCoordinates.shelfIndex === index,
    );

    let shelfSpaceUsed = 0;
    shelfInstances.forEach((inst) => {
      const rightEdge =
        inst.worldPosition.x +
        inst.worldDimensions.width * (1 - inst.anchorPoint.x);
      shelfSpaceUsed = Math.max(shelfSpaceUsed, rightEdge);
    });

    if (shelfSpaceUsed > 0) {
      const usedWidth = shelfSpaceUsed;
      const indicator = BABYLON.MeshBuilder.CreatePlane(
        `usage_${index}`,
        { width: usedWidth, height: 20 },
        this.scene,
      );
      indicator.position = new BABYLON.Vector3(
        usedWidth / 2,
        shelf.baseHeight + 5,
        -5.1, // Front of the shelf
      );

      const mat = new BABYLON.StandardMaterial(`usageMat_${index}`, this.scene);
      mat.diffuseColor = BABYLON.Color3.FromHexString("#d4af37");
      mat.alpha = 0.4;
      indicator.material = mat;
      indicator.isPickable = false;
      this.shelfMeshes.push(indicator);
    }
  }

  private drawInstances(instances: RenderInstance[]) {
    if (!this.scene) return;

    // Track which instances are currently in the scene
    const currentInstanceIds = new Set(instances.map((i) => i.id));

    // Dispose meshes that are no longer present
    for (const [id, mesh] of this.productMeshes.entries()) {
      if (!currentInstanceIds.has(id)) {
        mesh.dispose();
        this.productMeshes.delete(id);
      }
    }

    instances.forEach((inst) => {
      let mesh = this.productMeshes.get(inst.id);

      if (!mesh) {
        mesh = BABYLON.MeshBuilder.CreateBox(
          `prod_${inst.id}`,
          {
            width: inst.worldDimensions.width,
            height: inst.worldDimensions.height,
            depth: inst.worldDimensions.depth,
          },
          this.scene!,
        );
        mesh.metadata = { productId: inst.sourceData.id, instanceId: inst.id };
        this.productMeshes.set(inst.id, mesh);

        // Material
        const mat = new BABYLON.StandardMaterial(`mat_${inst.id}`, this.scene!);
        const spriteUrl = inst.assets.spriteVariants[0]?.url;

        if (spriteUrl) {
          let tex = this.textureCache.get(spriteUrl);
          if (!tex) {
            tex = new BABYLON.Texture(spriteUrl, this.scene);
            tex.anisotropicFilteringLevel = 4;
            this.textureCache.set(spriteUrl, tex);
          }
          mat.diffuseTexture = tex;
          mat.emissiveColor = BABYLON.Color3.White();
          mat.disableLighting = true;
        } else {
          mat.diffuseColor = BABYLON.Color3.FromHexString(
            inst.metadata.visualProperties.materials?.emissiveColor ||
              "#7f1d1d",
          );
        }

        mat.specularColor = BABYLON.Color3.Black();
        mesh.material = mat;
      }

      // Position (VST uses center-bottom usually, Babylon uses center-center for Box)
      // inst.worldPosition is center-bottom.
      // Front row items have z=0. Depth extends towards positive Z.
      mesh.position.x = inst.worldPosition.x;
      mesh.position.y = inst.worldPosition.y + inst.worldDimensions.height / 2;
      mesh.position.z = inst.worldPosition.z + inst.worldDimensions.depth / 2;

      // Selected Checkmark (Individual facing or Product group)
      const isInstanceSelected = this.selectedInstanceIds.has(inst.id);
      const isProductSelected = inst.sourceData.id === this.selectedProductId;

      if (isInstanceSelected || isProductSelected) {
        this.drawCheckmark(inst);
      } else {
        const checkId = `check_${inst.id}`;
        this.scene?.getMeshByName(checkId)?.dispose();
      }
    });
  }

  private drawCheckmark(inst: RenderInstance) {
    if (!this.scene) return;

    const checkId = `check_${inst.id}`;
    let checkMesh = this.scene.getMeshByName(checkId);

    if (!checkMesh) {
      if (!this.checkmarkTexture) {
        this.checkmarkTexture = new BABYLON.DynamicTexture(
          "checkTex",
          { width: 128, height: 128 },
          this.scene,
        );
        this.checkmarkTexture.hasAlpha = true;
        const ctx =
          this.checkmarkTexture.getContext() as CanvasRenderingContext2D;
        // Draw green circle
        ctx.fillStyle = "#10b981"; // emerald-500
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fill();
        // Draw white checkmark
        ctx.strokeStyle = "white";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(35, 65);
        ctx.lineTo(55, 85);
        ctx.lineTo(95, 45);
        ctx.stroke();
        this.checkmarkTexture.update();
      }

      checkMesh = BABYLON.MeshBuilder.CreatePlane(
        checkId,
        { size: 40 },
        this.scene,
      );
      checkMesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
      const mat = new BABYLON.StandardMaterial(`mat_${checkId}`, this.scene);
      mat.diffuseTexture = this.checkmarkTexture;
      mat.useAlphaFromDiffuseTexture = true;
      mat.emissiveColor = BABYLON.Color3.White();
      mat.disableLighting = true;
      checkMesh.material = mat;
    }

    checkMesh.isVisible = true;
    checkMesh.setEnabled(true);
    checkMesh.isPickable = false;
    checkMesh.renderingGroupId = 1; // Ensure it renders on top

    // Position floating in front of product top-center
    checkMesh.position.x = inst.worldPosition.x;
    checkMesh.position.y = inst.worldPosition.y + inst.worldDimensions.height;
    checkMesh.position.z = -50; // In front of everything
  }

  private drawPriceLabels(instances: RenderInstance[]) {
    if (!this.showPriceLabels || !this.currentFixture || !this.scene) {
      this.labelMeshes.forEach((m) => {
        if (m.material) {
          const mat = m.material as BABYLON.StandardMaterial;
          if (mat.diffuseTexture) mat.diffuseTexture.dispose();
          mat.dispose();
        }
        m.dispose();
      });
      this.labelMeshes.clear();
      return;
    }

    // Group by Product ID + Shelf Index (Front row only)
    const groups = new Map<
      string,
      {
        instances: RenderInstance[];
        minX: number;
        maxX: number;
        shelfY: number;
      }
    >();

    instances.forEach((inst) => {
      if (!inst.visualProperties.isFrontRow) return;

      const shelfIndex = (inst.semanticCoordinates as any).shelfIndex ?? 0;
      const key = `${inst.sourceData.id}_${shelfIndex}`;

      if (!groups.has(key)) {
        groups.set(key, {
          instances: [],
          minX: Infinity,
          maxX: -Infinity,
          shelfY: 0,
        });
      }
      const group = groups.get(key)!;
      group.instances.push(inst);

      const x = inst.worldPosition.x;
      const width = inst.worldDimensions.width;
      const left = x - width / 2;
      const right = x + width / 2;

      group.minX = Math.min(group.minX, left);
      group.maxX = Math.max(group.maxX, right);
      group.shelfY = inst.worldPosition.y;
    });

    // Prune unused meshes
    for (const [key, mesh] of this.labelMeshes) {
      if (!groups.has(key)) {
        if (mesh.material) {
          const mat = mesh.material as BABYLON.StandardMaterial;
          if (mat.diffuseTexture) mat.diffuseTexture.dispose();
          mat.dispose();
        }
        mesh.dispose();
        this.labelMeshes.delete(key);
      }
    }

    // Create/Update meshes
    groups.forEach((group, key) => {
      let mesh = this.labelMeshes.get(key);
      const groupWidth = group.maxX - group.minX;
      const vProps = this.currentFixture!.visualProperties;
      const railHeight = vProps?.dimensions?.priceRailHeight ?? 35;

      // Check if we need to rebuild texture (size changed)
      if (mesh) {
        const currentWidth = mesh.metadata?.width || 0;
        if (Math.abs(currentWidth - groupWidth) > 1) {
          if (mesh.material) {
            const mat = mesh.material as BABYLON.StandardMaterial;
            if (mat.diffuseTexture) mat.diffuseTexture.dispose();
            mat.dispose();
          }
          mesh.dispose();
          mesh = undefined;
        }
      }

      if (!mesh) {
        // Create Mesh
        mesh = BABYLON.MeshBuilder.CreatePlane(
          `label_${key}`,
          { width: groupWidth, height: railHeight, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
          this.scene,
        );
        mesh.metadata = { width: groupWidth };
        this.labelMeshes.set(key, mesh);

        // Create Texture (High resolution)
        const scale = 5;
        const texWidth = Math.max(1, Math.ceil(groupWidth * scale));
        const texHeight = Math.ceil(railHeight * scale);

        const texture = new BABYLON.DynamicTexture(
          `tex_${key}`,
          { width: texWidth, height: texHeight },
          this.scene,
          false,
        );
        texture.hasAlpha = true;
        const ctx = texture.getContext();

        LabelUtils.drawBrandedPriceLabel(
          ctx as CanvasRenderingContext2D,
          group.instances[0],
          this.currentFixture!,
          0,
          0,
          texWidth,
          scale,
          scale, // Zoom
          1, // PPI
        );

        texture.update();

        const mat = new BABYLON.StandardMaterial(
          `mat_label_${key}`,
          this.scene!,
        );
        mat.diffuseTexture = texture;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor = BABYLON.Color3.White();
        mat.disableLighting = true;
        mat.specularColor = BABYLON.Color3.Black();
        mesh.material = mat;
      }

      // Update Position
      const centerX = group.minX + groupWidth / 2;
      mesh.position.x = centerX;
      mesh.position.y = group.shelfY - railHeight / 2;
      mesh.position.z = -5.5; // Front of rail
      mesh.rotation.y = 0;
    });
  }

  private updateVisualSelection() {
    if (!this.scene) return;

    this.productMeshes.forEach((mesh) => {
      const instanceId = mesh.metadata?.instanceId;
      const isInstanceSelected =
        instanceId && this.selectedInstanceIds.has(instanceId);
      // Only highlight product group if NO individual instances are selected
      const isProductSelected =
        this.selectedInstanceIds.size === 0 &&
        mesh.metadata?.productId === this.selectedProductId;

      const isSelected = isInstanceSelected || isProductSelected;
      const isHovered = instanceId === this.hoveredInstanceId;

      if (isSelected) {
        mesh.renderOutline = true;
        mesh.outlineColor = BABYLON.Color3.FromHexString("#d4af37");
        mesh.outlineWidth = 0.05;

        if (instanceId) {
          const inst = this.instanceMap.get(instanceId);
          if (inst) {
            this.drawCheckmark(inst);
          } else {
            // Fallback: search in currentInstances array
            const fallback = this.currentInstances.find(
              (i) => i.id === instanceId,
            );
            if (fallback) {
              this.drawCheckmark(fallback);
              // Also add to map to speed up next lookup
              this.instanceMap.set(instanceId, fallback);
            }
          }
        }
      } else if (isHovered) {
        mesh.renderOutline = true;
        mesh.outlineColor = BABYLON.Color3.FromHexString("#3b82f6");
        mesh.outlineWidth = 0.03;

        if (instanceId) {
          const checkId = `check_${instanceId}`;
          this.scene?.getMeshByName(checkId)?.dispose();
        }
      } else {
        mesh.renderOutline = false;

        if (instanceId) {
          const checkId = `check_${instanceId}`;
          this.scene?.getMeshByName(checkId)?.dispose();
        }
      }
    });
  }

  screenToWorld(point: Vector2): Vector3 {
    if (!this.scene || !this.camera) return { x: 0, y: 0, z: 0 };

    const pickResult = this.scene.pick(point.x, point.y);
    if (pickResult.hit && pickResult.pickedPoint) {
      return {
        x: pickResult.pickedPoint.x,
        y: pickResult.pickedPoint.y,
        z: pickResult.pickedPoint.z,
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  worldToScreen(point: Vector3): Vector2 {
    if (!this.scene || !this.engine) return { x: 0, y: 0 };

    const vector = BABYLON.Vector3.Project(
      new BABYLON.Vector3(point.x, point.y, point.z),
      BABYLON.Matrix.Identity(),
      this.scene.getTransformMatrix(),
      this.camera!.viewport.toGlobal(
        this.engine.getRenderWidth(),
        this.engine.getRenderHeight(),
      ),
    );

    return { x: vector.x, y: vector.y };
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.labelMeshes.forEach((m) => {
      if (m.material) {
        const mat = m.material as BABYLON.StandardMaterial;
        if (mat.diffuseTexture) mat.diffuseTexture.dispose();
        mat.dispose();
      }
      m.dispose();
    });
    this.labelMeshes.clear();
    this.textureCache.forEach((t) => t.dispose());
    this.checkmarkTexture?.dispose();
    this.textureCache.clear();
    this.productMeshes.clear();
    this.scene?.dispose();
    this.engine?.dispose();
    this.engine = null;
    this.scene = null;
    this.canvas = null;
  }
}
