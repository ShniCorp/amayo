// Monitor ligero de memoria y event loop.
// Se activa si defines MEMORY_LOG_INTERVAL_SECONDS.
import { monitorEventLoopDelay } from 'node:perf_hooks';

export interface MemoryMonitorOptions {
  intervalSeconds: number;
  warnHeapRatio?: number; // 0-1 fracción del máximo estimado antes de warning
}

export function startMemoryMonitor(opts: MemoryMonitorOptions) {
  const { intervalSeconds, warnHeapRatio = 0.8 } = opts;
  if (intervalSeconds <= 0) return;

  const h = monitorEventLoopDelay({ resolution: 20 });
  h.enable();

  const formatMB = (n: number) => (n / 1024 / 1024).toFixed(1) + 'MB';

  // Intento de obtener el límite de heap (puede variar según flags)
  let heapLimit = 0;
  try {
    // @ts-ignore
    const v8 = require('v8');
    const stats = v8.getHeapStatistics();
    heapLimit = stats.heap_size_limit || 0;
  } catch {}

  setInterval(() => {
    const m = process.memoryUsage();
    const rss = formatMB(m.rss);
    const heapUsed = formatMB(m.heapUsed);
    const heapTotal = formatMB(m.heapTotal);
    const external = formatMB(m.external);
    const elDelay = h.mean / 1e6; // ms

    let warn = '';
    if (heapLimit) {
      const ratio = m.heapUsed / heapLimit;
      if (ratio >= warnHeapRatio) {
        warn = ` ⚠ heap ${(ratio * 100).toFixed(1)}% del límite (~${formatMB(heapLimit)})`;
      }
    }

    console.log(`[MEM] rss=${rss} heapUsed=${heapUsed} heapTotal=${heapTotal} ext=${external} evLoopDelay=${elDelay.toFixed(2)}ms${warn}`);

    // Resetear métricas de event loop delay para la siguiente ventana
    h.reset();
  }, intervalSeconds * 1000).unref();
}

