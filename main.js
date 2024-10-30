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
const botAccentColour = process.env.ACCENT_COLOUR;

const urlRegex = /(http[s]?:\/\/[^\s]+)/g;
const greetingsRegex = /\b(hi+|hai+|helo+|hello+|hey+|howdy+|greetings+|sup+|yo+|hoi+)\b/i;
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
client.once("ready", () => {
	console.log(`successfully logged in as ${client.user.username}`);
});

client.on("messageCreate", async (message) => {
	if (message.content.startsWith(prefix)) parseCommand(message);
	checkIfTwitterLink(message);
});

function parseCommand(message) {
	const trimmedCommand = message.content.substring(1).toLowerCase();

	switch (trimmedCommand) {
		case "help":
		case "commands":
			helpCommand(message);
			break;

		case "botinfo":
			botInfoCommand(message);
			break;

		case "ping":
			message.reply("pong!");
			break;

		case "freakmode true":
			message.reply("👅");
			break;

		case "coinflip":
		case "coin":
			const outputNumber = Math.floor(Math.random() * 2);
			if (outputNumber == 1) {
				message.reply("heads!");
			} else {
				message.reply("tails!");
			}
			break;

		case "creppymode true":
			message.reply("https://media.discordapp.net/attachments/1157523563729932361/1259053848048173107/120d6c08b3a21ca74c9127f47ccb1d527e931922bfcebf715ae76236448776d5_1.png?ex=668a48c5&is=6688f745&hm=e9fb0f0486ae1fb7134227b56075a4e154cd1cb564e2d8b86631a168e57edad1&=&format=webp&quality=lossless");
			break;

		case "mondaymorning":
			message.reply("https://media.discordapp.net/attachments/1157523563729932360/1236014296199336037/attachment.gif?ex=66367784&is=66352604&hm=3ccc0f7325bc080655f81777763554b6d5044a158013d4813ff3518b8914dcc0&=");
			break;

		case "test":
			message.reply(":3");
			break;

		case "whack":
			whackCommand(message);
			break;

		case "whackstats":
			whackStatsCommand(message);
			break;

		case "gif":
		case "img":
		case "image":
			sendImageCommand(message);
			break;

		case "upload":
			uploadImageCommand(message);
			break;

		case "ls":
		case "list":
			listImagesCommand(message);
			break;

		case "skullboard":
			skullBoardCommand(message);
			break;

		case "setskullboard":
			setSkullBoardCommand(message);
			break;

		case "fireboard":
			fireBoardCommand(message);
			break;

		case "setfireboard":
			setFireBoardCommand(message);
			break;

		default:
			break;
	}
}

client.on("messageReactionAdd", async (reaction, user) => {
	updateBoards(reaction, user);
});

function helpCommand(message) {

}

function checkIfTwitterLink(message) {

}

function whackCommand(message) {

}

function whackStatsCommand(message) {

}

function sendImageCommand(message) {

}

function uploadImageCommand(message) {

}

function botInfoCommand(message) {

}

function listImagesCommand(message) {

}

function skullBoardCommand(message) {

}

function setSkullBoardCommand(message) {

}

function fireBoardCommand(message) {

}

function setFireBoardCommand(message) {

}

async function updateBoards(reaction, user) {
	if (user.bot) return;

	const guildID = reaction.message.guildId;
	const skullboardChannelSettings = require("./skullboardChannelSettings.json");
	const skullboardData = require("./skullboardData.json");
	const fireBoardChannelSettings = require("./fireBoardChannelSettings.json");
	const fireBoardData = require("./fireBoardData.json");

	const skullboardSettings = skullboardChannelSettings[guildID];
	const fireboardSettings = fireBoardChannelSettings[guildID];

	const isSkullboard = skullboardSettings && skullboardSettings.voteEmoji === reaction.emoji.name;
	const isFireboard = fireboardSettings && fireboardSettings.voteEmoji === reaction.emoji.name;

	let boardSettings;
	let boardData;
	let footerText = "";

	if (isSkullboard) {
		boardSettings = skullboardSettings;
		boardData = skullboardData;
		footerText = "Shamed in Skullboard";
	} else if (isFireboard) {
		boardSettings = fireboardSettings;
		boardData = fireBoardData;
		footerText = "Fire reacted in Fireboard";
	} else return;

	if (!boardSettings.voteCount >= reaction.count) return;

	let attachment;
	let reactionContentType = "";
	if (reaction.message.attachments.first().contentType) {
		reactionContentType = reaction.message.attachments.first().contentType;
		attachment = reaction.message.attachments.first();
	} else if (reaction.message.embeds[0]) {
		embed = reaction.message.embeds[0];
		if (embed.type.includes("video") || embed.type.includes("image") || embed.type.includes("gifv")) {
			reactionContentType = reaction.message.embeds[0].type;
			attachment = reaction.message.embeds[0];
		};
	};

	let embedUrlSection = {};

	if (!reactionContentType == "" && reactionContentType.includes("video")) {
		embedUrlSection.video = {
			attachmentURL: attachment.url,
			attachmentProxyURL: attachment.proxyURL,
			attachmentWidth: attachment.width,
			attachmentHeight: attachment.height
		};
	} else if (!reactionContentType == "" && (reactionContentType.includes("image") || reactionContentType.includes("gifv"))) {
		embedUrlSection.image = {
			attachmentURL: attachment.url,
			attachmentProxyURL: attachment.proxyURL,
			attachmentWidth: attachment.width,
			attachmentHeight: attachment.height
		};
	};

	const messageData = {
		content: `${boardSettings.voteEmoji} **${reaction.count}** <#${reaction.message.channelId}>`,
		embeds: [
			{
				id: "embed_64",
				type: "rich",
				rawDescription: reaction.message.content,
				footer: {
					text: footerText,
				},
				author: {
					name: reaction.message.author.displayName,
					iconURL: reaction.message.author.displayAvatarURL,
				},
				color: botAccentColour,
				timestamp: reaction.message.createdTimestamp,
				...embedUrlSection,
				fields: [
					{
						value: `[Jump to Message](${reaction.message.url})`,
						inline: true
					}
				]
			}
		]
	};
	let messageChannelIDLocation = boardData[reaction.message.guildId][reaction.message.channelId];

	if (messageChannelIDLocation[reaction.message.id] && reaction.count >= messageChannelIDLocation[reaction.message.id].voteCount) {
		client.channels.fetch(reaction.message.channelId)
			.then(channel => channel.messages.fetch(reaction.message.id))
			.then(message => message.edit(messageData))
			.then(updatedMessage => console.log(`message edited: ${updatedMessage}`))
			.catch(console.error);
	} else {

		client.channels.fetch(boardSettings[reaction.message.guildId].channelID)
			.then(channel => channel.send(messageData))
			.then(sentMessage => console.log(`message sent with ID: ${sentMessage.id}`))
			.catch(console.error);
	}
}
