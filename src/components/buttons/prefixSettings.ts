import type {ButtonInteraction} from "discord.js";
import { ComponentType, TextInputStyle } from 'discord-api-types/v10';
import type { Button } from '../../core/types/components';
import type Amayo from '../../core/client';

export default {
    customId: "prefixsettings",
    run: async (interaction: ButtonInteraction, client: Amayo) => {
        const modal = {
            title: 'Cambiar Prefix',
            customId: 'prefixsettingsmodal',
            components: [
                {
                    type: ComponentType.Label,
                    label: 'Nuevo Prefix',
                    component: {
                        type: ComponentType.TextInput,
                        customId: 'prefixInput',
                        style: TextInputStyle.Short,
                        required: true,
                        placeholder: 'Ej: !, ?, $',
                        maxLength: 5
                    },
                },
            ],
        } as const;

        await interaction.showModal(modal);
    }
} satisfies Button;
