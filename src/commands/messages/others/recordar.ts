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

function formatRelativeEs(when: Date): string {
  const diffMs = when.getTime() - Date.now();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));
  if (diffSec < 60) {
    const s = Math.max(1, diffSec);
    return `en ${s} segundo${s === 1 ? '' : 's'}`;
    }
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    const m = Math.max(1, diffMin);
    return `en ${m} minuto${m === 1 ? '' : 's'}`;
  }
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) {
    const h = Math.max(1, diffH);
    return `en ${h} hora${h === 1 ? '' : 's'}`;
  }
  const d = Math.max(1, Math.round(diffH / 24));
  return `en ${d} día${d === 1 ? '' : 's'}`;
}

function cleanSpaces(s: string): string {
  return s.replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
}

function parseRelativeDelay(text: string): { when: Date, reminderText: string } | null {
  const lower = text.toLowerCase();

  // 0) Helpers de unidades
  const minUnit = 'm(?:in(?:uto(?:s)?)?)?';
  const hourUnit = 'h(?:ora(?:s)?)?';
  const dayUnit = 'd(?:[ií]a(?:s)?)?|d'; // dia, días, dias, día, d

  // 1) "en menos de 1h" -> 59 minutos
  let m = lower.match(new RegExp(`en\\s+menos\\s+de\\s+1\\s*${hourUnit}`, 'i'));
  if (m) {
    const minutes = 59;
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 2) "en menos de X min" -> (X-1) minutos
  m = lower.match(new RegExp(`en\\s+menos\\s+de\\s+(\\d+)\\s*${minUnit}`, 'i'));
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10) - 1);
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 3) "en X minutos" / "en Xm"
  m = lower.match(new RegExp(`en\\s+(\\d+)\\s*${minUnit}`, 'i'));
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 4) "en X horas" / "en Xh"
  m = lower.match(new RegExp(`en\\s+(\\d+)\\s*${hourUnit}`, 'i'));
  if (m) {
    const hours = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + hours * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 5) "en X días" / "en Xd"
  m = lower.match(new RegExp(`en\\s+(\\d+)\\s*${dayUnit}`, 'i'));
  if (m) {
    const days = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 6) "dentro de X minutos"
  m = lower.match(new RegExp(`dentro\\s+de\\s+(\\d+)\\s*${minUnit}`, 'i'));
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 7) "dentro de X horas"
  m = lower.match(new RegExp(`dentro\\s+de\\s+(\\d+)\\s*${hourUnit}`, 'i'));
  if (m) {
    const hours = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + hours * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 8) "dentro de X días"
  m = lower.match(new RegExp(`dentro\\s+de\\s+(\\d+)\\s*${dayUnit}`, 'i'));
  if (m) {
    const days = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.replace(m[0], '')) || text;
    return { when, reminderText };
  }

  // 9) Post-fijo corto al final: "15m" o "45 min"
  m = lower.match(new RegExp(`(\\d+)\\s*${minUnit}$`, 'i'));
  if (m) {
    const minutes = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + minutes * 60 * 1000);
    const reminderText = cleanSpaces(text.slice(0, (m.index ?? text.length))).trim() || text;
    return { when, reminderText };
  }

  // 10) Post-fijo corto: "1h" o "2 horas" al final
  m = lower.match(new RegExp(`(\\d+)\\s*${hourUnit}$`, 'i'));
  if (m) {
    const hours = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + hours * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.slice(0, (m.index ?? text.length))).trim() || text;
    return { when, reminderText };
  }

  // 11) Post-fijo corto: "7d" o "7 dias" al final
  m = lower.match(new RegExp(`(\\d+)\\s*${dayUnit}$`, 'i'));
  if (m) {
    const days = Math.max(1, parseInt(m[1], 10));
    const when = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const reminderText = cleanSpaces(text.slice(0, (m.index ?? text.length))).trim() || text;
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
    const relParsed = parseRelativeDelay(text);
    let when: Date | null = null;
    let reminderText = text;
    if (relParsed) {
      when = relParsed.when;
      reminderText = relParsed.reminderText;
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

      // Nota: validación completa al final también
      if (!when || isNaN(when.getTime())) {
        await message.reply('❌ La fecha/hora no es válida.');
        return;
      }

      // Extraer el texto del recordatorio eliminando el fragmento reconocido de fecha
      const matched = r.text || '';
      if (matched) {
        const idx = text.toLowerCase().indexOf(matched.toLowerCase());
        if (idx >= 0) {
          // Intentar eliminar también un conector previo como "en" o "dentro de"
          let start = idx;
          const before = text.slice(0, idx);
          const lead = before.match(/(?:en|dentro\s+de)\s*$/i);
          if (lead) start = idx - lead[0].length;

          let reminderTextCandidate = text.slice(0, start) + text.slice(idx + matched.length);
          reminderText = cleanSpaces(reminderTextCandidate) || text;
        }
      }
    }

    // Validación robusta antes de usar getTime/toISOString
    if (!(when instanceof Date) || isNaN(when.getTime())) {
      await message.reply('❌ La fecha/hora interpretada no es válida. Intenta con un formato distinto.');
      return;
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
    const relText = formatRelativeEs(when);
    await message.reply(`✅ Recordatorio guardado: ${relText} (${whenHuman} UTC)\nMensaje: ${reminderText}`);
  }
};
