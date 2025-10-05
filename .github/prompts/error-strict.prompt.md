# Prompt: TypeScript Strict Error Resolver

Whenever Copilot generates or modifies code:

1. **Never ignore compiler errors** like `TS2339`, `TS2345`, or similar.
    - Always explain what the error means in plain language.
    - Always suggest at least one concrete fix.

2. **For missing properties or methods (e.g. `TS2339`)**:
    - Check if the method exists in the installed `node_modules`.
    - If it doesn’t exist, assume the API changed in `discord.js@15-dev`.
    - Propose alternatives based on actual available methods (`example.ts.txt` must be consulted).

3. **For type mismatches (e.g. `TS2345`)**:
    - Suggest code changes that handle `null`/`undefined` safely.
    - Show how to cast or coerce types **without breaking strict typing**.

4. **Validation step**:
    - Always remind to rerun:
      ```bash
      npx tsc --noEmit
      ```
      until the project compiles cleanly.
    - Do not consider the task “done” if compiler errors remain.

5. **Explicitness**:
    - Always specify: “This code suggestion resolves TS2339 / TS2345.”
    - Never produce a code snippet that still triggers the same error.  
