const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function convertUrlToMarkdown(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

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

        // Retry mechanism
        let attempts = 5;
        let markdown = '';

        while (attempts > 0 && !markdown.trim()) {
            console.log(`Attempt ${6 - attempts}: Waiting for Markdown content...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
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
        await browser.close();
    }
}

async function main() {
    const urls = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', 'external_urls.json'), 'utf8'));
    const results = [];

    for (const url of urls) {
        if (url) {
            const markdown = await convertUrlToMarkdown(url);
            if (markdown) {
                results.push({ url, markdown });
            } else {
                results.push({ url, markdown: 'Failed to convert' });
            }
        }
    }

    const outputPath = path.join(__dirname, '../data', 'recipes_markdown.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Markdown has been saved to ${outputPath}`);
}

main();
