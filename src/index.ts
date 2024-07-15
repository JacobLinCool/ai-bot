import { config } from "dotenv";
import { bot } from "./bot";
import { server } from "./server";

config();

bot.login(process.env.BOT_TOKEN);

const port = Number(process.env.PORT || 7860);

server.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
