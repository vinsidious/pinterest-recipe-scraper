import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { fileURLToPath } from 'url';
import Bottleneck from 'bottleneck';
import { encoding_for_model } from 'tiktoken';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bottleneck setup
const limiter = new Bottleneck({
  minTime: 200,
  reservoir: 90000, // Start with a reservoir of 90,000 tokens
  reservoirRefreshAmount: 90000,
  reservoirRefreshInterval: 60 * 1000, // Refill every 60 seconds
});

// Function to calculate the number of tokens in a given text
const calculateTokens = (text) => {
  if (typeof text !== 'string') {
    throw new TypeError('Expected input to be a string');
  }
  const tokenizer = encoding_for_model('gpt-3.5-turbo');
  const tokens = tokenizer.encode(text);
  return tokens.length;
};

// Function to filter non-essential content
const filterContent = (markdown) => {
  const filtered = markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/<script.*?>.*?<\/script>/g, '') // Remove scripts
    .replace(/<!--.*?-->/g, ''); // Remove comments

  // Log filtered content
  const removedContent = markdown.match(/!\[.*?\]\(.*?\)/g) || [];
  removedContent.push(...(markdown.match(/<script.*?>.*?<\/script>/g) || []));
  removedContent.push(...(markdown.match(/<!--.*?-->/g) || []));

  if (removedContent.length > 0) {
    const logPath = path.join(__dirname, '../logs', 'filtered_content_log.json');
    fs.appendFileSync(logPath, JSON.stringify({ url: markdown.url, removedContent }, null, 2) + ',\n', 'utf8');
  }

  return filtered;
};

// Split content into sections that fit within the token limit
const splitMarkdown = (markdown, tokenLimit) => {
  const tokenizer = encoding_for_model('gpt-3.5-turbo');
  const tokens = tokenizer.encode(markdown);

  const sections = [];
  for (let i = 0; i < tokens.length; i += tokenLimit) {
    const sectionTokens = tokens.slice(i, i + tokenLimit);
    const section = tokenizer.decode(sectionTokens);
    sections.push(section);
  }

  return sections;
};

let rateLimitErrors = 0;
let contextLengthErrors = 0;
const errorLogPath = path.join(__dirname, '../logs', 'api_error_log.json');
const errorLog = [];

// Error logging function
const logError = (error, recipeUrl) => {
  const logEntry = {
    url: recipeUrl,
    error: error.message,
    timestamp: new Date().toISOString(),
  };

  errorLog.push(logEntry);
  fs.writeFileSync(errorLogPath, JSON.stringify(errorLog, null, 2), 'utf8');

  if (error.message.includes('Rate limit reached')) {
    rateLimitErrors++;
  } else if (error.message.includes('maximum context length')) {
    contextLengthErrors++;
  }
};

// Function to use OpenAI API to parse ingredients
const parseIngredients = async (markdown, recipeUrl) => {
  try {
    console.log(`Calling OpenAI API for markdown content...`);

    // Call OpenAI API
    const response = await openai.completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: `Extract the list of ingredients from the following markdown:\n\n${markdown}\n\nIngredients:`,
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.5,
    });

    console.log(`Received response from OpenAI API for markdown content`);

    const ingredients = response.choices[0].text.trim().split('\n').map(ingredient => ingredient.trim());

    return ingredients;
  } catch (error) {
    if (error.code === 'rate_limit_exceeded') {
      const retryAfter = error.headers['retry-after-ms'] || error.headers['retry-after'] * 1000 || 1000;
      console.log(`Rate limit exceeded. Retrying after ${retryAfter} ms`);
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return parseIngredients(markdown, recipeUrl);  // Retry the same request
    } else {
      console.error('Error using OpenAI API:', error);
      logError(error, recipeUrl);
      return "Failed to parse";
    }
  }
};

const processMarkdown = async () => {
  const startTime = new Date();

  try {
    console.log('Reading recipes from file...');
    const data = fs.readFileSync(path.join(__dirname, '../data', 'recipes_markdown.json'), 'utf8');
    const recipes = JSON.parse(data);

    console.log('Processing recipes...');
    const parsedRecipes = [];

    for (const recipe of recipes) {
      console.log(`Processing recipe: ${recipe.url}`);
      const filteredMarkdown = filterContent(recipe.markdown);
      const tokenCount = calculateTokens(filteredMarkdown);
      
      // Split content if it exceeds token limit
      const sections = tokenCount > 4097 - 150 ? splitMarkdown(filteredMarkdown, 4097 - 150) : [filteredMarkdown];
      
      if (sections.length > 1) {
        console.log(`Content for ${recipe.url} is split into ${sections.length} sections to prevent context length errors.`);
      }

      for (const section of sections) {
        // Schedule the API call with a token cost
        await limiter.schedule({ weight: calculateTokens(section) }, async () => {
          const ingredients = await parseIngredients(section, recipe.url);
          console.log(`Parsed ingredients for recipe: ${recipe.url}`);
          parsedRecipes.push({
            url: recipe.url,
            ingredients: ingredients.length > 0 ? ingredients : "Failed to parse"
          });
        });
      }
    }

    console.log('Writing parsed ingredients to file...');
    fs.writeFileSync(path.join(__dirname, '../data', 'recipes_ingredients.json'), JSON.stringify(parsedRecipes, null, 2), 'utf8');
    console.log('Parsed ingredients file saved successfully.');

  } catch (error) {
    console.error('Error processing markdown:', error);
  } finally {
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000; // in seconds
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    console.log(`Total process time: ${minutes} minutes and ${seconds} seconds`);
    console.log(`Total rate limit errors: ${rateLimitErrors}`);
    console.log(`Total context length errors: ${contextLengthErrors}`);
  }
};

// Start processing the markdown recipes
processMarkdown();
