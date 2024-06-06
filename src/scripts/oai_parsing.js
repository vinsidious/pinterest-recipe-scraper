const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Configuration, OpenAIApi } = require('openai');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../openai_key.env') });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const recipesPath = path.join(__dirname, '../data/recipes_markdown.json');
const outputPath = path.join(__dirname, '../data/recipes_ingredients.json');

const extractIngredients = async (markdown) => {
  const prompt = `
  Extract the ingredients list from the following markdown recipe:
  ${markdown}
  `;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0,
    });

    const ingredientsText = response.data.choices[0].message.content;
    const ingredients = ingredientsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    return ingredients;
  } catch (error) {
    console.error('Error extracting ingredients:', error);
    return ["Failed to parse"];
  }
};

const parseIngredients = async () => {
  try {
    const data = fs.readFileSync(recipesPath, 'utf8');
    const recipes = JSON.parse(data);

    const parsedRecipes = [];
    for (const recipe of recipes) {
      console.log(`Processing recipe from URL: ${recipe.url}`);
      const ingredients = await extractIngredients(recipe.markdown);
      parsedRecipes.push({
        url: recipe.url,
        ingredients: ingredients,
      });
    }

    fs.writeFileSync(outputPath, JSON.stringify(parsedRecipes, null, 2), 'utf8');
    console.log('Parsed ingredients file saved successfully.');
  } catch (error) {
    console.error('Error processing recipes:', error);
  }
};

parseIngredients();
