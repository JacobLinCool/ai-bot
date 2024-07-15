import { AnimagineTool } from "./animagine";
import { SpeechEnhancementTool } from "./speech-enhancement";
import { Tool } from "./tool";
import { VocalSeparationTool } from "./vocal-separation";

export const tools: Tool[] = [
	new VocalSeparationTool(),
	new SpeechEnhancementTool(),
	new AnimagineTool(),
];
