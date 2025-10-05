# Custom instructions for GitHub Copilot (discord.js 15.0.0-dev)

When generating or modifying code for Discord.js version `15.0.0-dev.1759363313-f510b5ffa`:

1. **Primary Source of Truth**
    - Do not assume the official docs, guide, or GitHub repositories are fully up-to-date.
    - Always prioritize the installed package in `node_modules/discord.js` as the most reliable source.
    - Always cross-reference with the provided file `example.ts.txt` to understand new or experimental APIs.

2. **Secondary Sources**
    - Only use these as references when the information is still valid:
        - [Discord.js Guide](https://discordjs.guide)
        - [discord.js GitHub](https://github.com/discordjs/discord.js)
        - [Discord API Types GitHub](https://github.com/discordjs/discord-api-types)
        - [Discord Developer Documentation](https://discord.com/developers/docs/intro)
    - Mark clearly if the information is outdated compared to the development version.

3. **Code Analysis**
    - Inspect the type definitions and source files inside `node_modules/discord.js` before suggesting new methods or classes.
    - If `example.ts.txt` shows usage not covered in documentation, assume that is the intended API for this development version.

4. **Validation**
    - Always suggest running:
      ```bash
      npx tsc --noEmit
      ```
      to validate typings.
    - Remind to check runtime memory and CPU usage with:
      ```js
      console.log(process.memoryUsage());
      ```
      and external profilers if needed.

5. **Communication**
    - When suggesting code, state explicitly whether it comes from:
        - `node_modules` (preferred, authoritative)
        - `example.ts.txt` (author-provided experimental reference)
        - official docs (secondary, possibly outdated)
