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

const DEFAULT_SPACE = "JacobLinCool/vocal-separation";
const VOCAL_SEPARATION_API =
	typeof process.env.VOCAL_SEPARATION_API === "string"
		? process.env.VOCAL_SEPARATION_API
		: DEFAULT_SPACE;

export class VocalSeparationTool extends Tool {
	enabled = !!VOCAL_SEPARATION_API;
	command = new SlashCommandBuilder()
		.setName("vocal-separation")
		.setDescription("Separate vocals from a song.")
		.addAttachmentOption((option) =>
			option
				.setName("song")
				.setDescription("The song to separate vocals from.")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("link")
				.setDescription("The YouTube link to the song to separate vocals from.")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("model")
				.setDescription("The model to use for separation.")
				.addChoices(
					{ name: "BS-RoFormer", value: "BS-RoFormer" },
					{ value: "HTDemucs-FT", name: "HTDemucs-FT" },
				)
				.setRequired(false),
		)
		.toJSON();

	async initialize(): Promise<void> {
		return;
	}

	async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
		const song = interaction.options.getAttachment("song", false);
		const link = interaction.options.getString("link", false);
		const model = interaction.options.getString("model", false) || "BS-RoFormer";
		if (!song && !link) {
			await interaction.reply({
				content: "Please provide either a song or a YouTube link.",
				ephemeral: true,
			});
			return;
		}
		if (song && link) {
			await interaction.reply({
				content: "Please provide either a song or a YouTube link, not both.",
				ephemeral: true,
			});
			return;
		}
		await interaction.deferReply();

		try {
			const client = await Client.connect(VOCAL_SEPARATION_API);

			let url = "";
			if (link) {
				const result = await client.predict("/youtube", [link]);
				const [song] = result.data as [FileData];
				if (!song.url) {
					throw new Error("Failed to download song.");
				}
				url = song.url;
			} else if (song) {
				url = song.url;
			} else {
				// unreachable
			}

			const result = await client.predict("/separate", [handle_file(url), model]);
			const [vocals, background] = result.data as [FileData, FileData];
			if (!vocals.url || !background.url) {
				throw new Error("Failed to separate vocals.");
			}
			const vocalsBuffer = Buffer.from(
				await fetch(vocals.url).then((response) => response.arrayBuffer()),
			);
			const backgroundBuffer = Buffer.from(
				await fetch(background.url).then((response) => response.arrayBuffer()),
			);

			await interaction.editReply({
				content:
					"Here is the separated tracks!\nFeel free to check out the space: [JacobLinCool/vocal-separation](https://huggingface.co/spaces/JacobLinCool/vocal-separation)",
				files: [
					new AttachmentBuilder(vocalsBuffer, { name: "vocals.mp3" }),
					new AttachmentBuilder(backgroundBuffer, { name: "background.mp3" }),
				],
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: error.message,
			});
		}
	}
}
