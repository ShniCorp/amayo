import { registry } from "./registry";
import { replaceVars, listVariables } from "../vars";

async function test() {
    console.log("Testing Variable System...");

    // 1. List variables
    const vars = listVariables();
    console.log("Registered variables:", vars);
    if (vars.length === 0) throw new Error("No variables registered!");

    // 2. Test replacement (mock context)
    const mockUser = {
        id: "123",
        username: "TestUser",
        displayAvatarURL: () => "http://avatar.url"
    };
    const mockGuild = {
        id: "456",
        name: "TestGuild",
        iconURL: () => "http://icon.url"
    };

    const text = "Hello user.name (user.id) from guild.name!";
    // @ts-ignore
    const result = await replaceVars(text, mockUser, mockGuild);

    console.log("Original:", text);
    console.log("Result:", result);

    if (result !== "Hello TestUser (123) from TestGuild!") {
        throw new Error("Variable replacement failed!");
    }

    console.log("✅ All tests passed!");
}

test().catch(console.error);
