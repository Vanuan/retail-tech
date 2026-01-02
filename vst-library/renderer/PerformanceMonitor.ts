import { FrameMetrics, SystemMetrics } from '../types/renderer';

/**
 * PERFORMANCE MONITOR
 * Tracks and aggregates real-time rendering performance data.
 * Useful for identifying bottlenecks, monitoring memory usage,
 * and ensuring target FPS is maintained across different devices.
 */
export class PerformanceMonitor {
  private frameHistory: FrameMetrics[] = [];
  private readonly maxHistory: number = 60; // Store roughly 1 second of frames at 60fps

  /**
   * Records metrics for the most recent frame.
   * @param metrics Performance data captured during the render loop.
   */
  public recordFrame(metrics: Omit<FrameMetrics, 'timestamp'>): void {
    const frame: FrameMetrics = {
      ...metrics,
      timestamp: performance.now(),
    };

    this.frameHistory.push(frame);

    // Maintain the rolling window size
    if (this.frameHistory.length > this.maxHistory) {
      this.frameHistory.shift();
    }
  }

  /**
   * Calculates aggregated metrics from the current frame history.
   * @returns System-level performance summary.
   */
  public getMetrics(): SystemMetrics {
    const historyCount = this.frameHistory.length;

    if (historyCount === 0) {
      return {
        avgFrameTime: 0,
        fps: 0,
        peakMemory: 0,
        totalDrawCalls: 0,
      };
    }

    // Average render time (CPU/GPU time spent drawing)
    const totalRenderTime = this.frameHistory.reduce((sum, f) => sum + f.renderTime, 0);
    const avgFrameTime = totalRenderTime / historyCount;

    // FPS calculation: Frames per second based on actual frame intervals
    let fps = 0;
    if (historyCount > 1) {
      const firstFrame = this.frameHistory[0];
      const lastFrame = this.frameHistory[historyCount - 1];
      const timeSpanMs = lastFrame.timestamp - firstFrame.timestamp;

      if (timeSpanMs > 0) {
        // We use (count - 1) because we are measuring the intervals between frames
        fps = ((historyCount - 1) * 1000) / timeSpanMs;
      }
    }

    // Peak memory observed in the window
    const peakMemory = Math.max(...this.frameHistory.map(f => f.memory));

    // Total draw calls for reporting (cumulative over the window)
    const totalDrawCalls = this.frameHistory.reduce((sum, f) => sum + f.drawCalls, 0);

    return {
      avgFrameTime,
      fps: Math.round(fps * 100) / 100, // Round to 2 decimal places
      peakMemory,
      totalDrawCalls
    };
  }

  /**
   * Clears all recorded performance data.
   */
  public clear(): void {
    this.frameHistory = [];
  }

  /**
   * Returns the full history of captured frame metrics.
   */
  public getHistory(): FrameMetrics[] {
    return [...this.frameHistory];
  }
}
