import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, ContainerBuilder, TextDisplayBuilder, SectionBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const OWNER_ID = '327207082203938818'; // Solo el dueño puede usar este panel

export default {
  customId: 'ai_config',
  run: async (interaction: ButtonInteraction) => {
    // Verificar que sea el dueño del bot (CRÍTICO)
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ Solo el dueño del bot puede usar este panel administrativo.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await interaction.deferUpdate();
      
      // Panel de configuración usando la API real de Discord.js 14.22.1
      const configContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(`## ⚙️ Configuración del Sistema de IA
-# Ajustes avanzados y configuración del servicio Gemini-chan.

## 🔧 Configuración Actual
\`\`\`yaml
# Límites de Rate Limiting
rate_limit_max: 20              # requests por minuto por usuario
rate_limit_window: 60000        # ventana en milisegundos (1 min)
cooldown_ms: 3000               # cooldown entre requests (3 seg)

# Configuración de Tokens
max_input_tokens: 1048576       # 1M tokens entrada (Gemini 2.5 Flash)
max_output_tokens: 8192         # 8K tokens salida
token_reset_threshold: 0.80     # reset al 80% del límite

# Gestión de Memoria
max_conversation_age: 1800000   # 30 minutos (en ms)
max_message_history: 8          # mensajes por conversación
cleanup_interval: 300000       # limpieza cada 5 minutos

# Procesamiento
max_concurrent_requests: 3      # requests simultáneos
request_timeout: 30000          # timeout de 30 segundos
max_image_requests: 3           # límite de requests de imagen

# Modelo IA
model: "gemini-1.5-flash"       # modelo de Google AI
temperature: 0.7                # creatividad de respuestas
top_p: 0.85                     # diversidad de tokens
top_k: 40                       # límite de candidatos
\`\`\``)
        )
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent("🔙 Volver al panel principal de administración")
            )
              .setButtonAccessory(
              new ButtonBuilder()
                .setCustomId('ai_refresh_stats')
                .setLabel('Volver al Panel')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Primary)
            )
        );

      await interaction.message.edit({
        components: [configContainer],
        flags: MessageFlags.IsComponentsV2
      });
      logger.info(`Panel de configuración de IA accedido por el dueño ${interaction.user.username} (${interaction.user.id})`);

    } catch (error) {
        //@ts-ignore
      logger.error('Error mostrando configuración de IA:', error);
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ 
          content: '❌ Error accediendo a la configuración del sistema de IA.',  
          flags: MessageFlags.Ephemeral 
        });
      }
    }
  }
};
