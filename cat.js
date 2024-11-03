const discord = require("discord.js");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const https = require("https");
const urlModule = require("url");
const { exec } = require("child_process");
const { error } = require("console");
const { channel } = require("diagnostics_channel");
const { encode } = require("punycode");
const { randomInt } = require("crypto");

// process config
require("dotenv").config();
const botToken = process.env.TOKEN;
const tenorApiKey = process.env.TENOR_API;
const gifDir = process.env.GIFDIR;
const siteUrl = process.env.SITE_URL;
const compressionRate = process.env.COMPRESSION_RATE;
const prefix = process.env.PREFIX;
const maxFileSizeBytes = process.env.MAX_UPLOAD_MB * 1024 * 1024;
const greetMessages = require("./greetMessages.json").greetMessages;

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

const urlRegex = /(http[s]?:\/\/[^\s]+)/g;
client.on("messageCreate", async (message) => {
	const mentioned = message.mentions.has(client.user);
	const repliedToBot = message.reference &&
		message.reference.messageID === client.user.id;

	if (
		message.content.toLowerCase().includes("https://twitter.com/") ||
		message.content.toLowerCase().includes("https://x.com/")
	) {
		const replacedMessage = message.content
			.replace(/https?:\/\/twitter.com\//g, "https://fxtwitter.com/")
			.replace(/https?:\/\/x.com\//g, "https://fixupx.com/");

		await message.channel.send(replacedMessage);
	}

	if (message.content.toLowerCase().startsWith(prefix + "freakmode true")) {
		return message.reply("👅");
	}

	if (message.content.toLowerCase().startsWith(prefix + "creppymode true")) {
		return message.reply("https://media.discordapp.net/attachments/1157523563729932361/1259053848048173107/120d6c08b3a21ca74c9127f47ccb1d527e931922bfcebf715ae76236448776d5_1.png?ex=668a48c5&is=6688f745&hm=e9fb0f0486ae1fb7134227b56075a4e154cd1cb564e2d8b86631a168e57edad1&=&format=webp&quality=lossless");
	}

	if (
		message.content.toLowerCase().startsWith(prefix + "coinflip") ||
		message.content.toLowerCase().startsWith(prefix + "coin")
	) {
		const outputNumber = Math.floor(Math.random() * 2);
		if (outputNumber == 1) {
			return message.reply("heads!");
		} else {
			return message.reply("tails!");
		}
	}

	if (message.content.toLowerCase().startsWith(prefix + "whackstats")) {
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
- average damage given: ${averageGiven}
- average damage taken: ${averageTaken}
        `;

		message.channel.send(statsMessage);
	}


	if (message.content.toLowerCase().startsWith(prefix + "whack") && !message.content.toLowerCase().startsWith(prefix + "whackstats")) {
		const whackData = require("./whackData.json");

		const args = message.content.split(" ");
		const mention = message.mentions.users.first();
		if (!mention) {
			return message.reply("please specify someone to whack!");
		} else if (mention) {
			// const userInfo = require("./userRPGStats.json");
			const displayName = message.member.displayName;
			const sendMessage = await message.reply("rolling...");

			const roll = Math.floor(Math.random() * 6) + 1;
			const baseDamage = Math.floor(Math.random() * 20) + 1;
			const totalDamage = roll * baseDamage;

			// const mentionedDisplayName = mention.displayName;
			const member = message.guild.members.cache.get(message.mentions.users.first().id);
			const mentionedDisplayName = member ? member.displayName : mentionedUser.username;

			var exclamation = "";

			var isSelfWhacked = false;

			switch (true) {
				case (totalDamage < 15):
					exclamation = " a measly";
					break;
				case (totalDamage >= 15 && totalDamage < 30):
					exclamation = " a disappointing";
					break;
				case (totalDamage >= 30 && totalDamage < 45):
					exclamation = " a mediocre";
					break;
				case (totalDamage >= 45 && totalDamage < 60):
					exclamation = " a decent";
					break;
				case (totalDamage >= 60 && totalDamage < 75):
					exclamation = " an above-average";
					break;
				case (totalDamage >= 75 && totalDamage < 90):
					exclamation = " a hearty";
					break;
				case (totalDamage >= 90 && totalDamage < 105):
					exclamation = " an extraordinary";
					break;
				case (totalDamage >= 105 && totalDamage < 115):
					exclamation = " an impressive";
					break;
				case (totalDamage >= 115 && totalDamage < 121):
					exclamation = " a whopping";
					break;
				default:
					exclamation = "";
			}
			var whackMessage = "**" + displayName + " **" + "whacked **" + mentionedDisplayName + "** for" + exclamation + " **" + totalDamage + "**" + " damage!";

			if ((Math.floor(Math.random() * 2) + 1) == 20) {
				whackMessage = "[ouch!](https://tenor.com/view/jerma-jerma985-slap-gif-15826649) you whacked *yourself* for " + exclamation + " **" + totalDamage + "**!";
				isSelfWhacked = true;
			}

			if (!whackData.users[message.author.id]) {
				whackData.users[message.author.id] = {
					whacks_given: 0,
					whacks_received: 0,
					total_damage_given: 0,
					total_damage_received: 0
				};
			}
			if (!whackData.users[mention.id]) {
				whackData.users[mention.id] = {
					whacks_given: 0,
					whacks_received: 0,
					total_damage_given: 0,
					total_damage_received: 0
				};
			}

			whackData.users[message.author.id].whacks_given++;
			whackData.users[mention.id].whacks_received++;

			if (isSelfWhacked) {
				whackData.users[message.author.id].total_damage_received += totalDamage;
			} else {
				whackData.users[message.author.id].total_damage_given += totalDamage;
				whackData.users[mention.id].total_damage_received += totalDamage;
			}

			fs.writeFileSync('./whackData.json', JSON.stringify(whackData, null, 4));


			setTimeout(async () => {
				await sendMessage.edit(whackMessage)
			}, 2500);

		}
	}

	if (message.content.toLowerCase().startsWith(prefix + "help")) {
		const args = message.content.split(" ");
		if (args.length < 2) {
			return message.reply(
				`my prefix is ${prefix}\n^-^\ncommands:\n${prefix}help [command]\n${prefix}botinfo, ${prefix}img/image, ${prefix}upload, ${prefix}ls, ${prefix}test`,
			);
		}
		const arg = args[1];
		const imageCommandReply = `sends a random image/gif from the cat gifs folder on my [website](<http://thea.tantrum.org>)\n\nusage: ${prefix}img/image`;
		switch (arg) {
			case "help":
				const helpCount = ((message.content.match(/help/g) || []).length) - 1;
				let response = "";
				for (let i = 0; i < helpCount; i++) response += "wat? ";
				message.reply(response);
				break;
			case "botinfo":
				return message.reply(
					"cat.js!\na fun little bot that i wrote for my first javascript project.\n\nit's nothing too useful, but i like cats.\n\nyou can find the source code for this bot [here](<https://github.com/teaperr/cat.js>)\nabout the creator:\nmy name is thea ^-^ im stupid\n\npfp is of one of my cats, agatha :3\n\nyou can contact me on [discord](<https://discord.com/users/903660750277599322/>) and [twitter](<https://twitter.com/retardmoder/>)\nmy personal website is [thea.tantrum.org](http://thea.tantrum.org)",
				);
			case "img":
				return message.reply(imageCommandReply);
			case "image":
				return message.reply(imageCommandReply);
			case "upload":
				return message.reply(
					`uploads a gif/image to [my site](<http://thea.tantrum.org>), which is accessible via the ${prefix}img/image command\n\nusage: ${prefix}upload [file/url]\n\nvideos are automatically converted to gifs thanks to [ffmpeg](<https://github.com/FFmpeg/FFmpeg>)!`,
				);
			case "ls":
				return message.reply(
					`lists the amount of gifs/images that are downloaded to my site :3\n\nusage: ${prefix}ls`,
				);
			case "test":
				return message.reply(
					`sends a test message ^-^\n\nusage: ${prefix}test`,
				);
			case "setskullboard":
				return message.reply(
					`sets settings for the skullboard, a version of starboard meant for shaming people's worst messages.\nusage: ${prefix}setskullboard [channel] [emoji] [votecount]`,
				);
			case "skullboard":
				return message.reply(`prints info about your skullboard settings.`);
			case "coinflip" || "coin":
				return message.reply("flips a coin!");
			default:
				return message.reply("unknown command");
		}
	}
	const greetingsRegex =
		/\b(hi+|hai+|helo+|hello+|hey+|howdy+|greetings+|sup+|yo+|hoi+)\b/i;
	if ((mentioned || repliedToBot) && greetingsRegex.test(message.content)) {
		message.reply(
			greetMessages[Math.floor(Math.random() * greetMessages.length)],
		);
	}

	if (
		(mentioned || repliedToBot) &&
		message.content.toLowerCase().includes("glugh")
	) {
		const messageContent = [
			"RAAARHG",
			"RAAGHGHRHGRGH",
			"RAAAAARRRHGGHGHGHGHGHHHGGH",
			"RAAARRGGHGHGHGHGHGHGHRGH",
			"rawr",
			"GO AWAT!!!!!!!!",
			"GO AWAY!!!!",
			"rarrhjrjharafsd",
			"im gonna kil you,,",
			"AAAAHHHHHJRGHFGDJHHHJDGJDHGF",
		];
		message.reply(
			messageContent[Math.floor(Math.random() * messageContent.length)],
		);
	}
	if (message.content === (prefix + "gif") || message.content === (prefix + "img") || message.content === (prefix + "image")) {
		message.channel.sendTyping();
		try {
			const files = await fs.promises.readdir(gifDir);
			const gifFiles = files;

			if (gifFiles.length === 0) {
				return message.reply(
					`no gifs files found, upload some with ${prefix}upload [url/attachment]`,
				);
			}

			let gifSize = 9;
			let gifPath = "";

			while (gifSize > 8) {
				const randomGif = gifFiles[Math.floor(Math.random() * gifFiles.length)];
				gifPath = path.join(gifDir, randomGif);
				gifSize = (await fs.promises.stat(gifPath)).size / (1024 * 1024);
			}

			message.reply({ files: [gifPath] });
		} catch (error) {
			console.error("error reading gif dir:", error);
		}
	}

	if (message.content.toLowerCase().startsWith(prefix + "upload")) {
		const args = message.content.split(" ");
		const uploadedContent = message.attachments.first();
		let url = args[1];
		message.channel.sendTyping();
		if (args.length === 2) {
			url = args[1];
		} else if (uploadedContent) {
			url = uploadedContent.url;
		} else if (message.reference) {
			try {
				const referencedMessage = await message.fetchReference();
				if (urlRegex.test(referencedMessage.content)) {
					const urlMatch = referencedMessage.content.match(urlRegex);
					if (urlMatch) {
						url = urlMatch[0];
					}
				} else if (referencedMessage.attachments.first) {
					url = referencedMessage.attachments.first.url;
				}
			} catch (error) {
				console.error("err fetching referenced message:", error);
				message.reply("could not find content in referenced message");
			}
		} else {
			return message.reply(
				`please provide a valid url, upload a file or reply to a message with media content :3\nto get usage, try ${prefix}help [command]`,
			);
		}

		if (url.includes("/tenor.com/") || url.includes("/giphy.com/")) {
			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error("Network response was not ok");
				}
				const htmlContent = await response.text();
				const tenorUrlMatch = htmlContent.match(
					/https?:\/\/(media1\.tenor\.com|media2\.giphy\.com)\/[^"]+/,
				);
				if (!tenorUrlMatch) {
					throw new Error("Could not find Tenor media URL in HTML");
				}
				url = tenorUrlMatch[0];
				if (url.includes("/media2.giphy.com/")) {
					const giphyResponse = await fetch(url);
					const giphyContent = await giphyResponse.text();
					const giphyUrlMatch = htmlContent.match(
						/https?:\/\/(i\.giphy\.com)\/[^"]+/,
					);
					if (!giphyUrlMatch) {
						throw new Error("Could not find Giphy media URL in HTML");
					}
					url = giphyUrlMatch[0];
				}
			} catch (error) {
				console.error(
					"There was a problem processing the Tenor/Giphy link:",
					error,
				);
				return message.reply("Could not process Tenor/Giphy link 💔");
			}
		}
		let [contentType, contentLength, fileNameWithoutExtension, contentName] =
			await getHeaderFileInfo(url);
		if (
			(!contentType.includes("image/") || !contentType.includes("video/")) &&
			(!/\.(mp4|mov|avi|mkv|wmv|flv|webm|gif|png|jpg|jpeg)(\?.*)?$/.test(url))
		) return message.reply("invalid file type :(");
		const inFile = url;
		let outFile = fileNameWithoutExtension + ".gif";
		if (fs.existsSync(path.join(gifDir, outFile))) {
			outFile = fileNameWithoutExtension +
				(+new Date() * Math.random()).toString(36).substring(0, 6) + ".gif";
		}
		let isUploaded;
		const uploadedLinks = JSON.parse(
			fs.readFileSync("./uploadedLinks.json"),
		);
		if (uploadedLinks["links"] && uploadedLinks["links"].includes(url)) {
			isUploaded = true;
		} else {
			uploadedLinks["links"] = uploadedLinks["links"] || [];
			uploadedLinks["links"].push(url);
			fs.writeFileSync(
				"./uploadedLinks.json",
				JSON.stringify(uploadedLinks, null, 2),
			);
			isUploaded = false;
		}

		let outURL = siteUrl + encodeURIComponent(outFile);
		if (isUploaded) {
			message.reply(
				`the gif you have provided has already been uploaded! you can find it [here](${siteUrl + encodeURIComponent(fileNameWithoutExtension + ".gif")
				})`,
			);
			return;
		} else if (inFile.toLowerCase().includes(".gif")) {
			await downloadGif(inFile, path.join(gifDir, outFile));
		} else if (inFile.toLowerCase().includes(".jpg") || inFile.toLowerCase().includes(".jpeg") || inFile.toLowerCase().includes(".png")) {
			await downloadGif(inFile, path.join(gifDir, (fileNameWithoutExtension + ".webp")));
			outFile = fileNameWithoutExtension + ".webp";
		} else {
			await ffmpegInputOutput(inFile, path.join(gifDir, outFile));
		}

		outURL = siteUrl + encodeURIComponent(outFile);
		return message.reply(
			`uploaded successfully! you can find it [here](${outURL})`,
		);
	}
	if (message.content.toLowerCase() === (prefix + "botinfo")) {
		return message.reply(
			"cat.js!\na fun little bot that i wrote for my first javascript project.\n\nit's nothing too useful, but i like cats.\n\nyou can find the source code for this bot [here](<https://github.com/teaperr/cat.js>)\nabout the creator:\nmy name is thea ^-^ im stupid\n\npfp is of one of my cats, agatha :3\n\nyou can contact me on [discord](<https://discord.com/users/903660750277599322/>) and [twitter](<https://twitter.com/retardmoder/>)\nmy personal website is [thea.tantrum.org](http://thea.tantrum.org)",
		);
	}
	if (message.content.toLowerCase() === (prefix + "ls")) {
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
	if (message.content.toLowerCase() === (prefix + "mondaymorning")) {
		return message.reply(
			"https://media.discordapp.net/attachments/1157523563729932360/1236014296199336037/attachment.gif?ex=66367784&is=66352604&hm=3ccc0f7325bc080655f81777763554b6d5044a158013d4813ff3518b8914dcc0&=",
		);
	}
	if (message.content.toLowerCase() === (prefix + "test")) {
		return message.reply(":3");
	}

	if (message.content.toLowerCase().startsWith(prefix + "skullboard")) {
		const channelSettings = require("./channelSettings.json");
		const guildID = message.guildId;
		const channelID = channelSettings[guildID].channelID;
		const voteEmoji = channelSettings[guildID].voteEmoji;
		const voteCount = channelSettings[guildID].voteCount;
		return message.reply(
			`skullboard settings:\n    channel: <#${channelID}>\n    emoji: ${voteEmoji}\n    vote count: ${voteCount}`,
		);
	}

	if (message.content.toLowerCase().startsWith(prefix + "fireboard")) {
		const channelSettings = require("./fireBoardChannelSettings.json");
		const guildID = message.guildId;
		const channelID = channelSettings[guildID].channelID;
		const voteEmoji = channelSettings[guildID].voteEmoji;
		const voteCount = channelSettings[guildID].voteCount;
		return message.reply(
			`fireboard settings:\n    channel: <#${channelID}>\n    emoji: ${voteEmoji}\n    vote count: ${voteCount}`,
		);
	}

	if (message.content.toLowerCase().startsWith(prefix + "setfireboard")) {
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
		const channelSettings = require("./fireBoardChannelSettings.json");
		channelSettings[guildID] = {
			channelID,
			voteEmoji,
			voteCount,
		};
		fs.writeFileSync(
			"./fireBoardChannelSettings.json",
			JSON.stringify(channelSettings, null, 2),
			(err) => {
				if (err) {
					console.error("Error saving to channelSettings.json:", err);
					return message.reply(
						"failed to set fireboard channel. Error with saving JSON data",
					);
				}
				message.reply(
					`fireboard settings saved successfully:\nchannel: ${args[1]
					}\nemoji: ${voteEmoji}\ncount: ${voteCount}`,
				);
			},
		);
	}


	if (message.content.toLowerCase().startsWith(prefix + "setskullboard")) {
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
		const channelSettings = require("./channelSettings.json");
		channelSettings[guildID] = {
			channelID,
			voteEmoji,
			voteCount,
		};
		fs.writeFileSync(
			"./channelSettings.json",
			JSON.stringify(channelSettings, null, 2),
			(err) => {
				if (err) {
					console.error("Error saving to channelSettings.json:", err);
					return message.reply(
						"failed to set skullboard channel. Error with saving JSON data",
					);
				}
				message.reply(
					`skullboard settings saved successfully:\nchannel: ${args[1]
					}\nemoji: ${voteEmoji}\ncount: ${voteCount}`,
				);
			},
		);
	}
});

client.on("messageReactionAdd", async (reaction, user) => {
	if (user.bot) return;

	const guildID = reaction.message.guildId;
	const channelSettings = require("./channelSettings.json");
	const skullboardData = require("./skullboardData.json");
	const fireBoardChannelSettings = require("./fireBoardChannelSettings.json");
	const fireBoardData = require("./fireBoardData.json");

	const starboardSettings = channelSettings[guildID];
	const fireboardSettings = fireBoardChannelSettings[guildID];

	const isStarboard = starboardSettings && starboardSettings.voteEmoji === reaction.emoji.name;
	const isFireboard = fireboardSettings && fireboardSettings.voteEmoji === reaction.emoji.name;

	if (!isStarboard && !isFireboard) {
		return;
	}

	const handleChannel = async (channelID, data, boardType, footerText) => {
		const boardChannel = client.channels.cache.get(channelID);
		if (!boardChannel || !boardChannel.isText()) return;

		const voteThreshold = boardType === 'skullboard' ? starboardSettings.voteCount : fireboardSettings.voteCount;
		if (reaction.count >= voteThreshold) {
			const originalMessage = reaction.message;
			const messageLink = `https://discord.com/channels/${guildID}/${originalMessage.channelId}/${originalMessage.id}`;

			if (!data[guildID]) data[guildID] = [];
			if (data[guildID].includes(messageLink)) return;

			data[guildID].push(messageLink);
			fs.writeFileSync(`./${boardType}Data.json`, JSON.stringify(data, null, 2));

			const embed = new discord.MessageEmbed()
				.setColor('#0099ff')
				.setAuthor(originalMessage.author.tag, originalMessage.author.displayAvatarURL())
				.setURL(messageLink)
				.setFooter(footerText)
				.setTimestamp(originalMessage.createdAt)
				.setDescription(`[Jump to message](${messageLink})\n${originalMessage.content || ''}`);

			// Handle image/video URL in embeds
			if (originalMessage.embeds.length > 0) {
				const embedData = originalMessage.embeds[0];

				if (embedData.image && embedData.image.url) {
					embed.setImage(embedData.url);
				} else if (embedData.video && embedData.video.url) {
					embed.setImage(embedData.url);
				} else if (embedData.type === 'gifv' && embedData.url) {
					embed.setImage(embedData.url);
				}
			} else if (originalMessage.attachments.size > 0) {
				const attachment = originalMessage.attachments.first();
				if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
					embed.setImage(attachment.url);
				}
			}

			try {
				await boardChannel.send({ embeds: [embed] });
			} catch (error) {
				console.error(`Error sending ${boardType} message:`, error);
			}
		}
	};

	if (isStarboard) {
		handleChannel(starboardSettings.channelID, skullboardData, 'skullboard', 'Shamed in Skullboard');
	}

	if (isFireboard) {
		handleChannel(fireboardSettings.channelID, fireBoardData, 'fireboard', 'Fire reacted in Fireboard');
	}
});


async function getHeaderFileInfo(url) {
	try {
		const response = await fetch(url, { method: "HEAD" });

		const headers = response.headers;
		const contentType = headers.get("Content-Type");
		const contentLength = headers.get("Content-Length");
		let contentName = url.split("/").pop();
		const contentDispo = headers.get("Content-Disposition");
		if (contentDispo && contentDispo.includes("filename=")) {
			contentName = contentDispo.split("filename=")[1].replace(/['"]/g, "");
		}
		const fileNameWithoutExtension = contentName.split(".").slice(0, -1).join(
			".",
		);

		return [contentType, contentLength, fileNameWithoutExtension, contentName];
	} catch (error) {
		console.error("Error fetching header info:", error);
		throw error;
	}
}

async function getMediaLink(message) {
	const repliedMessage = message.reference?.messageID &&
		await message.channel.messages.fetch(message.reference.messageID);
	const media = repliedMessage && (
		repliedMessage.attachments.size > 0
			? repliedMessage.attachments.first().url
			: repliedMessage.embeds.length > 0
				? repliedMessage.embeds[0].url
				: null
	);
	return media;
}

async function downloadGif(inputFilename, outputFilename) {
	return new Promise((resolve, reject) => {
		const wgetCommand = `wget "${inputFilename}" -O "${outputFilename}"`;
		console.log("wget command:", wgetCommand);
		const wgetProcess = exec(wgetCommand, {
			shell: true,
			detached: true,
			stdio: "ignore",
		});
		wgetProcess.unref();
		wgetProcess.on("error", (error) => {
			console.error("error with wget:", error);
			reject(error);
		});
		wgetProcess.on("exit", (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				const errorMessage =
					`wget process exited with code ${code} and signal ${signal}`;
				console.error(errorMessage);
				reject(new Error(errorMessage));
			}
		});
	});
}

async function ffmpegInputOutput(inputFilename, outputFilename) {
	return new Promise((resolve, reject) => {
		const command =
			`ffmpeg -i "${inputFilename}" -vf "fps=24,scale=${process.env.GIF_WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${outputFilename}"`;
		console.log("ffmpeg command:", command);
		const ffmpegProcess = exec(command, {
			shell: true,
			detached: true,
			stdio: "ignore",
		});
		ffmpegProcess.unref();
		ffmpegProcess.on("error", (error) => {
			console.error("error with ffmpeg:", error);
			reject(error);
		});
		ffmpegProcess.on("exit", (code, signal) => {
			if (code === 0) {
				resolve();
			} else {
				const errorMessage =
					`ffmpeg process exited with code ${code} and signal ${signal}`;
				console.error(errorMessage);
				reject(new Error(errorMessage));
			}
		});
	});
}

// new command
// ffmpeg -i "${inputFilename}" -vf "fps=16,scale=${process.env.GIF_WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${outputFilename}"
// old command
// ffmpeg -i "${inputFilename}" -vf "fps=16,scale=320:-1:flags=lanczos" -c:v gif -b:v "${process.env.COMPRESSION_RATE}k" "${outputFilename}"
