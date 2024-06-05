# Pinterest Recipe Scraper

This project is a Pinterest Recipe Scraper that extracts recipe URLs from a Pinterest board, converts them to markdown format, and parses the markdown to extract ingredients. 

## Project Structure

pinterest-recipe-scraper/
│
├── src/
│ ├── pinterest.js
│ ├── urls_to_markdown.js
│ └── markdown_to_ingredients.js
│
├── data/
│ ├── external_urls.json
│ ├── recipes_markdown.json
│ └── recipes_ingredients.json
│
├── node_modules/
├── package.json
├── package-lock.json
└── README.md

## Prerequisites

- Node.js (version 14 or later)
- npm (Node package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HScheer1210/pinterest-recipe-scraper.git
   cd pinterest-recipe-scraper

2. Install the dependencies:
    npm install

## Usage
1. Step 1: Run the Pinterest scraper to get recipe URLs from a Pinterest board.
    node src/pinterest.js

This will generate external_urls.json in the src/data directory.

2. Step 2: Convert the URLs to markdown format.
    node src/urls_to_markdown.js

This will generate recipes_markdown.json in the src/data directory.

3. Step 3: Parse the markdown to extract ingredients.
    node src/markdown_to_ingredients.js

This will generate recipes_ingredients.json in the src/data directory.

## Files
    src/pinterest.js: Fetches recipe URLs from a Pinterest board and saves them in external_urls.json.
    src/urls_to_markdown.js: Converts the recipe URLs to markdown format and saves them in recipes_markdown.json.
    src/markdown_to_ingredients.js: Parses the markdown to extract ingredients and saves them in recipes_ingredients.json.

## Data
    data/external_urls.json: Contains the list of recipe URLs fetched from Pinterest.
    data/recipes_markdown.json: Contains the markdown content of the recipes.
    data/recipes_ingredients.json: Contains the extracted ingredients from the markdown.


## Acknowledgements
    Puppeteer for access to Convert URL to MarkDown
    Lodash for utility functions
    Axios for HTTP requests