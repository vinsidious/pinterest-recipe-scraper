const fs = require('fs');
const path = require('path');

const recipesPath = path.join(__dirname, '../data', 'recipes_markdown.json');
const outputPath = path.join(__dirname, '../data', 'recipes_ingredients.json');

const parseIngredients = (markdown) => {
  const ingredients = [];
  const ingredientLines = markdown.match(/^\*\s.*$/gm);

  if (ingredientLines) {
    ingredientLines.forEach(line => {
      const cleanedLine = line.replace(/^\*\s*/, '').trim();
      ingredients.push(cleanedLine);
    });
  } else {
    return "Failed to parse";
  }

  return ingredients;
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
    const ingredients = parseIngredients(recipe.markdown);
    return {
      url: recipe.url,
      ingredients: ingredients.length > 0 ? ingredients : "Failed to parse"
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
