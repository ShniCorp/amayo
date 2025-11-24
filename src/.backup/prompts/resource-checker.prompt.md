# Prompt: Node.js Resource Checker (Memory & CPU)

Whenever Copilot generates, modifies, or reviews code in Node.js:

1. **Memory Monitoring**
    - Always remind to check memory usage with:
      ```js
      logger.info(process.memoryUsage());
      ```
      which returns RSS, Heap Used, Heap Total, External, and Array Buffers.
    - If `Heap Used` grows continuously without freeing, suggest potential memory leaks (unreleased timers, listeners, or large cached data).
    - If `RSS` (Resident Set Size) is unusually higher than `Heap Total`, warn that external/native modules might be consuming memory.

2. **CPU Usage**
    - Remind to check CPU load using:
      ```bash
      top -p <pid>
      ```
      or Node.js profiling (`--inspect`, `clinic flame`).
    - Flag infinite loops, synchronous blocking calls, or heavy computations running on the main thread as potential CPU overuse.
    - Encourage offloading heavy tasks to Workers, child processes, or queues when appropriate.

3. **Best Practices**
    - Always validate memory and CPU usage after implementing new features.
    - Suggest garbage collection checks (`global.gc()`) in development when Node is run with `--expose-gc`.
    - Warn if long-living references (e.g., large Maps, Sets, caches, or listeners) might not be released.
    - Highlight that CPU and memory efficiency are as important as correctness.

4. **Output Analysis**
    - When given memory stats like:
      ```
      RSS: 186.9MB
      Heap Used: 67.6MB
      Heap Total: 71.2MB
      External: 5.0MB
      ```
        - Compare `Heap Used` vs `Heap Total`: if close to the limit, risk of OOM.
        - Compare `RSS` vs `Heap Total`: if RSS is much larger, check for native module or buffer leaks.
        - If growth is unbounded, warn about potential memory leaks.

5. **Always remind** to rerun tests with `npx tsc --noEmit` (for type safety) and memory checks together, ensuring both correctness and performance.
