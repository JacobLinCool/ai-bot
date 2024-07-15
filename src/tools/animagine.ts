import { Client, FileData } from "@gradio/client";
import {
	AttachmentBuilder,
	CacheType,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { config } from "dotenv";
import { Tool } from "./tool";

config();

const DEFAULT_SPACE = "cagliostrolab/animagine-xl-3.1";
const ANIMAGINE_API =
	typeof process.env.ANIMAGINE_API === "string" ? process.env.ANIMAGINE_API : DEFAULT_SPACE;

export class AnimagineTool extends Tool {
	enabled = !!ANIMAGINE_API;
	command = new SlashCommandBuilder()
		.setName("animagine")
		.setDescription(
			"Generate images from text. Checkout https://huggingface.co/spaces/cagliostrolab/animagine-xl-3.1",
		)
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("The text prompt to generate images from.")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("negtive-prompt")
				.setDescription("The negtive text prompt to generate images from.")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("style")
				.setDescription("The style to use for generation.")
				.addChoices(
					{ value: "Cinematic", name: "Cinematic" },
					{ name: "Pixel art", value: "Pixel art" },
					{ value: "Digital Art", name: "Digital Art" },
					{ value: "Fantasy art", name: "Fantasy art" },
					{ value: "Manga", name: "Manga" },
					{ value: "Anime", name: "Anime" },
					{ value: "Photographic", name: "Photographic" },
					{ value: "Neonpunk", name: "Neonpunk" },
					{ value: "3D Model", name: "3D Model" },
				)
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("size")
				.setDescription("The size of the generated image. (width x height)")
				.addChoices(
					{ name: "1024 x 1024", value: "1024 x 1024" },
					{ value: "1152 x 896", name: "1152 x 896" },
					{ value: "896 x 1152", name: "896 x 1152" },
					{ value: "1216 x 832", name: "1216 x 832" },
					{ value: "832 x 1216", name: "832 x 1216" },
					{ value: "1344 x 768", name: "1344 x 768" },
					{ value: "768 x 1344", name: "768 x 1344" },
					{ value: "1536 x 640", name: "1536 x 640" },
					{ value: "640 x 1536", name: "640 x 1536" },
				)
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName("seed")
				.setDescription("The seed to use for generation.")
				.setRequired(false),
		)
		.toJSON();

	async initialize(): Promise<void> {
		return;
	}

	async execute(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
		const prompt = interaction.options.getString("prompt", true);
		const negtivePrompt = interaction.options.getString("negtive-prompt", false) || "";
		const style = interaction.options.getString("style", false) || "Cinematic";
		const size = interaction.options.getString("size", false) || "896 x 1152";
		const seed =
			interaction.options.getInteger("seed", false) || Math.floor(Math.random() * 1000000);
		const width = 512;
		const height = 512;
		const guidance = 7;
		const steps = 28;
		const sampler = "Euler a";
		const quality = "Standard v3.1";
		const upscaler = false;
		const upscalerStrength = 0.55;
		const upscaleBy = 1.5;
		await interaction.deferReply();

		try {
			const client = await Client.connect(ANIMAGINE_API);

			const result = await client.predict("/run", [
				prompt,
				negtivePrompt,
				seed,
				width,
				height,
				guidance,
				steps,
				sampler,
				size,
				style,
				quality,
				upscaler,
				upscalerStrength,
				upscaleBy,
				true,
			]);
			const [images, metadata] = result.data as [{ image: FileData }[], unknown];
			console.log(images, metadata);
			if (!images?.[0]?.image?.url) {
				throw new Error("Failed to generate image.");
			}
			const imageBuffer = await fetchFile(images[0].image.url);

			await interaction.editReply({
				files: [new AttachmentBuilder(imageBuffer, { name: "image.png" })],
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: error.message,
			});
		}
	}
}

async function fetchFile(file: string): Promise<Buffer> {
	let url = new URL(file);
	if (ANIMAGINE_API.startsWith("http")) {
		url = new URL(`${ANIMAGINE_API}${url.pathname}`);
	}
	console.log(url);
	const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	return Buffer.from(buffer);
}
