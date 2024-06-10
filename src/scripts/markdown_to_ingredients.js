import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const recipesPath = path.join(__dirname, '../data', 'recipes_markdown.json');
const outputPath = path.join(__dirname, '../data', 'recipes_ingredients.json');

const parseIngredients = (markdown) => {
  const ingredients = [];

  const tree = remark().use(remarkParse).parse(markdown);
  visit(tree, 'listItem', (node) => {
    console.log("Visiting node:", node);
    if (node.children) {
      const paragraph = node.children.find(child => child.type === 'paragraph');
      if (paragraph) {
        const textNode = paragraph.children.find(child => child.type === 'text');
        if (textNode) {
          const cleanedLine = textNode.value.trim();
          ingredients.push(cleanedLine);
        }
      }
    }
  });

  console.log("Parsed ingredients:", ingredients);
  return ingredients.length > 0 ? ingredients : "Failed to parse";
};

fs.readFile(recipesPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading recipes file:', err);
    return;
  }

  let recipes;
  try {
    recipes = JSON.parse(data);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
    return;
  }

  const parsedRecipes = recipes.map(recipe => {
    console.log("Processing recipe:", recipe);
    const ingredients = parseIngredients(recipe.markdown);
    return {
      url: recipe.url,
      ingredients: ingredients
    };
  });

  fs.writeFile(outputPath, JSON.stringify(parsedRecipes, null, 2), 'utf8', (writeError) => {
    if (writeError) {
      console.error('Error writing parsed ingredients file:', writeError);
      return;
    }
    console.log('Parsed ingredients file saved successfully.');
  });
});
