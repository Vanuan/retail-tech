import { RenderContextType, RenderEngineConfig } from '../types/renderer';

/**
 * RENDER ENGINE
 * Platform-specific implementation for graphics context initialization.
 * Handles Canvas2D, WebGL, and ThreeJS setups.
 */
export class RenderEngine {
  private type: RenderContextType;
  private context: any;
  private config: {
    targetFPS: number;
    maxMemoryMB: number;
    enableHardwareAcceleration: boolean;
  };

  constructor(type: RenderContextType) {
    this.type = type;
    this.context = null;
    this.config = {
      targetFPS: 60,
      maxMemoryMB: 512,
      enableHardwareAcceleration: true
    };
  }

  /**
   * Initializes the rendering engine with the provided context and options.
   * @param outputContext The target drawing context (CanvasRenderingContext2D, WebGLRenderingContext, etc.)
   * @param options Configuration options for size and display properties.
   */
  public initialize(outputContext: any, options: RenderEngineConfig): void {
    this.context = outputContext;

    switch (this.type) {
      case 'canvas2d':
        this.initializeCanvas2D(options);
        break;
      case 'webgl':
        this.initializeWebGL(options);
        break;
      case 'threejs':
        this.initializeThreeJS(options);
        break;
      default:
        throw new Error(`Unsupported render engine type: ${this.type}`);
    }
  }

  /**
   * Sets up 2D canvas context defaults.
   */
  private initializeCanvas2D(options: RenderEngineConfig): void {
    const ctx = this.context as CanvasRenderingContext2D;

    if (!ctx) return;

    // Set standard 2D quality properties
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over';

    // Clear the drawing surface
    ctx.clearRect(0, 0, options.width, options.height);

    // Set background if specified
    if (options.clearColor) {
      ctx.fillStyle = options.clearColor;
      ctx.fillRect(0, 0, options.width, options.height);
    }
  }

  /**
   * Sets up WebGL context.
   */
  private initializeWebGL(options: RenderEngineConfig): void {
    const gl = this.context as WebGLRenderingContext;
    if (!gl) return;

    gl.viewport(0, 0, options.width, options.height);

    if (options.clearColor) {
      // Basic white clear for placeholder logic
      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * Sets up ThreeJS renderer.
   */
  private initializeThreeJS(options: RenderEngineConfig): void {
    // In Three.js implementation, this.context is expected to be a THREE.WebGLRenderer
    const renderer = this.context;

    if (renderer && typeof renderer.setSize === 'function') {
      renderer.setSize(options.width, options.height);
      const pixelRatio = options.dpi ? options.dpi / 96 : 1;
      renderer.setPixelRatio(pixelRatio);

      if (options.clearColor) {
        renderer.setClearColor(options.clearColor);
      }
    }
  }

  /**
   * Returns the current drawing context.
   */
  public getContext(): any {
    return this.context;
  }
}
