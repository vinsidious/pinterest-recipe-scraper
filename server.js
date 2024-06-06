const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle form submission
app.post('/scrape', (req, res) => {
    const boardUrl = req.body.url;

    if (!boardUrl) {
        return res.status(400).send('Board URL is required');
    }

    const command = `node ${path.join(__dirname, 'src/scripts/pinterest.js')} ${boardUrl}`;
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

            const urls = JSON.parse(data);
            res.status(200).json(urls);
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
