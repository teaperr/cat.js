const discord = require("discord.js");
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const https = require('https');
const urlModule = require('url')
const { exec } = require('child_process');
const { error } = require("console");

// process config
const {TOKEN, MAX_UPLOAD_MB, COMPRESSION_RATE, GIFDIR, SITE_URL, PREFIX} = require('dotenv').config();
const botToken = process.env.TOKEN;
const tenorApiKey = process.env.TENOR_API;
const gifDir = process.env.GIFDIR;
const siteUrl = process.env.SITE_URL;
const compressionRate = process.env.COMPRESSION_RATE;
const prefix = process.env.PREFIX;
const maxFileSizeBytes = process.env.MAX_UPLOAD_MB * 1024 * 1024;
const greetMessages = require('./greetMessages.json').greetMessages;

const client = new discord.Client({
    intents: [
      discord.Intents.FLAGS.GUILDS,
      discord.Intents.FLAGS.GUILD_MEMBERS,
      discord.Intents.FLAGS.GUILD_BANS,
      discord.Intents.FLAGS.GUILD_VOICE_STATES,
      discord.Intents.FLAGS.GUILD_PRESENCES,
      discord.Intents.FLAGS.GUILD_MESSAGES,
      discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
      discord.Intents.FLAGS.MESSAGE_CONTENT
    ]
  });

client.login(botToken);

const urlRegex = /(http[s]?:\/\/[^\s]+)/g;
client.on('messageCreate', async message => {
    const mentioned = message.mentions.has(client.user);
    const repliedToBot = message.reference && message.reference.messageID === client.user.id;

    if (message.content.startsWith(prefix + 'help')) {
        const args = message.content.split(' ');
        if (args.length !== 2)  return message.reply('my prefix is ' + prefix + '\n^-^\ncommands:\n' + prefix + 'help [command]\n' + prefix + 'botinfo, ' + prefix + 'gif, ' + prefix + 'upload, ' + prefix + 'ls, ' + prefix + 'test');
        const arg = args[1];
        switch (arg) {
            case 'help':
                const helpCount = (message.content.match(/help/g) || []).length;
                let response = '';
                for (let i = 0; i < helpCount; i++) response += 'wat? ';
                message.reply(response);
                break;
            case 'botinfo':
                message.reply('cat.js!\na fun little bot that i wrote for my first javascript project.\n\nit\'s nothing too useful, but i like cats.\n\nyou can find the source code for this bot [here](<https://github.com/teaperr/cat.js>)\nabout the creator:\nmy name is thea ^-^ im stupid\n\npfp is of one of my cats, agatha :3\n\nyou can contact me on [discord](<https://discord.com/users/903660750277599322/>) and [twitter](<https://twitter.com/retardmoder/>)\nmy personal website is [thea.tantrum.org](http://thea.tantrum.org)');
                break;    
            case 'gif':
                message.reply('sends a random gif from the cat gifs folder on my [website](<http://thea.tantrum.org>)\n\nusage: ' + prefix + 'gif');
                break;
            case 'upload':
                message.reply('uploads a gif to [my site](<http://thea.tantrum.org>), which is accessible via the "' + prefix + 'gif" command\n\nusage: ' + prefix + 'upload [file/url]\n\nvideos are automatically converted to gifs thanks to [ffmpeg](<https://github.com/FFmpeg/FFmpeg>)!');
                break;    
            case 'ls':
                message.reply('lists the amount of gifs that are downloaded to my site :3\n\nusage: ' + prefix + 'ls');
                break;    
            case 'test':
                message.reply('sends a test message ^-^\n\nusage: ' + prefix + 'test');
                break;    
            default:
                message.reply('unknown command');
        }
    }
    if ((mentioned || repliedToBot) && /(hi+|hai+|helo+|hello+)/i.test(message.content))  message.reply(greetMessages[randomIndex]);

    // send a random gif from the gifDir
    if (message.content === (prefix + 'gif')) {
        fs.readdir(gifDir, (error, files) => {
            if (error) console.log('error reading gif dir:', error);
            const gifFiles = files.filter(file => path.extname(file).toLowerCase() === '.gif');
            if (gifFiles.length === 0) return message.reply('no gifs files found,, upload some with ' + prefix + 'upload [url/attachment]');
            const randomGif = files[Math.floor(Math.random() * files.length)];
            const gifPath = path.join(gifDir, randomGif);
            message.reply({
                files: [gifPath]
            });
        });
    }
    
    if (message.content.startsWith(prefix + 'upload')) {
        const args = message.content.split(' ');
        const uploadedContent = message.attachments.first();
        let url;
        if (args.length === 2) {
            url = args[1];
        } else if (uploadedContent.length !== 0) {
            url = uploadedContent[0].url
        } else {
            return message.reply('please provide a valid url or upload a file :3\nto get usage, try ' + prefix + 'help [command]');
        }
        if (url.includes('tenor.com')) {
            await fetch(url)
            .then(response => response.ok ? response.text() : Promise.reject('Network response was not ok'))
            .then(htmlContent => {
                url = null;
                url = htmlContent.match(/https?:\/\/media1\.tenor\.com\/[^"]+/);
                if (!url) return message.reply('could not process link 💔');
            })
            .catch(error => console.error('There was a problem with the fetch operation:', error));
        }
        const [contentType, contentLength, fileNameWithoutExtension, contentName] = getHeaderFileInfo(url);

        const inFile = contentName;
        let outFile = fileNameWithoutExtension + '.gif';
        if (fs.existsSync(path.join(gifDir, outFile))) {
            outFile = fileNameWithoutExtension + (+new Date * Math.random()).toString(36).substring(0,6) + '.gif';
        }
        await ffmpegInputOutput(inFile, path.join(gifDir, outFile));   
        const outURL = siteUrl + (encodeURIComponent(outFile));
        return message.reply(`gif uploaded successfully! you can find it [here](${outURL})`);
    }

    if (message.content === (prefix + 'test')) {
        return message.reply(':3');
      }
});

async function getHeaderFileInfo(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error('Response was not ok');
        }

        const headers = response.headers;
        const contentType = headers.get('Content-Type');
        const contentLength = headers.get('Content-Length');
        let contentName = url.split('/').pop();
        const contentDispo = headers.get('Content-Disposition');
        if (contentDispo && contentDispo.includes('filename=')) {
            contentName = contentDispo.split('filename=')[1].replace(/['"]/g, '');
        }
        const fileNameWithoutExtension = contentName.split('.').slice(0, -1).join('.');

        return [contentType, contentLength, fileNameWithoutExtension, contentName];
    } catch (error) {
        console.error('Error parsing header for info:', error);
        throw error;
    }
}

async function ffmpegInputOutput(inputFilename, outputFilename) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${inputFilename}" -vf "fps=10,scale=320:-1:flags=lanczos" -c:v gif -b:v "${process.env.COMPRESSION_RATE}k" "${outputFilename}"`;
        console.log('ffmpeg command:', command); // Add this line to debug the ffmpeg command
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error converting video to gif:', error);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}