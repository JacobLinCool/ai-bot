import { Client, Events, GatewayIntentBits } from "discord.js";
import { tools } from "./tools";

const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });

bot.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

bot.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) {
		return;
	}

	try {
		for (const tool of tools) {
			if (interaction.commandName === tool.command.name) {
				if (tool.enabled) {
					await tool.execute(interaction);
				} else {
					await interaction.reply("This tool is currently disabled.");
				}
				return;
			}
		}
	} catch (error) {
		console.error(error);
		if (interaction.replied) {
			await interaction.followUp("An error occurred while executing the command.");
		} else {
			await interaction.reply("An error occurred while executing the command.");
		}
	}
});

export { bot };
