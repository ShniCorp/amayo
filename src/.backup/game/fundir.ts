import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { createSmeltJob } from '../../../game/smelting/service';

export const command: CommandMessage = {
  name: 'fundir',
  type: 'message',
  aliases: ['smelt'],
  cooldown: 5,
  description: 'Crea un job de fundición: descuenta insumos y estará listo tras el tiempo indicado.',
  usage: 'fundir <outputKey> <outputQty> <segundos> <inputKey1>:<qty> [inputKey2>:<qty> ...]'
    + '\nEj: fundir ingot.iron 1 60 ore.iron:3',
  run: async (message, args, _client: Amayo) => {
    const [outputKey, qtyStr, secsStr, ...rest] = args;
    if (!outputKey || !qtyStr || !secsStr || rest.length === 0) {
      await message.reply('Uso: `!fundir <outputKey> <outputQty> <segundos> <inputKey1>:<qty> [...]`');
      return;
    }
    const outputQty = parseInt(qtyStr, 10);
    const seconds = parseInt(secsStr, 10);
    if (!Number.isFinite(outputQty) || outputQty <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
      await message.reply('❌ Cantidades/segundos inválidos.');
      return;
    }
    const inputs = rest.map((tok) => {
      const [k, q] = tok.split(':');
      return { itemKey: (k || '').trim(), qty: Math.max(1, parseInt((q || '1'), 10) || 1) };
    }).filter(x => x.itemKey);
    if (!inputs.length) { await message.reply('❌ Debes especificar al menos un insumo como key:qty'); return; }

    try {
      const res = await createSmeltJob(message.author.id, message.guild!.id, inputs, outputKey, outputQty, seconds);
      const when = new Date(res.readyAt).toLocaleTimeString('es-ES', { hour12: false });
      await message.reply(`🔥 Fundición creada (job: ${res.jobId}). Estará lista a las ${when}.`);
    } catch (e: any) {
      await message.reply(`❌ No se pudo crear la fundición: ${e?.message ?? e}`);
    }
  }
};

