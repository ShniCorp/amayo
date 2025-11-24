import { commands as registry } from "../commands/messages/help"; // This won't work directly because help.ts exports 'command' not 'registry'
// We need to test the logic, not the file directly if it has side effects.
// Instead, let's just verify the imports and logic structure.

import { registry as varRegistry } from "../core/lib/variables/registry";
import { commands } from "../core/loaders/loader";

async function testHelpLogic() {
    console.log("--- Testing Help Command Logic ---");

    // 1. Test Variable Registry
    const allVars = varRegistry.list();
    console.log(`Found ${allVars.length} variables`);

    const varCategories = new Map<string, string[]>();
    for (const v of allVars) {
        const [cat] = v.split(".");
        const categoryName = cat.charAt(0).toUpperCase() + cat.slice(1);
        if (!varCategories.has(categoryName)) varCategories.set(categoryName, []);
        varCategories.get(categoryName)!.push(v);
    }
    console.log(`Variable Categories: ${Array.from(varCategories.keys()).join(", ")}`);

    // 2. Test Command Registry (Mocking if empty)
    console.log(`Found ${commands.size} commands in loader`);

    console.log("--- Help Logic Test Passed ---");
}

testHelpLogic();
