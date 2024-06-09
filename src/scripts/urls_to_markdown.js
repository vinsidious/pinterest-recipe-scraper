import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PQueue from 'p-queue';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Error log path
const errorLogPath = path.join(__dirname, '../data', 'error_log.json');
const errorLog = [];

function logError(url, error) {
    errorLog.push({ url, error: error.message });
    fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2));
}

// Function to convert a URL to Markdown using Puppeteer
async function convertUrlToMarkdown(browser, url) {
    const page = await browser.newPage();  // Open a new page in the existing browser instance

    // Disable images and other media
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    try {
        await page.goto('https://urltomarkdown.com/', { waitUntil: 'networkidle2' });

        // Type the URL into the input field
        console.log(`Typing URL: ${url}`);
        await page.type('input[type="url"]', url);

        // Click the "Fetch and Convert" button
        console.log('Clicking the Fetch and Convert button...');
        await page.click('input[type="button"][value="Fetch and Convert"]');

        // Wait for the output to be generated
        console.log('Waiting for the result...');
        await page.waitForSelector('textarea#text', { timeout: 60000 });

        // Retry mechanism in case the content is not immediately available
        let attempts = 5;
        let markdown = '';

        while (attempts > 0 && !markdown.trim()) {
            console.log(`Attempt ${6 - attempts}: Waiting for Markdown content...`);
            await new Promise(resolve => setTimeout(resolve, 5000));  // Wait for 5 seconds
            markdown = await page.evaluate(() => {
                return document.querySelector('textarea#text').value;
            });
            attempts--;
        }

        if (!markdown.trim()) {
            throw new Error('Failed to retrieve Markdown content.');
        }

        return markdown;
    } catch (error) {
        logError(url, error);
        console.error(`Error converting URL to Markdown: ${url}`, error);
        return null;
    } finally {
        await page.close();  // Ensure the page is closed after processing
    }
}

// Main function to process multiple URLs
async function main() {
    const startTime = new Date();  // Start time
    const urls = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', 'external_urls.json'), 'utf8'));
    const results = [];
    const queue = new PQueue({ concurrency: 10 });  // Limit concurrency to 10 tasks at a time
    let successCount = 0;

    const browser = await puppeteer.launch({ headless: true, protocolTimeout: 120000 });  // Launch a headless browser instance and increase protocol timeout to 120 seconds

    try {
        for (const url of urls) {
            if (url) {
                queue.add(async () => {
                    const markdown = await convertUrlToMarkdown(browser, url);
                    if (markdown) {
                        results.push({ url, markdown });
                        successCount++;
                    } else {
                        results.push({ url, markdown: 'Failed to convert' });
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
    } finally {
        await browser.close();  // Ensure the browser is closed after processing all URLs

        const endTime = new Date();  // End time
        const timeTaken = (endTime - startTime) / 1000;  // Calculate time taken in seconds
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        console.log(`Total time taken: ${minutes} minutes and ${seconds.toFixed(2)} seconds`);
    }
}

// Execute the main function
main();
