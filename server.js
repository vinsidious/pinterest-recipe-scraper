import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle form submission
app.post('/scrape', (req, res) => {
    const { url: boardUrl } = req.body;

    if (!boardUrl) {
        console.error('Board URL is required');
        return res.status(400).send('Board URL is required');
    }

    console.log('Received board URL:', boardUrl);

    const command = `node ${path.join(__dirname, 'src/scripts/pinterest.js')} ${boardUrl}`;
    console.log('Executing command:', command);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${stderr}`);
            return res.status(500).send(`Error executing script: ${stderr}`);
        }

        console.log(`stdout: ${stdout}`);

        // Read the scraped URLs from the file and send them back as response
        const outputPath = path.join(__dirname, 'src/data/external_urls.json');
        fs.readFile(outputPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading output file: ${err}`);
                return res.status(500).send(`Error reading output file: ${err}`);
            }

            console.log('Sending scraped URLs to client');
            const urls = JSON.parse(data);

            console.log('External URLs read successfully');
            res.status(200).json(urls);

            console.log('Executing markdown conversion script');
            const markdownCommand = `node ${path.join(__dirname, 'src/scripts/urls_to_markdown.js')}`;
            console.log('Executing script:', markdownCommand);

            const markdownProcess = exec(markdownCommand);

            markdownProcess.stdout.on('data', (data) => {
                console.log(`Markdown Process stdout: ${data}`);
            });

            markdownProcess.stderr.on('data', (data) => {
                console.error(`Markdown Process stderr: ${data}`);
            });

            markdownProcess.on('close', (code) => {
                console.log(`Markdown Process exited with code ${code}`);

                if (code !== 0) {
                    console.error(`Markdown conversion script failed with code ${code}`);
                    return;
                }

                console.log('Executing ingredient extraction script');
                const ingredientsCommand = `node ${path.join(__dirname, 'src/scripts/markdown_to_ingredients.js')}`;
                console.log('Executing script:', ingredientsCommand);

                const ingredientsProcess = exec(ingredientsCommand);

                ingredientsProcess.stdout.on('data', (data) => {
                    console.log(`Ingredients Process stdout: ${data}`);
                });

                ingredientsProcess.stderr.on('data', (data) => {
                    console.error(`Ingredients Process stderr: ${data}`);
                });

                ingredientsProcess.on('close', (code) => {
                    console.log(`Ingredients Process exited with code ${code}`);

                    if (code !== 0) {
                        console.error(`Ingredient extraction script failed with code ${code}`);
                        return;
                    }

                    res.status(200).json({ message: 'Scraping and conversion complete' });
                });
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
