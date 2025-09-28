// Comando para crear recordatorios con Appwrite: !recordar {texto} {fecha}
// Ejemplos:
//   !recordar hacer esto el miércoles a las 5pm
//   !recordar pagar el hosting mañana a las 9:00
// @ts-ignore
import { CommandMessage } from "../../../core/types/commands";
import type { Message } from 'discord.js';
import * as chrono from 'chrono-node';
import { scheduleReminder } from '../../../core/api/reminders';
import { isAppwriteConfigured } from '../../../core/api/appwrite';

function humanizeDate(d: Date) {
  return d.toLocaleString('es-ES', { timeZone: 'UTC', hour12: false });
}

function parseRelativeDelay(text: string): { when: Date, reminderText: string } | null {
  const lower = text.toLowerCase();

  // 1) "en menos de 1h" -> 59 minutos
  let m = lower.match(/en\s+menos\s+de\s+1\s*h(ora(s)?)?/i);
  if (m) {
    const minutes = 59;
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = text.replace(m[0], '').trim() || text;
    return { when, reminderText };
  }

  // 2) "en menos de X min" -> (X-1) minutos
  m = lower.match(/en\s+menos\s+de\s+(\d+)\s*m(in(utos)?)?/i);
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10) - 1);
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = text.replace(m[0], '').trim() || text;
    return { when, reminderText };
  }

  // 3) "en X minutos" / "en Xm"
  m = lower.match(/en\s+(\d+)\s*m(in(utos)?)?/i);
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = text.replace(m[0], '').trim() || text;
    return { when, reminderText };
  }

  // 4) "en X horas" / "en Xh"
  m = lower.match(/en\s+(\d+)\s*h(ora(s)?)?/i);
  if (m) {
    const hours = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + hours * 60 * 60 * 1000);
    const reminderText = text.replace(m[0], '').trim() || text;
    return { when, reminderText };
  }

  // 5) Post-fijo corto: "15m" o "45 min" al final
  m = lower.match(/(\d+)\s*m(in(utos)?)?$/i);
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = text.slice(0, m.index).trim() || text;
    return { when, reminderText };
  }

  // 6) Post-fijo corto: "1h" o "2 horas" al final
  m = lower.match(/(\d+)\s*h(ora(s)?)?$/i);
  if (m) {
    const hours = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + hours * 60 * 60 * 1000);
    const reminderText = text.slice(0, m.index).trim() || text;
    return { when, reminderText };
  }

  return null;
}

export const command: CommandMessage = {
  name: 'recordar',
  type: 'message',
  aliases: ['reminder', 'rec'],
  cooldown: 5,
  description: 'Crea un recordatorio. Ej: !recordar hacer esto el miércoles a las 17:00',
  category: 'Utilidad',
  usage: 'recordar <texto> <cuando>',
  run: async (message: Message, args: string[]) => {
    if (!isAppwriteConfigured()) {
      await message.reply('⚠️ Appwrite no está configurado en el bot. Define APPWRITE_* en variables de entorno.');
      return;
    }
    const text = (args || []).join(' ').trim();
    if (!text) {
      await message.reply('Uso: !recordar <texto> <fecha/hora>  Ej: !recordar enviar reporte el viernes a las 10:00');
      return;
    }

    // 1) Soporte rápido para tiempos relativos: "en 10 minutos", "15m", "1h", "en menos de 1h"
    const rel = parseRelativeDelay(text);
    let when: Date | null = null;
    let reminderText = text;
    if (rel) {
      when = rel.when;
      reminderText = rel.reminderText;
    }

    // 2) Si no hubo match relativo, usar parser natural (chrono) en español
    if (!when) {
      const ref = new Date();
      const results = chrono.es.parse(text, ref, { forwardDate: true });
      if (!results.length) {
        await message.reply('❌ No pude entender cuándo. Intenta algo como: "en 10 minutos", "mañana 9am", "el miércoles 17:00".');
        return;
      }
      const r = results[0];
      when = r.date();

      if (!when || isNaN(when.getTime())) {
        await message.reply('❌ La fecha/hora no es válida.');
        return;
      }

      // Extraer el texto del recordatorio eliminando el fragmento reconocido de fecha
      const matched = r.text || '';
      if (matched) {
        const idx = text.toLowerCase().indexOf(matched.toLowerCase());
        if (idx >= 0) {
          reminderText = (text.slice(0, idx) + text.slice(idx + matched.length)).trim() || text;
        }
      }
    }

    // Validaciones de futuro y límites mínimos
    if (when.getTime() <= Date.now() + 20 * 1000) { // al menos 20s al futuro
      await message.reply('❌ Especifica un tiempo al futuro (al menos ~20 segundos).');
      return;
    }

    // Guardar en Appwrite
    const iso = new Date(when.getTime()).toISOString();
    try {
      await scheduleReminder({
        userId: message.author.id,
        guildId: message.guild?.id || null,
        channelId: message.channel.id,
        message: reminderText,
        executeAt: iso
      });
    } catch (e) {
      console.error('Error programando recordatorio:', e);
      await message.reply('❌ No pude guardar el recordatorio. Revisa la configuración de Appwrite.');
      return;
    }

    const whenHuman = humanizeDate(when);
    await message.reply(`✅ Recordatorio guardado para: ${whenHuman} UTC\nMensaje: ${reminderText}`);
  }
};
