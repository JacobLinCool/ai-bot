import {
	ChatInputCommandInteraction,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export abstract class Tool {
	abstract enabled: boolean;
	abstract command: RESTPostAPIChatInputApplicationCommandsJSONBody;
	abstract initialize(): Promise<void>;
	abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
