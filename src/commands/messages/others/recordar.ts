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

    // Parsear en español, forzando fechas futuras cuando sea ambiguo
    const ref = new Date();
    const results = chrono.es.parse(text, ref, { forwardDate: true });
    if (!results.length) {
      await message.reply('❌ No pude entender cuándo. Intenta algo como: "mañana 9am", "el miércoles 17:00", "en 2 horas".');
      return;
    }

    const r = results[0];
    const when = r.date();

    if (!when || isNaN(when.getTime())) {
      await message.reply('❌ La fecha/hora no es válida.');
      return;
    }

    // Evitar fechas pasadas
    if (when.getTime() <= Date.now()) {
      await message.reply('❌ La fecha/hora ya pasó. Especifica una fecha futura.');
      return;
    }

    // Extraer el texto del recordatorio eliminando el fragmento reconocido de fecha
    const matched = r.text || '';
    let reminderText = text;
    if (matched) {
      const idx = text.toLowerCase().indexOf(matched.toLowerCase());
      if (idx >= 0) {
        reminderText = (text.slice(0, idx) + text.slice(idx + matched.length)).trim();
      }
    }
    // Si quedó vacío, usar el texto completo
    if (!reminderText) reminderText = text;

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

