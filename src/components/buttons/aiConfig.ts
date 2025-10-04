import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { ComponentType, ButtonStyle } from 'discord-api-types/v10';

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
      
      // Panel de configuración usando objetos planos
      const configPanel = {
        type: ComponentType.Container,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `## ⚙️ Configuración del Sistema de IA
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
\`\`\``
          },
          {
            type: ComponentType.Section,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: "🔙 Volver al panel principal de administración"
              }
            ],
            accessory: {
              type: ComponentType.Button,
              custom_id: 'ai_refresh_stats',
              label: 'Volver al Panel',
              emoji: { name: '🔙' },
              style: ButtonStyle.Primary
            }
          }
        ]
      };

      await interaction.message.edit({
        // @ts-ignore - Flag de componentes V2
        flags: 32768,
        components: [configPanel]
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
