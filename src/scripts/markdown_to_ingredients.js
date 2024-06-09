import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
<<<<<<< HEAD
=======

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
>>>>>>> refactor/optimize-url-to-markdown

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to extract ingredients from markdown (mock example)
function extractIngredients(markdown) {
    // Mock implementation of extracting ingredients
    // In real implementation, parse the markdown content
    return markdown.split('\n').filter(line => line.includes('ingredient'));
}

// Main function to process markdown files and extract ingredients
async function main() {
    const markdownPath = path.join(__dirname, '../data', 'recipes_markdown.json');
    const outputPath = path.join(__dirname, '../data', 'recipes_ingredients.json');

    const markdownData = JSON.parse(fs.readFileSync(markdownPath, 'utf8'));
    const results = [];

    markdownData.forEach(entry => {
        if (entry.markdown && entry.markdown !== 'Failed to convert') {
            const ingredients = extractIngredients(entry.markdown);
            results.push({ url: entry.url, ingredients });
        } else {
            results.push({ url: entry.url, ingredients: [] });
        }
    });

    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Ingredients have been saved to ${outputPath}`);
}

// Execute the main function
main().catch(error => console.error('Error:', error));
