import { extractInviteCode, validateDiscordLinks } from "./utils";

function test() {
    console.log("Testing Event URL Exclusion...");

    const eventUrl = "https://discord.com/events/1073017636562145280/1434199053666615326";
    const inviteUrl = "https://discord.gg/ABCDEF";

    // 1. Test extractInviteCode
    const code = extractInviteCode(eventUrl);
    console.log(`extractInviteCode("${eventUrl}") -> ${code}`);

    if (code !== null) {
        console.error("❌ Failed: Event URL should return null code");
        process.exit(1);
    }

    // 2. Test validateDiscordLinks
    const links = [eventUrl, inviteUrl];
    const valid = validateDiscordLinks(links);
    console.log("Valid links:", valid);

    if (valid.includes(eventUrl)) {
        console.error("❌ Failed: Event URL should be excluded from valid links");
        process.exit(1);
    }

    if (!valid.includes(inviteUrl)) {
        console.error("❌ Failed: Invite URL should be included");
        process.exit(1);
    }

    console.log("✅ Event URL correctly excluded!");
}

test();
