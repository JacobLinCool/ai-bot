import { Client, FileData, handle_file } from "@gradio/client";
import {
	AttachmentBuilder,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { config } from "dotenv";
import { Tool } from "./tool";

config();

const DEFAULT_SPACE = "JacobLinCool/MP-SENet";
const SPEECH_ENHANCEMENT_API =
	typeof process.env.SPEECH_ENHANCEMENT_API === "string"
		? process.env.SPEECH_ENHANCEMENT_API
		: DEFAULT_SPACE;

export class SpeechEnhancementTool extends Tool {
	enabled = !!SPEECH_ENHANCEMENT_API;
	command = new SlashCommandBuilder()
		.setName("speech-enhancement")
		.setDescription("Enhance the speech quality of an audio clip by removing noise.")
		.addAttachmentOption((option) =>
			option.setName("audio").setDescription("The audio clip to enhance.").setRequired(true),
		)
		.toJSON();

	async initialize(): Promise<void> {
		return;
	}

	async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
		const audio = interaction.options.getAttachment("audio", true);
		await interaction.deferReply();

		try {
			const client = await Client.connect(SPEECH_ENHANCEMENT_API);
			const preprocessed = await client.predict("/preprocess", [
				handle_file(audio.url),
				false,
			]);
			const [taskId] = preprocessed.data as [string, string];
			if (!taskId) {
				throw new Error("Failed to preprocess audio.");
			}

			const result = await client.predict("/run", [taskId]);
			const [enhanced] = result.data as [FileData, FileData, FileData, string];
			if (!enhanced.url) {
				throw new Error("Failed to enhance speech.");
			}
			const enhancedBuffer = Buffer.from(
				await fetch(enhanced.url).then((response) => response.arrayBuffer()),
			);

			await interaction.editReply({
				content:
					"Here is the enhanced speech!\nFeel free to check out the space: [JacobLinCool/MP-SENet](https://huggingface.co/spaces/JacobLinCool/MP-SENet)",
				files: [new AttachmentBuilder(enhancedBuffer, { name: "enhanced.wav" })],
			});
		} catch (error) {
			await interaction.editReply({
				content: error.message,
			});
		}
	}
}
