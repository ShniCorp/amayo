<template>
  <div class="legal-page">
    <AnimatedBackground />
    <IslandNavbar />

    <div class="legal-container">
      <div class="legal-header">
        <h1>📜 Terms of Service</h1>
        <p class="last-updated">Last Updated: November 6, 2025</p>
      </div>

      <div class="legal-content">
        <section class="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By inviting Amayo Bot to your Discord server or using any of its services, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use the bot.
          </p>
        </section>

        <section class="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            Amayo Bot is a Discord bot that provides various features including but not limited to:
          </p>
          <ul>
            <li>Server moderation tools</li>
            <li>Alliance management system</li>
            <li>Economy and rewards system</li>
            <li>Utility commands</li>
            <li>AI-powered chat interactions</li>
            <li>Custom display components</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>3. User Responsibilities</h2>
          <p>As a user of Amayo Bot, you agree to:</p>
          <ul>
            <li>Use the bot in compliance with Discord's Terms of Service and Community Guidelines</li>
            <li>Not use the bot for any illegal or unauthorized purpose</li>
            <li>Not attempt to exploit, manipulate, or abuse the bot's features</li>
            <li>Not reverse engineer, decompile, or attempt to extract the source code of the bot</li>
            <li>Not spam, harass, or abuse other users through the bot</li>
            <li>Take full responsibility for the content you create and share using the bot</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Data Collection and Usage</h2>
          <p>
            Amayo Bot collects and stores certain data to provide its services. This includes:
          </p>
          <ul>
            <li>Discord User IDs and Server IDs</li>
            <li>Server configuration settings</li>
            <li>Alliance data and points</li>
            <li>Command usage statistics</li>
            <li>Chat messages for AI functionality (temporary storage)</li>
          </ul>
          <p>
            For more detailed information about data collection, please refer to our 
            <router-link to="/privacy" class="link">Privacy Policy</router-link>.
          </p>
        </section>

        <section class="legal-section">
          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of Amayo Bot are owned by the bot developers and are protected by 
            international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section class="legal-section">
          <h2>6. Service Availability</h2>
          <p>
            We strive to maintain high availability of Amayo Bot, but we do not guarantee uninterrupted service. 
            The bot may be temporarily unavailable due to:
          </p>
          <ul>
            <li>Scheduled maintenance</li>
            <li>Technical issues</li>
            <li>Third-party service disruptions (Discord API)</li>
            <li>Force majeure events</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            Amayo Bot is provided "as is" without any warranties, expressed or implied. We are not liable for:
          </p>
          <ul>
            <li>Any damages or losses resulting from the use or inability to use the bot</li>
            <li>Data loss or corruption</li>
            <li>Actions taken by users of the bot</li>
            <li>Third-party content or services</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>8. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to Amayo Bot at any time, without prior notice, for:
          </p>
          <ul>
            <li>Violation of these Terms of Service</li>
            <li>Abuse of the bot's features</li>
            <li>Illegal activities</li>
            <li>Any reason we deem necessary to protect the service or other users</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately 
            upon posting. Continued use of the bot after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section class="legal-section">
          <h2>10. Governing Law</h2>
          <p>
            These Terms of Service are governed by and construed in accordance with applicable international laws. 
            Any disputes arising from these terms will be resolved through appropriate legal channels.
          </p>
        </section>

        <section class="legal-section">
          <h2>11. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us through our 
            <a href="https://discord.gg/your-support-server" target="_blank" rel="noopener noreferrer" class="link">
              support server
            </a>.
          </p>
        </section>
      </div>

      <div class="legal-footer">
        <router-link to="/docs" class="back-btn">← Back to Documentation</router-link>
        <router-link to="/privacy" class="link">Privacy Policy</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import AnimatedBackground from '../components/AnimatedBackground.vue';
import IslandNavbar from '../components/docs/IslandNavbar.vue';
import { useTheme } from '../composables/useTheme';

const { initTheme } = useTheme();

onMounted(() => {
  initTheme();
});
</script>

<style scoped>
.legal-page {
  width: 100%;
  min-height: 100vh;
  padding: 120px 20px 60px;
}

.legal-container {
  max-width: 900px;
  margin: 0 auto;
  color: white;
}

.legal-header {
  text-align: center;
  margin-bottom: 60px;
}

.legal-header h1 {
  font-size: 3rem;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff, var(--color-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.last-updated {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.95rem;
}

.legal-content {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 40px;
}

.legal-section {
  margin-bottom: 40px;
}

.legal-section:last-child {
  margin-bottom: 0;
}

.legal-section h2 {
  color: var(--color-primary);
  font-size: 1.5rem;
  margin-bottom: 16px;
}

.legal-section p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;
  margin-bottom: 16px;
}

.legal-section ul {
  list-style: none;
  padding-left: 0;
  margin: 16px 0;
}

.legal-section li {
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 0 8px 24px;
  position: relative;
  line-height: 1.6;
}

.legal-section li::before {
  content: '•';
  color: var(--color-primary);
  font-weight: bold;
  position: absolute;
  left: 8px;
}

.link {
  color: var(--color-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}

.link:hover {
  border-bottom-color: var(--color-primary);
}

.legal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.back-btn {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 25px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
  transform: translateX(-4px);
}

@media (max-width: 768px) {
  .legal-header h1 {
    font-size: 2rem;
  }

  .legal-content {
    padding: 24px;
  }

  .legal-footer {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
