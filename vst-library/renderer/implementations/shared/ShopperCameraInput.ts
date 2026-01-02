import * as BABYLON from "@babylonjs/core";

/**
 * ShopperCameraInput
 *
 * Implements the "Shopper" interaction model:
 * - Standing in front of the shelf (AISLE_X axis)
 * - Looking at the shelf (SHELF_Z axis)
 * - Movement is constrained to axis-aligned translation (Sidestep X, Lean Z)
 * - Rotation simulates head movement (Look X/Y)
 *
 * Input Mappings:
 * 1. Desktop:
 *    - Left Click Drag: Look around
 *    - Shift + Left Click Drag: Sidestep (Pan X)
 *    - Scroll Wheel: Lean in/out (Move Z)
 *
 * 2. Touch:
 *    - 1 Finger: Look around
 *    - 2 Fingers: Pinch to Lean (Move Z) + Drag to Sidestep (Pan X)
 */
export class ShopperCameraInput
  implements BABYLON.ICameraInput<BABYLON.UniversalCamera>
{
  public camera: BABYLON.UniversalCamera | null = null;

  // Sensitivities (Higher = Slower/Less Sensitive usually, dependent on implementation)
  public angularSensibility = 1000.0;
  public panSensibility = 200.0; // Pixels per unit
  public zoomSensibility = 5.0; // Wheel steps per unit
  public pinchSensibility = 50.0; // Pixels per unit

  public onInteract?: () => void;

  private _onPointerObserver: BABYLON.Nullable<
    BABYLON.Observer<BABYLON.PointerInfo>
  > = null;
  private _element: HTMLElement | null = null;

  // State
  private _pointerMap = new Map<
    number,
    { x: number; y: number; type: string }
  >();
  private _previousMultiTouch: {
    distance: number;
    center: { x: number; y: number };
  } | null = null;

  // State for stable zoom targeting
  private _focusTarget: BABYLON.Vector3 | null = null;

  public getClassName(): string {
    return "ShopperCameraInput";
  }

  public getSimpleName(): string {
    return "shopper";
  }

  public attachControl(noPreventDefault?: boolean): void {
    if (!this.camera) return;
    const scene = this.camera.getScene();
    this._element = this.camera.getEngine().getInputElement();

    this._onPointerObserver = scene.onPointerObservable.add((pi) => {
      this._handlePointer(pi);
    });
  }

  public detachControl(): void {
    if (!this.camera) return;
    const scene = this.camera.getScene();

    if (this._onPointerObserver) {
      scene.onPointerObservable.remove(this._onPointerObserver);
      this._onPointerObserver = null;
    }

    this._pointerMap.clear();
    this._previousMultiTouch = null;
  }

  public checkInputs(): void {
    // Not using polling
  }

  private _handlePointer(pi: BABYLON.PointerInfo) {
    if (!this.camera || !this._element) return;

    switch (pi.type) {
      case BABYLON.PointerEventTypes.POINTERDOWN:
        if (pi.event.target === this._element) {
          this._pointerMap.set(pi.event.pointerId, {
            x: pi.event.x,
            y: pi.event.y,
            type: pi.event.pointerType,
          });
          // Capture pointer to ensure we get up events outside canvas
          this._element.setPointerCapture(pi.event.pointerId);
        }
        break;

      case BABYLON.PointerEventTypes.POINTERUP:
        this._pointerMap.delete(pi.event.pointerId);
        this._element.releasePointerCapture(pi.event.pointerId);
        if (this._pointerMap.size < 2) {
          this._previousMultiTouch = null;
        }
        break;

      case BABYLON.PointerEventTypes.POINTERMOVE:
        this._onPointerMove(pi);
        break;

      case BABYLON.PointerEventTypes.POINTERWHEEL:
        this._onPointerWheel(pi);
        break;
    }
  }

  private _onPointerMove(pi: BABYLON.PointerInfo) {
    if (!this.camera) return;

    // Update current pointer position in map
    const prevPtr = this._pointerMap.get(pi.event.pointerId);
    if (!prevPtr) return; // Pointer not tracked (e.g. started outside)

    const currentX = pi.event.x;
    const currentY = pi.event.y;

    // --- 1. Touch Handling (Multi-touch priority) ---
    if (this._pointerMap.size === 2 && pi.event.pointerType === "touch") {
      // Get the two pointers
      const iterator = this._pointerMap.values();
      const p1 = iterator.next().value;
      const p2 = iterator.next().value;

      // Current positions (one of them is the moving one, we use event data for latest)
      const p1Curr =
        pi.event.pointerId === Array.from(this._pointerMap.keys())[0]
          ? { x: currentX, y: currentY }
          : p1;
      const p2Curr =
        pi.event.pointerId === Array.from(this._pointerMap.keys())[1]
          ? { x: currentX, y: currentY }
          : p2;

      const dx = p1Curr.x - p2Curr.x;
      const dy = p1Curr.y - p2Curr.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const centerX = (p1Curr.x + p2Curr.x) / 2;
      const centerY = (p1Curr.y + p2Curr.y) / 2;

      if (this._previousMultiTouch) {
        // A. Pinch (Exponential)
        if (this._previousMultiTouch.distance > 0) {
          const scale = distance / this._previousMultiTouch.distance;
          // Spreading (scale > 1) -> Zoom In -> Z magnitude decreases (closer to 0)
          // Pinching (scale < 1) -> Zoom Out -> Z magnitude increases (further from 0)
          this.camera.position.z /= scale;
        }

        // B. Pan (Center X delta) -> X Translation
        const centerDeltaX = centerX - this._previousMultiTouch.center.x;
        // Dragging left (negative delta) moves camera left (negative X).
        this.camera.position.x -= centerDeltaX / this.panSensibility;

        this.onInteract?.();
        this._focusTarget = null;
      }

      this._previousMultiTouch = {
        distance,
        center: { x: centerX, y: centerY },
      };

      // Update map entry for next frame
      this._pointerMap.set(pi.event.pointerId, {
        x: currentX,
        y: currentY,
        type: pi.event.pointerType,
      });
      return;
    }

    // --- 2. Single Pointer Handling ---
    if (this._pointerMap.size === 1) {
      const deltaX = currentX - prevPtr.x;
      const deltaY = currentY - prevPtr.y;

      // Logic: Mouse + Shift OR just Mouse Drag
      const evt = pi.event as PointerEvent;
      const isShift = evt.shiftKey;

      if (isShift) {
        // Sidestep (Pan X)
        // Drag right (pos delta) -> Move left (sub from X) to keep object under cursor
        // OR Drag right -> Move right (strafe).
        // Standard "Grab" pan: Drag Left moves Camera Right.
        this.camera.position.x -= deltaX / this.panSensibility;
      } else {
        // Look (Rotation)
        // Drag Right -> Rotate Right (Pos Y)
        // Drag Down -> Rotate Down (Pos X)
        this.camera.rotation.y += deltaX / this.angularSensibility;
        this.camera.rotation.x += deltaY / this.angularSensibility;
      }

      this.onInteract?.();
      this._focusTarget = null;

      // Update map
      this._pointerMap.set(pi.event.pointerId, {
        x: currentX,
        y: currentY,
        type: pi.event.pointerType,
      });
    }
  }

  private _onPointerWheel(pi: BABYLON.PointerInfo) {
    if (!this.camera) return;

    this.onInteract?.();

    const event = pi.event as WheelEvent;
    const delta = event.deltaY;
    const scene = this.camera.getScene();

    // Exponential Zoom (Snappier)
    // Wheel Up (delta < 0) -> Zoom In -> factor < 1
    const factor = Math.pow(1.001, delta);
    //if (!this._focusTarget) {
    this.camera.position.z *= factor;
    //}

    // Smart Orientation Adjustment
    if (delta < 0) {
      // ZOOM IN: Phase 1 - Picking
      if (!this._focusTarget) {
        const ray = scene.createPickingRay(
          event.offsetX,
          event.offsetY,
          BABYLON.Matrix.Identity(),
          this.camera,
        );

        const pick = scene.pickWithRay(ray);
        if (pick && pick.hit && pick.pickedMesh) {
          this._focusTarget =
            pick.pickedMesh.getBoundingInfo().boundingBox.centerWorld;
        } else {
          // Fallback to plane if missed mesh
          if (ray.direction.z > 0.001) {
            const t = -ray.origin.z / ray.direction.z;
            if (t > 0) {
              this._focusTarget = ray.origin.add(ray.direction.scale(t));
            }
          }
        }
      }

      // Phase 2 - Motion towards target
      if (this._focusTarget) {
        // Move toward target (Z only – your aisle constraint)
        this.camera.position.z *= factor;

        // Lock orientation to target
        this.camera.setTarget(this._focusTarget);

        this._focusTarget.y = BABYLON.Scalar.Clamp(
          this._focusTarget.y,
          200,
          3000,
        );
      }
    } else {
      // ZOOM OUT: Relax back to baseline (looking straight/level)
      this._focusTarget = null;

      // This prevents "looking at floor" when zooming out from bottom shelf
      const decay = 0.1;
      this.camera.rotation.x *= 1.0 - decay;
      this.camera.rotation.y *= 1.0 - decay;
    }

    // Prevent page scroll
    event.preventDefault();
  }
}
