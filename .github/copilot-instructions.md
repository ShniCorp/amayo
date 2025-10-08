# 🧠 Custom Instructions for GitHub Copilot  
**Project Context: Discord Bot + Game System Integration (discord.js 15.0.0-dev.1759363313-f510b5ffa)**  

---

## 1. Primary Source of Truth
- Always treat the **installed package** in `node_modules/discord.js` as the *definitive source* of API behavior and typings.  
- Do **not** rely solely on public documentation or examples; cross-verify any methods, classes, or type names directly from:
  - The source code and declaration files inside `node_modules/discord.js`
  - The project’s internal reference file `example.ts.txt`  

> If discrepancies exist, assume `example.ts.txt` and local types reflect the *intended experimental API* for this build.

---

## 2. Secondary Sources
Use these **only when confirmed to still be valid** for the current development version:  
- [Discord.js Guide](https://discordjs.guide)  
- [discord.js GitHub Repository](https://github.com/discordjs/discord.js)  
- [Discord API Types GitHub](https://github.com/discordjs/discord-api-types)  
- [Discord Developer Documentation](https://discord.com/developers/docs/intro)  

> ⚠️ Mark explicitly when a snippet or concept originates from official docs and may be outdated.

---

## 3. Code & Type Analysis Scope
Copilot must **investigate, interpret, and reference** the following project directories for all game logic and command definitions:  

- `src/game/**`  
- `src/commands/game/**`  
- `src/commands/admin/**`  

### Tasks:
- Analyze **all game-related classes, interfaces, and types**, including metadata structures (e.g., `GameAreaLevel`, `GameArea`, `ScheduledMobAttack`, and mission types).  
- Identify how these interact with command creation and execution flows.  
- Detect **missing type declarations**, inconsistent imports, or unreferenced type usages.  
- Evaluate whether metadata in `GameAreaLevel` can safely include additional properties (e.g., `image`, `referenceImage`, or similar) for visual mapping of game areas.  
- Verify that all related commands and editors properly support or update those fields.

---

## 4. Appwrite Integration Considerations
While analyzing the above directories, also check for:
- Possible migration paths for mission and attack scheduling logic (`ScheduledMobAttack`, mission trackers) into **Appwrite Functions** or **Appwrite Realtime** for better live synchronization and event-driven execution.  
- Type definitions or data structures that may need adaptation for Appwrite’s SDK.

---

## 5. Validation
Before finalizing any generated code or type updates:  
- Run TypeScript validation to ensure type correctness:
  ```bash
  npx tsc --noEmit
```

## 6. Communication Protocol
When Copilot suggests or modifies code, it must explicitly indicate the origin of the reference:
- 🟩 node_modules → Authoritative source (preferred)
- 🟦 example.ts.txt → Experimental / confirmed local reference
- 🟨 Official docs → Secondary, possibly outdated source
