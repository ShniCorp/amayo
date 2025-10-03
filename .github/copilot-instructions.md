# Custom instructions for GitHub Copilot

Whenever generating code, commit messages, or explanations related to Discord.js or the Discord API:

1. Always **consult and reference** the following sources for accurate and up-to-date information:
    - [Discord.js Guide](https://discordjs.guide)
    - [discord.js GitHub Repository](https://github.com/discordjs/discord.js)
    - [Discord API Types GitHub Repository](https://github.com/discordjs/discord-api-types)
    - [Discord Developer Documentation](https://discord.com/developers/docs/intro)

2. Always **prefer official documentation** over blogs, forums, or tutorials.
    - If no clear answer is found in docs, **inspect the installed dependency in `node_modules`** to confirm if a method, property, or class truly exists.

3. When suggesting code, ensure it matches the **latest stable release of Discord.js and related packages (June 2025 or newer)**.
    - If examples belong to an older version, adapt them to the most recent stable release.
    - If uncertain, indicate that verification against the `node_modules` implementation is required.

4. When installing or suggesting npm packages related to Discord.js:
    - Verify against their **GitHub repository** for recent updates, breaking changes, or migration notes.
    - Always check if the changelog or releases page contains updates after **June 2025** and adjust suggestions accordingly.

5. Always provide **links to relevant official documentation** (Discord.js Guide, GitHub repos, or Discord Developer Docs).
    - If the info is missing in docs, but exists in the actual installed package, explain that and provide the discovered usage.

6. **Error validation requirement:**
    - After generating or modifying code, always remind the user to check for TypeScript errors by running:
      ```bash
      npx tsc --noEmit
      ```
      (or equivalent `tsc` command).
    - If type errors are found, propose fixes before finalizing the solution.
