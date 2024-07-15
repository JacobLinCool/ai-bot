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
			const replica = ANIMAGINE_API.startsWith("http")
				? await resolveReplica("cagliostrolab", "animagine-xl-3.1")
				: undefined;
			const endpoint = replica ? `${ANIMAGINE_API}/--replicas/${replica}` : ANIMAGINE_API;
			console.log(`Using endpoint: ${endpoint}`);
			const client = await Client.connect(endpoint);

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
			const imageBuffer = await fetchFile(images[0].image.url, endpoint);

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

async function fetchFile(file: string, endpoint: string): Promise<Buffer> {
	let url: URL;
	try {
		url = new URL(`${endpoint}${new URL(file).pathname}`);
	} catch {
		url = new URL(file);
	}
	const response = await fetch(url);
	const buffer = await response.arrayBuffer();
	return Buffer.from(buffer);
}

async function readSSE(res: Response, event: string, count: number): Promise<string[]> {
	const reader = res.body?.getReader();
	if (!reader) {
		throw new Error("Response body is not readable");
	}

	const decoder = new TextDecoder();
	let eventCount = 0;
	const events: string[] = [];

	let line = "";
	let flag = false;
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		const text = decoder.decode(value);
		line += text;

		while (line.includes("\n")) {
			let [current, ...next] = line.split("\n");
			line = next.join("\n");
			current = current.trim();
			if (!current) {
				continue;
			}

			if (flag) {
				events.push(current.slice(6));
				flag = false;

				eventCount++;
				if (eventCount >= count) {
					return events;
				}
			}
			if (current.startsWith(`event: ${event}`)) {
				flag = true;
			}
		}
	}

	return events;
}

async function resolveReplica(user: string, repo: string): Promise<string | undefined> {
	try {
		const url = `https://api.hf.space/v1/${user}/${repo}/live-metrics/sse`;
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Failed to fetch replica: ${res.statusText}`);
		}

		const events = await readSSE(res, "metric", 5);
		const metrics = events
			.map((event) => {
				try {
					return JSON.parse(event);
				} catch {
					return undefined;
				}
			})
			.filter(Boolean);
		const replica: string | undefined =
			metrics[Math.floor(Math.random() * metrics.length)].replica;
		if (!replica) {
			throw new Error("Replica not found in metrics");
		}
		console.log(`Selected replica: ${replica}`);

		return replica;
	} catch (e) {
		console.error(e);
		return undefined;
	}
}
