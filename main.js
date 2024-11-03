const discord = require("discord.js");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { error } = require("console");
const { channel } = require("diagnostics_channel");
const { encode } = require("punycode");
const { randomInt } = require("crypto");
const { file } = require("grunt");
const cheerio = require("cheerio");
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
const uploadLimit = 10;
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
	const mentioned = message.mentions.has(client.user);
	const repliedToBot = message.reference && message.reference.messageId === client.user.id;

	const greetingsRegex = /\b(hi+|hai+|helo+|hello+|hey+|howdy+|greetings+|sup+|yo+|hoi+)\b/i;
	if ((mentioned || repliedToBot) && greetingsRegex.test(message.content)) {
		message.reply(greetMessages[Math.floor(Math.random() * greetMessages.length)]);
	}
	if (message.content.startsWith(prefix)) parseCommand(message);
	if (!message.author.bot) checkIfTwitterLink(message);
});

function parseCommand(message) {
	if (message.content.startsWith(prefix + "help") || message.content.startsWith(prefix + "commands")) return helpCommand(message);
	const trimmedCommand = message.content.split(" ")[0].substring(1).toLowerCase();

	switch (trimmedCommand) {
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

		case "whackstats":
			whackStatsCommand(message);
			break;

		case "whack":
			whackCommand(message);
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
	await updateBoards(reaction, user);
});

client.on("messageReactionRemove", async (reaction, user) => {
	await updateBoards(reaction, user);
});

function helpCommand(message) {
	const trimmedCommand = message.content.substring(1).toLowerCase();
	const args = message.content.split(" ");
	const arg = args[1];
	if (args.length < 2) {
		return message.reply(`
my prefix is ${prefix}
^-^
commands:
${prefix}help [command]
${prefix}botinfo, ${prefix}img/image, ${prefix}upload, ${prefix}ls, ${prefix}test
`);
	}
	switch (arg) {
		case "help":
			const helpCount = ((message.content.match(/help/g) || []).length) - 1;
			let response = "";
			for (let i = 0; i < helpCount; i++) response += "wat? ";
			message.reply(response);
			break;

		case "botinfo":
			message.reply(`
cat.js!
a fun little bot that i wrote for my first javascript project.

it's nothing too useful, but i like cats.
you can find the source code for this bot [here](<https://github.com/teaperr/cat.js>)
about the creator:
my name is thea ^-^ im stupid

pfp is of one of my cats, aggy :3

you can contact me on [discord](<https://discord.com/users/903660750277599322/>) and [twitter](<https://twitter.com/retardmoder/>)
my personal website is [thea.tantrum.org](http://thea.tantrum.org)
`
			);
			break;

		case "img":
		case "image":
		case "gif":
		case "cat":
			message.reply(`
sends a random image/gif from the cat gifs folder on my [website](<http://thea.tantrum.org>)

usage: ${prefix}img/image/gif/cat
`);
			break;

		case "upload":
			message.reply(`
uploads a gif/image to [my site](<http://thea.tantrum.org>)
a random gif/image is accessible via the ${prefix}img/cat command

usage: ${prefix}upload [file/url]

videos are automatically converted to gifs thanks to [ffmpeg](<https://github.com/FFmpeg/FFmpeg>)!
`
			);
		case "ls":
			message.reply(
				`
lists the amount of gifs/images that are downloaded to my site :3

usage: ${prefix}ls
`
			);
			break;

		case "test":
			message.reply(
				`
sends a test message ^_^

usage: ${prefix}test
`
			);
			break;
		case "setfireboard":
			message.reply(
				`
sets settings for the fireboard, a tamer version of starboard for less important messages.

usage: ${prefix}setfireboard [channel] [emoji] [votecount]
`
			);
			break;
		case "fireboard":
			message.reply(
				`
prints info about your fireboard settings.

usage: ${prefix}fireboard
`
			);
			break;
		case "setskullboard":
			message.reply(
				`
sets settings for the skullboard, a version of starboard meant for shaming people's worst messages.

usage: ${prefix}setskullboard [channel] [emoji] [votecount]
`
			);
			break;
		case "skullboard":
			message.reply(
				`
prints info about your skullboard settings.

usage: ${prefix}skullboard
`
			);
			break;

		case "coinflip":
		case "coin":
			message.reply("flips a coin!");
			break;

		default:
			message.reply("unknown command");
			break;
	}
}

