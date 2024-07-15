import { REST, Routes } from "discord.js";
import { config } from "dotenv";
import { tools } from "./tools";

config();

const commands = tools.map((tool) => tool.command);

const rest = new REST().setToken(process.env.BOT_TOKEN || "");

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		await rest.put(Routes.applicationCommands(process.env.BOT_ID || ""), { body: commands });
		console.log(`Successfully reloaded application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
