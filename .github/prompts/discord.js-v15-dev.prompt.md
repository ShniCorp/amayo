# Prompt: Discord.js 15 Development Mode

When assisting with Discord.js version `15.0.0-dev.1759363313-f510b5ffa`:

- Treat the installed code in `node_modules/discord.js` as the primary and most reliable reference.
- Always analyze the file `example.ts.txt` to extract API patterns, since it reflects the intended usage of this dev version.
- Do not rely blindly on official docs or the guide; use them only to compare and note differences with the dev version.
- Highlight when functionality has changed from v14 to v15, based on observed code and `example.ts.txt`.
- Encourage verification by:
  ```bash
  npx tsc --noEmit
