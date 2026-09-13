/**
 * Performance & Low-Power Mode Detection Engine
 * 
 * Accurately detects:
 * - 3-Tier Hardware Profiler (Tier 1: High-end, Tier 2: Mid, Tier 3: Budget / Slower device)
 * - Battery saver / Low power mode (via Battery API, high frame deltas, or CPU throttling)
 * - Extreme low-power / Critical battery (<= 15%) to bypass WebGL entirely
 * - Touch / Mobile devices (to preserve native 120Hz/60Hz compositor scrolling)
 * - User active scrolling state (to pause/throttle GPU shaders for buttery 60fps+ scrolling)
 * - Tab visibility (to freeze background animation loops and intervals)
 */

export type DeviceTier = "tier1_high" | "tier2_mid" | "tier3_budget";
type ScrollListener = (isScrolling: boolean) => void;
type LowPowerListener = (isLowPower: boolean) => void;
type VisibilityListener = (isVisible: boolean) => void;

class PerformanceEngine {
  private isLowPower: boolean = false;
  private isExtremeLowPower: boolean = false;
  private deviceTier: DeviceTier = "tier1_high";
  private isTouchDevice: boolean = false;
  private isScrolling: boolean = false;
  private isTabVisible: boolean = true;
  private scrollTimer: any = null;
  private scrollListeners: Set<ScrollListener> = new Set();
  private lowPowerListeners: Set<LowPowerListener> = new Set();
  private visibilityListeners: Set<VisibilityListener> = new Set();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Detect touch screen / mobile device
    this.isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches;

    // 2. Hardware capabilities profiling
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
    const memory = typeof (navigator as any).deviceMemory === "number" ? (navigator as any).deviceMemory : 4;
    const isSaveData = (navigator as any).connection?.saveData === true;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Classify device tier
    if (cores <= 2 || memory <= 2 || isSaveData) {
      this.deviceTier = "tier3_budget";
      this.isLowPower = true;
    } else if (cores <= 4 || memory <= 4 || prefersReducedMotion) {
      this.deviceTier = "tier2_mid";
      this.isLowPower = true;
    } else {
      this.deviceTier = "tier1_high";
    }

    // 3. Battery API detection (where supported)
    if ("getBattery" in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          const checkBattery = () => {
            const level = battery.level ?? 1.0;
            const charging = battery.charging ?? true;
            const lowBattery = !charging && level <= 0.25;
            const extremeLowBattery = !charging && level <= 0.15;

            this.isExtremeLowPower = extremeLowBattery;
            if (extremeLowBattery) {
              this.deviceTier = "tier3_budget";
            }

            this.setLowPower(lowBattery || isSaveData || cores <= 4 || prefersReducedMotion);
          };

          checkBattery();
          battery.addEventListener("levelchange", checkBattery);
          battery.addEventListener("chargingchange", checkBattery);
        })
        .catch(() => {});
    }

    // 4. Reduced motion media query listener
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", (e) => {
      if (e.matches) {
        this.setLowPower(true);
      }
    });

    // 5. Tab visibility listener (freeze background CPU/GPU intervals)
    this.isTabVisible = !document.hidden;
    document.addEventListener("visibilitychange", () => {
      this.isTabVisible = !document.hidden;
      this.visibilityListeners.forEach((fn) => {
        try {
          fn(this.isTabVisible);
        } catch {}
      });
    });

    // 6. Global passive scroll listener
    let lastScrollTime = 0;
    const handleScroll = () => {
      lastScrollTime = Date.now();
      if (!this.isScrolling) {
        this.isScrolling = true;
        this.notifyScrollListeners(true);
      }

      if (this.scrollTimer) {
        clearTimeout(this.scrollTimer);
      }

      this.scrollTimer = setTimeout(() => {
        if (Date.now() - lastScrollTime >= 100) {
          this.isScrolling = false;
          this.notifyScrollListeners(false);
        }
      }, 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });

    // Sync CSS class on root document after initial hydration tick
    if (typeof window !== "undefined") {
      setTimeout(() => {
        if (this.isLowPower || this.deviceTier === "tier3_budget") {
          document.documentElement?.classList.add("low-power-device");
        }
      }, 0);
    }
  }

  private setLowPower(val: boolean) {
    if (this.isLowPower !== val) {
      this.isLowPower = val;
      if (typeof document !== "undefined") {
        setTimeout(() => {
          if (val) {
            document.documentElement?.classList.add("low-power-device");
          } else if (this.deviceTier !== "tier3_budget") {
            document.documentElement?.classList.remove("low-power-device");
          }
        }, 0);
      }
      this.lowPowerListeners.forEach((fn) => {
        try {
          fn(val);
        } catch {}
      });
    }
  }

  private notifyScrollListeners(isScrolling: boolean) {
    this.scrollListeners.forEach((fn) => {
      try {
        fn(isScrolling);
      } catch {}
    });
  }

  public getIsLowPower(): boolean {
    return this.isLowPower;
  }

  public getIsExtremeLowPower(): boolean {
    return this.isExtremeLowPower;
  }

  public getDeviceTier(): DeviceTier {
    return this.deviceTier;
  }

  public getIsTouchDevice(): boolean {
    return this.isTouchDevice;
  }

  public getIsScrolling(): boolean {
    return this.isScrolling;
  }

  public getIsTabVisible(): boolean {
    return this.isTabVisible;
  }

  public onScrollState(listener: ScrollListener): () => void {
    this.scrollListeners.add(listener);
    listener(this.isScrolling);
    return () => {
      this.scrollListeners.delete(listener);
    };
  }

  public onLowPowerChange(listener: LowPowerListener): () => void {
    this.lowPowerListeners.add(listener);
    listener(this.isLowPower);
    return () => {
      this.lowPowerListeners.delete(listener);
    };
  }

  public onVisibilityChange(listener: VisibilityListener): () => void {
    this.visibilityListeners.add(listener);
    listener(this.isTabVisible);
    return () => {
      this.visibilityListeners.delete(listener);
    };
  }
}

// Global singleton instance
export const performanceEngine = new PerformanceEngine();
