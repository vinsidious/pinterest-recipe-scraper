import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const recipesPath = path.join(__dirname, '../data', 'recipes_markdown.json');
const outputPath = path.join(__dirname, '../data', 'recipes_ingredients.json');

// Function to use OpenAI API to parse ingredients
const parseIngredients = async (markdown) => {
  try {
    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Extract the list of ingredients from the following markdown:\n\n${markdown}\n\nIngredients:`,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.5,
    });

    const ingredients = response.choices[0].text.trim().split('\n').map(ingredient => ingredient.trim());
    return ingredients;
  } catch (error) {
    console.error('Error using OpenAI API:', error);
    return "Failed to parse";
  }
};

const processMarkdown = async () => {
  try {
    const data = fs.readFileSync(recipesPath, 'utf8');
    const recipes = JSON.parse(data);

    const parsedRecipes = await Promise.all(recipes.map(async (recipe) => {
      const ingredients = await parseIngredients(recipe.markdown);
      return {
        url: recipe.url,
        ingredients: ingredients.length > 0 ? ingredients : "Failed to parse"
      };
    }));

    fs.writeFileSync(outputPath, JSON.stringify(parsedRecipes, null, 2), 'utf8');
    console.log('Parsed ingredients file saved successfully.');
  } catch (error) {
    console.error('Error processing markdown:', error);
  }
};

// Execute the function
processMarkdown();
