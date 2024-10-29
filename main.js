const discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { error } = require("console");
const { channel } = require("diagnostics_channel");
const { encode } = require("punycode");
const { randomInt } = require("crypto");
require("dotenv").config();

// process .env config
const botToken = process.env.TOKEN;
const tenorApiKey = process.env.TENOR_API;
const gifDir = process.env.GIFDIR;
const siteUrl = process.env.SITE_URL;
const compressionRate = process.env.COMPRESSION_RATE;
const prefix = process.env.PREFIX;
const maxFileSizeBytes = process.env.MAX_UPLOAD_MB * 1024 * 1024;
const greetMessages = require("./greetMessages.json").greetMessages;

const urlRegex = /(http[s]?:\/\/[^\s]+)/g;

let channelSettings = {};
try {
	channelSettings = require("./channelSettings.json");
} catch (err) {
	console.error("err loading starboard channel data", err);
}

const client = new discord.Client({
	intents: [
		discord.Intents.FLAGS.GUILDS,
		discord.Intents.FLAGS.GUILD_MEMBERS,
		discord.Intents.FLAGS.GUILD_BANS,
		discord.Intents.FLAGS.GUILD_VOICE_STATES,
		discord.Intents.FLAGS.GUILD_PRESENCES,
		discord.Intents.FLAGS.GUILD_MESSAGES,
		discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
		discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		discord.Intents.FLAGS.MESSAGE_CONTENT,
	],
});

client.login(botToken);

client.on("messageCreate", async (message) => {
	switch (message.content) {
		case message.content.startsWith(prefix):

			break;

		default:
			break;
	}
});
