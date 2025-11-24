import { featureFlagService } from "./FeatureFlagService";
import { FeatureFlagConfig } from "../types/featureFlags";

// Mock feature flag helper to simulate the check
async function mockIsFeatureEnabledForInteraction(flagName: string, context: any) {
    return await featureFlagService.isEnabled(flagName, context);
}

async function testCommandIntegration() {
    console.log("--- Testing Command Integration ---");

    // 1. Setup: Create a test flag
    const testFlag: FeatureFlagConfig = {
        name: "test_cmd_flag",
        status: "disabled",
        target: "global",
    };
    await featureFlagService.setFlag(testFlag);
    console.log("Created disabled flag: test_cmd_flag");

    // 2. Simulate Command Check (Disabled)
    let enabled = await mockIsFeatureEnabledForInteraction("test_cmd_flag", { userId: "user1" });
    if (!enabled) {
        console.log("✅ Command blocked correctly (Flag Disabled)");
    } else {
        console.error("❌ Command NOT blocked (Flag Disabled)");
        process.exit(1);
    }

    // 3. Enable Flag
    testFlag.status = "enabled";
    await featureFlagService.setFlag(testFlag);
    console.log("Enabled flag: test_cmd_flag");

    // 4. Simulate Command Check (Enabled)
    enabled = await mockIsFeatureEnabledForInteraction("test_cmd_flag", { userId: "user1" });
    if (enabled) {
        console.log("✅ Command allowed correctly (Flag Enabled)");
    } else {
        console.error("❌ Command blocked (Flag Enabled)");
        process.exit(1);
    }

    // Cleanup
    await featureFlagService.removeFlag("test_cmd_flag");
    console.log("--- Integration Test Passed ---");
}

testCommandIntegration();
