import logger from "../../core/lib/logger";
import { ButtonInteraction, MessageFlags, PermissionFlagsBits } from 'discord.js';

export default {
  customId: 'ai_config',
  run: async (interaction: ButtonInteraction) => {
    // Verificar permisos de administrador
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        content: '❌ No tienes permisos de administrador para usar este botón.',  
        flags: MessageFlags.Ephemeral 
      });
    }

    try {
      await interaction.deferUpdate();
      
      // Panel de configuración detallada
      // @ts-ignore
      const configPanel = {
        type: 17,
        accent_color: 0x3498DB,
        components: [
          {
            type: 10,
            content: '## ⚙️ Configuración del Sistema de IA'
          },
          {
            type: 10,
            content: '-# Ajustes avanzados y configuración del servicio Gemini-chan.'
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 10,
            content: `## 🔧 Configuración Actual
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
\`\`\`

## 🔄 Opciones Disponibles`
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 9,
            components: [
              { type: 10, content: "📊 **Ver logs del sistema** en tiempo real" }
            ],
            accessory: {
              type: 2,
              style: 2,
              emoji: "📊",
              label: 'Ver Logs',
              custom_id: 'ai_view_logs'
            }
          },
          {
            type: 9,
            components: [
              { type: 10, content: "🔧 **Cambiar configuración** de rate limits y timeouts" }
            ],
            accessory: {
              type: 2,
              style: 2,
              emoji: "🔧",
              label: 'Configurar',
              custom_id: 'ai_modify_config'
            }
          },
          {
            type: 9,
            components: [
              { type: 10, content: "🧪 **Modo de prueba** para testing del sistema" }
            ],
            accessory: {
              type: 2,
              style: 2,
              emoji: "🧪",
              label: 'Modo Test',
              custom_id: 'ai_test_mode'
            }
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 9,
            components: [
              { type: 10, content: "🔙 Volver al panel principal de administración" }
            ],
            accessory: {
              type: 2,
              style: 1,
              emoji: "🔙",
              label: 'Volver al Panel',
              custom_id: 'ai_refresh_stats'
            }
          }
        ]
      };

      await interaction.message.edit({ components: [configPanel] });
      logger.info(`Panel de configuración de IA accedido por ${interaction.user.username} (${interaction.user.id})`);
      
    } catch (error) {
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
