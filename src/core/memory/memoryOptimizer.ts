import logger from "../lib/logger";
// Sistema adicional de optimización de memoria para complementar el monitor existente

export interface MemoryOptimizerOptions {
  forceGCInterval?: number; // minutos
  maxHeapUsageBeforeGC?: number; // MB
  logGCStats?: boolean;
}

export class MemoryOptimizer {
  private gcTimer?: NodeJS.Timeout;
  private options: Required<MemoryOptimizerOptions>;

  constructor(options: MemoryOptimizerOptions = {}) {
    this.options = {
      forceGCInterval: options.forceGCInterval ?? 15, // cada 15 min por defecto
      maxHeapUsageBeforeGC: options.maxHeapUsageBeforeGC ?? 200, // 200MB
      logGCStats: options.logGCStats ?? false
    };
  }

  start() {
    // Solo habilitar si está disponible el GC manual
    if (typeof global.gc !== 'function') {
      logger.warn('⚠️ Manual GC no disponible. Inicia con --expose-gc para habilitar optimizaciones adicionales.');
      return;
    }

    // Timer para GC forzado periódico
    if (this.options.forceGCInterval > 0) {
      this.gcTimer = setInterval(() => {
        this.performGC('scheduled');
      }, this.options.forceGCInterval * 60 * 1000);
      
      this.gcTimer.unref(); // No bloquear el cierre del proceso
    }

    logger.info(`✅ Memory Optimizer iniciado - GC cada ${this.options.forceGCInterval}min, umbral: ${this.options.maxHeapUsageBeforeGC}MB`);
  }

  stop() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = undefined;
    }
  }

  // Método público para forzar GC cuando sea necesario
  checkAndOptimize() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    if (heapUsedMB > this.options.maxHeapUsageBeforeGC) {
      this.performGC('threshold');
      return true;
    }
    return false;
  }

  private performGC(reason: string) {
    if (typeof global.gc !== 'function') return;

    const before = process.memoryUsage();
    const startTime = Date.now();

    global.gc();

    if (this.options.logGCStats) {
      const after = process.memoryUsage();
      const duration = Date.now() - startTime;
      const heapFreed = (before.heapUsed - after.heapUsed) / 1024 / 1024;
      
      logger.info(`🗑️ GC ${reason}: liberó ${heapFreed.toFixed(1)}MB en ${duration}ms`);
    }
  }
}

// Instancia singleton exportable
export const memoryOptimizer = new MemoryOptimizer();
