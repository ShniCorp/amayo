import { featureFlagEvaluator } from "./FeatureFlagEvaluator";
import { FeatureFlagConfig, FeatureFlagContext } from "../types/featureFlags";

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

function testEvaluator() {
    console.log("--- Testing FeatureFlagEvaluator ---");

    const context: FeatureFlagContext = {
        userId: "user-123",
        guildId: "guild-456",
        timestamp: Date.now(),
    };

    // 1. Test Enabled
    const enabledFlag: FeatureFlagConfig = {
        name: "test-enabled",
        status: "enabled",
        target: "global",
    };
    assert(
        featureFlagEvaluator.evaluate(enabledFlag, context).enabled === true,
        "Enabled flag should be enabled"
    );

    // 2. Test Disabled
    const disabledFlag: FeatureFlagConfig = {
        name: "test-disabled",
        status: "disabled",
        target: "global",
    };
    assert(
        featureFlagEvaluator.evaluate(disabledFlag, context).enabled === false,
        "Disabled flag should be disabled"
    );

    // 3. Test Whitelist (User)
    const whitelistFlag: FeatureFlagConfig = {
        name: "test-whitelist",
        status: "rollout",
        target: "user",
        rolloutStrategy: "whitelist",
        rolloutConfig: {
            targetIds: ["user-123"],
        },
    };
    assert(
        featureFlagEvaluator.evaluate(whitelistFlag, context).enabled === true,
        "User in whitelist should be enabled"
    );
    assert(
        featureFlagEvaluator.evaluate(whitelistFlag, { userId: "other" }).enabled ===
        false,
        "User not in whitelist should be disabled"
    );

    // 4. Test Percentage
    const percentageFlag: FeatureFlagConfig = {
        name: "test-percentage",
        status: "rollout",
        target: "user",
        rolloutStrategy: "percentage",
        rolloutConfig: {
            percentage: 100,
        },
    };
    assert(
        featureFlagEvaluator.evaluate(percentageFlag, context).enabled === true,
        "100% percentage should be enabled"
    );

    const zeroPercentageFlag: FeatureFlagConfig = {
        name: "test-percentage-zero",
        status: "rollout",
        target: "user",
        rolloutStrategy: "percentage",
        rolloutConfig: {
            percentage: 0,
        },
    };
    assert(
        featureFlagEvaluator.evaluate(zeroPercentageFlag, context).enabled === false,
        "0% percentage should be disabled"
    );

    console.log("--- All Evaluator Tests Passed ---");
}

testEvaluator();
