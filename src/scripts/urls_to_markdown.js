import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import PQueue from 'p-queue';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Error log path
const errorLogDir = path.join(__dirname, '../logs');
const errorLogPath = path.join(errorLogDir, 'markdown_error_log.json');

if (!fs.existsSync(errorLogDir)) {
    fs.mkdirSync(errorLogDir, { recursive: true });
}

if (!fs.existsSync(errorLogPath)) {
    fs.writeFileSync(errorLogPath, '[]');
}
const errorLog = [];

function logError(url, error) {
    errorLog.push({ url, error: error.message });
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
}

// Function to convert a URL to Markdown using the urltomarkdown API
async function convertUrlToMarkdown(url) {
    try {
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `https://urltomarkdown.herokuapp.com/?url=${encodedUrl}&title=true&links=false`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'Referer': 'https://urltomarkdown.com/',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const markdown = await response.text();
        return markdown;
    } catch (error) {
        logError(url, error);
        console.error(`Error converting URL to Markdown: ${url}`, error);
        return null;
    }
}

// Main function to process multiple URLs
async function main() {
    const startTime = new Date();  // Start time
    const urls = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', 'external_urls.json'), 'utf8'));
    const results = [];
    const queue = new PQueue({ concurrency: 10 });  // Limit concurrency to 10 tasks at a time
    let successCount = 0;

    for (const url of urls) {
        if (url) {
            queue.add(async () => {
                const markdown = await convertUrlToMarkdown(url);
                if (markdown) {
                    results.push({ url, markdown });
                    successCount++;
                }
            });
        }
    }

    await queue.onIdle();  // Wait for all tasks in the queue to complete

    const outputPath = path.join(__dirname, '../data', 'recipes_markdown.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Markdown has been saved to ${outputPath}`);

    // Log total count of URLs and successful conversions
    console.log(`Total URLs: ${urls.length}`);
    console.log(`Successfully converted to Markdown: ${successCount}`);

    const endTime = new Date();  // End time
    const timeTaken = (endTime - startTime) / 1000;  // Calculate time taken in seconds
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    console.log(`Total time taken: ${minutes} minutes and ${seconds.toFixed(2)} seconds`);
}

// Execute the main function
main();
