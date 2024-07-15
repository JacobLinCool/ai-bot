import { defineConfig } from "tsup";

export default defineConfig({
	entryPoints: ["src/index.ts", "src/register.ts"],
	format: ["esm"],
	clean: true,
});
