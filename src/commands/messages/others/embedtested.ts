import {CommandMessage} from "../../../core/types/commands";

export const command: CommandMessage = {
    name: 'test1',
    type: "message",
    cooldown: 5,
    run: async (message, args) => {
        //@ts-ignore
        await message.channel.send({
            "flags": 32768,
            "components": [
                {
                    "type": 17,
                    "components": [
                        {
                            "type": 10,
                            "content": "## ﹒⌒       　  　🌹   Navegacion  🌹　　       　╰୧﹒"
                        },
                        {
                            "type": 14,
                            "spacing": 2,
                            "divider": false
                        },
                        {
                            "type": 9,
                            "components": [
                                {
                                    "type": 10,
                                    "content": "### Reglas dentro del Servidor"
                                }
                            ],
                            "accessory": {
                                "style": 2,
                                "type": 5,
                                "label": "Ver",
                                "url": "https://discord.com/channels/1316592320954630144/1417682278762676264/1417901305434734656",
                            }
                        }
                    ],
                    "accent_color": 4393549
                }
            ]
        })
    }
}