function checkIfTwitterLink(message) {
	if (message.content.toLowerCase().includes("://twitter.com/") || message.content.toLowerCase().includes("://x.com/")) {
		const replacedMessage = message.cleanContent
			.replace(/https?:\/\/twitter.com\//g, "https://fxtwitter.com/")
			.replace(/https?:\/\/x.com\//g, "https://fxtwitter.com/")
			.replace(/\@everyone/g, `@\\everyone`);

		message.channel.send(replacedMessage);
	}
}

async function whackCommand(message) {
	const whackData = require('./whackData.json');
	const mention = message.mentions.users.first();

	if (!mention) return message.reply('please specify someone to whack!');

	const displayName = message.member.displayName;
	const targetMember = message.guild.members.cache.get(mention.id);
	const mentionedDisplayName = targetMember ? targetMember.displayName : mention.username;

	const roll = Math.floor(Math.random() * 6) + 1;
	const baseDamage = Math.floor(Math.random() * 20) + 1;
	const totalDamage = roll * baseDamage;
	const exclamation = totalDamage < 15 ? ' a measly'
		: totalDamage < 30 ? ' a disappointing'
			: totalDamage < 45 ? ' a mediocre'
				: totalDamage < 60 ? ' a decent'
					: totalDamage < 75 ? ' an above-average'
						: totalDamage < 90 ? ' a hearty'
							: totalDamage < 105 ? ' an extraordinary'
								: totalDamage < 115 ? ' an impressive'
									: ' a whopping';

	let isSelfWhacked = Math.random() * 20 + 1 === 20;
	isSelfWhacked = mention.id === message.author.id;

	const whackMessage = isSelfWhacked
		? `ouch! you whacked **yourself** for${exclamation} **${totalDamage}** damage!`
		: `**${displayName}** whacked **${mentionedDisplayName}** for${exclamation} **${totalDamage}** damage!`;

	if (isSelfWhacked) {
		await message.reply({ content: whackMessage, files: ["./assets/ouch.gif"] });
	} else {
		const sendMessage = await message.reply('rolling...');
		await new Promise(resolve => setTimeout(resolve, 2500)); // simulate delay
		await sendMessage.edit(whackMessage);
	}

	whackData.users ??= {};

	whackData.users[message.author.id] ??= { whacks_given: 0, whacks_received: 0, total_damage_given: 0, total_damage_received: 0 };
	whackData.users[mention.id] ??= { whacks_given: 0, whacks_received: 0, total_damage_given: 0, total_damage_received: 0 };

	whackData.users[message.author.id].whacks_given++;
	if (isSelfWhacked) {
		whackData.users[message.author.id].total_damage_received += totalDamage;
	} else {
		whackData.users[message.author.id].total_damage_given += totalDamage;
		whackData.users[mention.id].whacks_received++;
		whackData.users[mention.id].total_damage_received += totalDamage;
	}

	fs.writeFileSync('./whackData.json', JSON.stringify(whackData, null, 4));
}

function whackStatsCommand(message) {
	let whackData;

	try {
		whackData = require("./whackData.json");
	} catch (error) {
		// If the file doesn't exist or is malformed, initialize it
		whackData = { users: {} };
	}

	const mention = message.mentions.users.first();
	const userId = mention ? mention.id : message.author.id;
	const userStats = whackData.users[userId];

	if (!userStats) {
		return message.reply("no stats found for this user.");
	}

	const averageTaken = userStats.total_damage_received / userStats.whacks_received;
	const averageGiven = userStats.total_damage_given / userStats.whacks_given;

	const statsMessage = `
**whack statistics for ${mention ? mention.username : message.author.username}:**
- whacks given: ${userStats.whacks_given}
- whacks received: ${userStats.whacks_received}
- total damage given: ${userStats.total_damage_given}
- total damage received: ${userStats.total_damage_received}
- average damage given: ${averageGiven || 0}
- average damage taken: ${averageTaken}
        `;

	message.channel.send(statsMessage);
}

async function sendImageCommand(message) {
	message.channel.sendTyping();
	try {
		const gifFiles = await fs.promises.readdir(gifDir);
		if (gifFiles.length === 0) {
			return message.reply(`
no gif files found, upload some with ${prefix}upload [url/attachment]
				`);
		}

		let gifSize = uploadLimit + 1;
		let gifPath = "";

		while (gifSize > uploadLimit) {
			const randomGif = gifFiles[Math.floor(Math.random() * gifFiles.length)];
			gifPath = path.join(gifDir, randomGif);
			gifSize = (await fs.promises.stat(gifPath)).size / (1024 * 1024);
		}

		message.reply({ files: [gifPath] });
	} catch (error) {
		message.reply("error sending gif. please try again.");
	}
}

async function uploadImageCommand(message) {
	message.channel.sendTyping();
	const args = message.content.split(" ");
	let uploadedContentURL = "";
	let uploadedContentType = "";
	let contentMessage;

	// check for attachment
	if (message.attachments.size > 0) {
		uploadedContentURL = message.attachments.first().url;
		uploadedContentType = message.attachments.first().contentType;
		contentMessage = message;
	} else if (message.embeds.length > 0) {
		// check for tenor gif video in embed
		const embed = message.embeds[0];
		if (embed.url.includes("tenor.com") && embed.video) {
			uploadedContentURL = embed.video.url;
		} else {
			uploadedContentURL = embed.url;
		}
		uploadedContentType = embed.type;
		contentMessage = message;
	} else if (message.reference) {
		// if replying to a message with attached content
		try {
			const repliedMessage = await message.fetchReference();
			if (repliedMessage.attachments.size > 0) {
				uploadedContentURL = repliedMessage.attachments.first().url;
				uploadedContentType = repliedMessage.attachments.first().contentType;
				contentMessage = repliedMessage;
			} else if (repliedMessage.embeds.length > 0) {
				const embed = repliedMessage.embeds[0];
				if (embed.url.includes("tenor.com") && embed.video) {
					uploadedContentURL = embed.video.url;
				} else {
					uploadedContentURL = embed.url;
				}
				uploadedContentType = embed.type;
				contentMessage = repliedMessage;
			}
		} catch (error) {
			console.error("err fetching referenced message: ", error);
			return message.reply("could not find content in referenced message");
		}
	} else {
		return message.reply(`
please provide a url, attach a file, or reply to a message with either of those :3

try ${prefix}help upload
		`);
	}


	let [contentType, contentLength, fileNameWithoutExtension, contentName] = await getHeaderFileInfo(uploadedContentURL);

	if ((!contentType.includes("image/") || !contentType.includes("video/")) && (!/\.(mp4|mov|avi|mkv|wmv|flv|webm|gif|png|jpg|jpeg)(\?.*)?$/.test(uploadedContentURL))
	) return message.reply("invalid file type :(");

	let uploadedLinks = require("./uploadedLinks.json");
	uploadedLinks.links ??= [];

	if (uploadedLinks.links.includes(uploadedContentURL)) {
		return message.reply(`
the file you have provided has already been uploaded! you can find it [here](${siteUrl + encodeURIComponent(contentName)})
`);
	} else {
		uploadedLinks[uploadedContentURL];
		fs.writeFileSync("./uploadedLinks.json", JSON.stringify(uploadedLinks, null, 2));
	}

	let success = 0;
	let filePath;
	if (contentType.includes("image/")) {
		[success, filePath] = await downloadFile(uploadedContentURL, contentName);
	} else if (contentType.includes("video/")) {
		[success, filePath] = await ffmpegInputOutput(uploadedContentURL, contentName);
	}

	if (success === 0) return message.reply("download failed :(");

	const outURL = siteUrl + encodeURIComponent(path.basename(filePath));
	return message.reply(`
uploaded successfully! you can find it [here](${outURL})
			`);
}

async function ffmpegInputOutput(url, fileName) {
	return new Promise((resolve, reject) => {
		const trimmedFileName = trimUrl(fileName);
		if (fs.existsSync(path.join(gifDir + trimmedFileName))) fileName = fileName + Date.now();

		const fileNameWithoutExtension = fileName.split(".").slice(0, -1).join(".");
		const finalName = fileNameWithoutExtension + ".gif";
		const command = `/usr/bin/env ffmpeg -i "${url}" -vf "fps=24,scale=${process.env.GIF_WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${path.join(gifDir, finalName)}"`;

		console.log("ffmpeg command: ", command);

		const ffmpegProcess = exec(command, {
			shell: true,
			detached: true,
			stdio: "ignore",
		});

		ffmpegProcess.unref();
		ffmpegProcess.on("error", (error) => {
			console.error("error with ffmpeg: ", error);
			reject(error);
		});

		ffmpegProcess.on("exit", (code, signal) => {
			if (code === 0) {
				resolve([true, path.join(gifDir, finalName)]);
			} else {
				const errMessage = `ffmpeg process exited with code ${code} and signal ${signal}`;
				console.error(errMessage);
				reject(new Error(errMessage));
			}
		});
	});
}

async function downloadFile(url, fileName) {
	return new Promise((resolve, reject) => {
		const trimmedFileName = trimUrl(fileName);
		if (fs.existsSync(path.join(gifDir + trimmedFileName))) fileName = fileName + Date.now();

		const finalName = trimUrl(path.join(gifDir, fileName));

		const command = `/usr/bin/env wget "${url}" -O "${finalName}"`;

		console.log("wget command: ", command);

		const wgetProcess = exec(command, {
			shell: true,
			detached: true,
			stdio: "ignore",
		});

		wgetProcess.unref();
		wgetProcess.on("error", (error) => {
			console.error("error with ffmpeg: ", error);
			reject(error);
		});

		wgetProcess.on("exit", (code, signal) => {
			if (code === 0) {
				resolve([true, finalName]);
			} else {
				const errMessage = `wget process exited with code ${code} and signal ${signal}`;
				console.error(errMessage);
				reject(new Error(errMessage));
			}
		});
	});

}

function botInfoCommand(message) {

}

async function listImagesCommand(message) {
	await fs.readdir(gifDir, (error, files) => {
		if (error) {
			console.log("error reading directory:", error);
			return;
		}
		const imageFiles = files;
		if (imageFiles.length === 0) {
			return message.reply(
				`no image files found, upload some with ${prefix}upload [url/attachment]`
			);
		}
		message.reply(`image count: ${imageFiles.length}`);
	});
}

function skullBoardCommand(message) {
	const channelSettings = require("./skullboardChannelSettings.json");
	const guildID = message.guildId;
	const channelID = channelSettings[guildID]?.channelID;
	const voteEmoji = channelSettings[guildID]?.voteEmoji;
	const voteCount = channelSettings[guildID]?.voteCount;
	return message.reply(
		`skullboard settings:\n    channel: <#${channelID}>\n    emoji: ${voteEmoji}\n    vote count: ${voteCount}`,
	);
}

function setSkullBoardCommand(message) {
	if (!message.member.permissions.has("MANAGE_CHANNELS")) {
		return message.reply(
			"you do not have permission to set the skullboard channel (requires manage channels permission)",
		);
	}
	const args = message.content.split(" ");
	if (args.length < 4) {
		return message.reply(
			`not enough arguments provided, use ${prefix}help setskullboard to get info about this command`,
		);
	}
	if (args.length > 4) {
		return message.reply(
			"please check that you typed your command correctly",
		);
	}
	if (args.join(" ").includes("  ")) {
		return message.reply(
			"please check that there are no double spaces in your command",
		);
	}
	const channelID = args[1].replace(/[<#>]/g, "");
	const voteEmoji = args[2];
	const voteCount = args[3];
	const guildID = message.guildId;
	const channelSettings = require("./skullboardChannelSettings.json");
	channelSettings[guildID] = {
		channelID,
		voteEmoji,
		voteCount,
	};
	fs.writeFileSync(
		"./skullboardChannelSettings.json",
		JSON.stringify(channelSettings, null, 2),
		(err) => {
			if (err) {
				console.error("Error saving to channelSettings.json:", err);
				return message.reply(
					"failed to set skullboard channel. Error with saving JSON data",
				);
			}
		},
	);
	message.reply(`skullboard settings saved successfully:\nchannel: ${args[1]}\nemoji: ${voteEmoji}\ncount: ${voteCount}`);
}

function fireBoardCommand(message) {
	const channelSettings = require("./fireboardChannelSettings.json");
	const guildID = message.guildId;
	const channelID = channelSettings[guildID]?.channelID;
	const voteEmoji = channelSettings[guildID]?.voteEmoji;
	const voteCount = channelSettings[guildID]?.voteCount;
	return message.reply(
		`fireboard settings:\n    channel: <#${channelID}>\n    emoji: ${voteEmoji}\n    vote count: ${voteCount}`,
	);


}

function setFireBoardCommand(message) {
	if (!message.member.permissions.has("MANAGE_CHANNELS")) {
		return message.reply(
			"you do not have permission to set the fireboard channel (requires manage channels permission)",
		);
	}
	const args = message.content.split(" ");
	if (args.length < 4) {
		return message.reply(
			`not enough arguments provided, use ${prefix}help setfireboard to get info about this command`,
		);
	}
	if (args.length > 4) {
		return message.reply(
			"please check that you typed your command correctly",
		);
	}
	if (args.join(" ").includes("  ")) {
		return message.reply(
			"please check that there are no double spaces in your command",
		);
	}
	const channelID = args[1].replace(/[<#>]/g, "");
	const voteEmoji = args[2];
	const voteCount = args[3];
	const guildID = message.guildId;
	const channelSettings = require("./fireboardChannelSettings.json");
	channelSettings[guildID] = {
		channelID,
		voteEmoji,
		voteCount,
	};
	fs.writeFileSync(
		"./fireboardChannelSettings.json",
		JSON.stringify(channelSettings, null, 2),
		(err) => {
			if (err) {
				console.error("Error saving to channelSettings.json:", err);
				return message.reply(
					"failed to set fireboard channel. Error with saving JSON data",
				);
			}
		},
	);
	message.reply(`fireboard settings saved successfully:\nchannel: ${args[1]}\nemoji: ${voteEmoji}\ncount: ${voteCount}`);
}

async function updateBoards(reaction, user) {
	if (user.bot) return;

	const guildID = reaction.message.guildId;
	const skullboardChannelSettings = require("./skullboardChannelSettings.json");
	const skullboardData = require("./skullboardData.json");
	const fireboardChannelSettings = require("./fireboardChannelSettings.json");
	const fireboardData = require("./fireboardData.json");

	const skullboardSettings = skullboardChannelSettings[guildID];
	const fireboardSettings = fireboardChannelSettings[guildID];

	const isSkullboard = skullboardSettings && skullboardSettings.voteEmoji === reaction.emoji.name;
	const isFireboard = fireboardSettings && fireboardSettings.voteEmoji === reaction.emoji.name;

	let boardSettings;
	let boardData;
	let boardPath;
	let footerText = "";

	if (isSkullboard) {
		boardSettings = skullboardSettings;
		boardData = skullboardData;
		boardPath = "./skullboardData.json";
		footerText = "Shamed in Skullboard";
	} else if (isFireboard) {
		boardSettings = fireboardSettings;
		boardData = fireboardData;
		boardPath = "./fireboardData.json";
		footerText = "Fire reacted in Fireboard";
	} else return;

	if (!boardData[guildID]) {
		boardData[guildID] = {};
	}

	if (!boardData[guildID][reaction.message.channelId]) {
		boardData[guildID][reaction.message.channelId] = {
		};
	}

	const pastData = require(boardPath);
	const previousVoteCount = pastData?.[reaction.message.guildId]?.[reaction.message.channelId]?.[reaction.message.id]?.voteCount ?? -1;
	let sentMessageId = pastData?.[reaction.message.guildId]?.[reaction.message.channelId]?.[reaction.message.id]?.sentMessage;

	boardData[guildID][reaction.message.channelId][reaction.message.id] = {
		voteCount: reaction.count,
		sentMessage: sentMessageId
	};

	if (!(reaction.count >= boardSettings.voteCount)) {
		return console.log("gu");
	}

	let attachment;
	let hasAttachment = false;
	let reactionContentType = "";
	if (reaction.message.attachments.first()) {
		hasAttachment = true;
		reactionContentType = reaction.message.attachments.first().contentType;
		attachment = reaction.message.attachments.first();
	} else if (reaction.message.embeds[0]) {
		hasAttachment = true;
		embed = reaction.message.embeds[0];
		if (embed.type.includes("video") || embed.type.includes("image") || embed.type.includes("gifv")) {
			reactionContentType = reaction.message.embeds[0].type;
			attachment = reaction.message.embeds[0];
			hasAttachment = true;
		};
	};

	let embedUrlSection = {
		image: {
			url: attachment.url,
		},
	};


	const fields = [
		{
			name: "Source",
			value: `[Jump to Message](${reaction.message.url})`,
			inline: true
		}
	];

	if (hasAttachment === true && reactionContentType.includes("video")) {
		fields.push({
			name: "Attachment",
			value: `[${trimUrl(path.basename(attachment.url))}](${attachment.url})`,
		});
	}

	// if (!reactionContentType == "" && reactionContentType.includes("video")) {
	// 	embedUrlSection.image = {
	// 		url: attachment.url,
	// 		width: attachment.width,
	// 		height: attachment.height
	// 	};
	// } else if (!reactionContentType == "" && (reactionContentType.includes("image"))) {
	// 	embedUrlSection.image = {
	// 		url: attachment.url,
	// 		width: attachment.width,
	// 		height: attachment.height
	// 	};
	// }

	const messageData = {
		content: `${boardSettings.voteEmoji} **${reaction.count}** <#${reaction.message.channelId}>`,
		embeds: [
			{
				id: "embed_64",
				type: "rich",
				description: reaction.message.content,
				footer: {
					text: footerText,
				},
				author: {
					name: reaction.message.author.displayName,
					iconURL: reaction.message.author.avatarURL()
				},
				color: botAccentColour,
				timestamp: reaction.message.createdTimestamp,
				...embedUrlSection,
				fields: fields,
			}
		]
	};

	let messageChannelIDLocation = boardData[reaction.message.guildId][reaction.message.channelId];
	if (reaction.count > 0) {
		if (sentMessageId && previousVoteCount >= 0) {
			const channel = await client.channels.fetch(reaction.message.channelId);
			try {
				const messageToEdit = await channel.messages.fetch(sentMessageId);
				await messageToEdit.edit(messageData);
				console.log(`Message edited: ${messageToEdit.id}`);
			} catch (error) {
				console.error("Failed to edit message:", error);
			}
		} else {
			const channel = await client.channels.fetch(boardSettings.channelID);
			const sentMessage = await channel.send(messageData);
			console.log(`Message sent with ID: ${sentMessage.id}`);
			boardData[guildID][reaction.message.channelId][reaction.message.id] = {
				sentMessage: sentMessage.id,
				voteCount: reaction.count
			};
		}
	}

	if (isFireboard) {
		fs.writeFileSync(`./fireboardData.json`, JSON.stringify(fireboardData, null, 2));
	} else if (isSkullboard) {
		fs.writeFileSync(`./skullboardData.json`, JSON.stringify(skullboardData, null, 2));
	}
}

async function getHeaderFileInfo(url) {
	console.log("getting header info for: ", url)
	try {
		const response = await fetch(url, { method: "HEAD" });

		const headers = response.headers;
		const contentType = headers.get("Content-Type");
		const contentLength = headers.get("Content-Length");
		let contentName = url.split("/").pop();
		const fileNameWithoutExtension = contentName.split(".").slice(0, -1).join(
			".",
		);

		contentName = decodeURIComponent(contentName);

		return [contentType, contentLength, fileNameWithoutExtension, contentName];
	} catch (error) {
		console.error("Error fetching header info:", error);
		throw error;
	}
}

function trimUrl(url) {
	const lastQuestionMarkIndex = url.lastIndexOf('?');
	return lastQuestionMarkIndex !== -1 ? url.substring(0, lastQuestionMarkIndex) : url;
}
