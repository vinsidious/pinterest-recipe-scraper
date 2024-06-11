import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import Bottleneck from 'bottleneck';
import redis from 'redis';
import { promisify } from 'util';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Redis client setup
const redisClient = redis.createClient();
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

redisClient.on('ready', () => {
  console.log('Redis client connected');
  processMarkdown();  // Start processing once Redis is ready
});

// Bottleneck setup
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200,
});

// Function to use OpenAI API to parse ingredients
const parseIngredients = limiter.wrap(async (markdown) => {
  const cacheKey = `ingredients:${markdown}`;
  
  // Check cache first
  const cachedIngredients = await getAsync(cacheKey);
  if (cachedIngredients) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return JSON.parse(cachedIngredients);
  }

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

    // Cache the result with an expiration time of 1 hour
    await setAsync(cacheKey, JSON.stringify(ingredients), 'EX', 3600);
    console.log(`Cache set for key: ${cacheKey}`);

    return ingredients;
  } catch (error) {
    console.error('Error using OpenAI API:', error);
    return "Failed to parse";
  }
});

const processMarkdown = async () => {
  try {
    console.log('Reading recipes from file...');
    const data = fs.readFileSync(path.join(__dirname, '../data', 'recipes_markdown.json'), 'utf8');
    const recipes = JSON.parse(data);

    console.log('Processing recipes...');
    const parsedRecipes = await Promise.all(recipes.map(async (recipe) => {
      const ingredients = await parseIngredients(recipe.markdown);
      return {
        url: recipe.url,
        ingredients: ingredients.length > 0 ? ingredients : "Failed to parse"
      };
    }));

    console.log('Writing parsed ingredients to file...');
    fs.writeFileSync(path.join(__dirname, '../data', 'recipes_ingredients.json'), JSON.stringify(parsedRecipes, null, 2), 'utf8');
    console.log('Parsed ingredients file saved successfully.');
  } catch (error) {
    console.error('Error processing markdown:', error);
  } finally {
    // Close the Redis client after all operations are complete
    redisClient.quit();
    console.log('Redis client closed.');
  }
};

// Explicitly connect the Redis client
redisClient.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});
