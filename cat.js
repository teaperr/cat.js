const discord = require("discord.js");
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');
const botToken = "REDACTED";

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

const gifDirectory = '/srv/http/files/cat gifs :3/';
const siteUrl = 'http://thea.tantrum.org/files/cat%20gifs%20:3/';

const maxFileSizeBytes = 10 * 1024 * 1024;

client.on('messageCreate', async message => {
  if (message.content.startsWith('~upload')) {
    const args = message.content.split(' ');
    if (args.length !== 2) {
        return message.reply('please provide a valid url :3');
    }

    const url = args[1];

    try {
        // Download and convert the video to GIF
        const gifFilename = await downloadAndConvertVideoToGif(url);

        // Check file size
        const fileSize = getFileSize(gifFilename);
        if (fileSize > maxFileSizeBytes) {
            // File size exceeds the limit
            fs.unlinkSync(gifFilename); // Delete the oversized file
            return message.reply('the uploaded GIF exceeds the maximum file size limit.');
        }

        // Provide link to file location on your site
        const fileUrl = `${siteUrl}${path.basename(gifFilename)}`;

        message.reply(`gif uploaded successfully! You can find it [here](${fileUrl})`);
    } catch (error) {
        console.error('Error uploading gif:', error);
        message.reply('failed to upload gif D: are you sure its of the right file type? (.gif, any video format');
    }
}

// Helper function to get file size
function getFileSize(filename) {
    const stats = fs.statSync(filename);
    return stats.size;
}

  if (message.content === '~gif') {
    fs.readdir(gifDirectory, (err, files) => {
      if (err) {
        console.error('err reading dir:', err);
        return;
      }

      // Filter out non-GIF files
      const gifFiles = files.filter(file => path.extname(file).toLowerCase() === '.gif');

      if (gifFiles.length === 0) {
        return message.reply('no gifs found,,');
      }

      // Select a random GIF file
      const randomIndex = Math.floor(Math.random() * gifFiles.length);
      const randomGif = gifFiles[randomIndex];

      // Send the random GIF file
      const gifPath = path.join(gifDirectory, randomGif);
      message.channel.send({
        files: [gifPath]
      });
    });
  }

  if (message.content === '~test') {
    return message.reply(':3');
  }
});

client.login(botToken).catch(error => {
  console.error('Invalid token:', error);
});

async function downloadAndConvertVideoToGif(url) {
  const filenameWithoutExtension = path.basename(url, path.extname(url));
  const inputFilename = `${gifDirectory}${path.basename(url)}`;
  const outputFilename = `${gifDirectory}${filenameWithoutExtension}.gif`;

  try {
    // Download the file
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    await fs.promises.writeFile(inputFilename, response.data);

    // Convert the downloaded file to a GIF using FFmpeg
    await convertVideoToGif(inputFilename, outputFilename);

    // Delete the original file after conversion
    await fs.promises.unlink(inputFilename);

    return outputFilename;
  } catch (error) {
    console.error('Error downloading and converting video to gif:', error);
    throw error;
  }
}

async function convertVideoToGif(inputFilename, outputFilename) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputFilename}" -vf "fps=10,scale=320:-1:flags=lanczos" -c:v gif -b:v 500k "${outputFilename}"`;
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
