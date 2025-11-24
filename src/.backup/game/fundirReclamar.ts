import type { CommandMessage } from '../../../core/types/commands';
import type Amayo from '../../../core/client';
import { claimSmeltJob, claimNextReadyJob } from '../../../game/smelting/service';

export const command: CommandMessage = {
  name: 'fundir-reclamar',
  type: 'message',
  aliases: ['smelt-claim','reclamar-fundicion'],
  cooldown: 3,
  description: 'Reclama una fundición lista por jobId o la más antigua lista si no especificas id.',
  usage: 'fundir-reclamar [jobId]'
    + '\nSin argumentos intenta reclamar la más antigua lista.',
  run: async (message, args, _client: Amayo) => {
    const jobId = args[0]?.trim();
    try {
      if (jobId) {
        await claimSmeltJob(message.author.id, message.guild!.id, jobId);
        await message.reply(`✅ Fundición reclamada (job ${jobId}).`);
      } else {
        const res = await claimNextReadyJob(message.author.id, message.guild!.id);
        await message.reply(`✅ Fundición reclamada (job ${res.jobId}).`);
      }
    } catch (e: any) {
      await message.reply(`❌ No se pudo reclamar: ${e?.message ?? e}`);
    }
  }
};

