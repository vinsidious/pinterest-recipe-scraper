import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PQueue from 'p-queue';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to convert a URL to Markdown using Puppeteer
async function convertUrlToMarkdown(browser, url) {
    const page = await browser.newPage();  // Open a new page in the existing browser instance

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
        await page.waitForSelector('textarea#text', { timeout: 30000 });

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
        console.error(`Error converting URL to Markdown: ${url}`, error);
        return null;
    } finally {
        await page.close();  // Ensure the page is closed after processing
    }
}

// Main function to process multiple URLs
async function main() {
    const urls = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', 'external_urls.json'), 'utf8'));
    const results = [];
    const queue = new PQueue({ concurrency: 5 });  // Limit concurrency to 5 tasks at a time

    const browser = await puppeteer.launch({ headless: true });  // Launch a headless browser instance

    try {
        for (const url of urls) {
            if (url) {
                queue.add(async () => {
                    const markdown = await convertUrlToMarkdown(browser, url);
                    if (markdown) {
                        results.push({ url, markdown });
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
    } finally {
        await browser.close();  // Ensure the browser is closed after processing all URLs
    }
}

// Execute the main function
main();
