# Pinterest Recipe Scraper

This project is a Pinterest Recipe Scraper that extracts recipe data from Pinterest boards, converts the data to Markdown format, and then extracts ingredient lists using the OpenAI API. The project is built using Node.js, Puppeteer for web scraping, and OpenAI's GPT-3.5 API for processing.

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Logging](#logging)
- [File Structure](#file-structure)
- [Error Handling](#error-handling)

## Project Overview

The Pinterest Recipe Scraper project automates the extraction of recipes from Pinterest boards. The extracted recipes are converted to Markdown format, filtered for non-essential content, and then split into sections if they exceed the token limit for OpenAI's API. The ingredient lists are extracted from the Markdown content using the OpenAI API.

## Features

- Scrapes recipes from Pinterest boards.
- Converts scraped recipes to Markdown format.
- Filters out non-essential content (images, scripts, comments).
- Splits content into sections to prevent exceeding token limits.
- Extracts ingredient lists using OpenAI's GPT-3.5 API.
- Logs errors and filtered content for review.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/pinterest-recipe-scraper.git
   cd pinterest-recipe-scraper
   ```

2. Install the dependencies:
   ```sh
   npm install axios body-parser bottleneck dotenv express openai p-queue puppeteer redis tiktoken
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```sh
   OPENAI_API_KEY=your_openai_api_key
   ```

## Usage

1. **Run the Server:**
   Execute the `server.js` file to start the entire process.
   ```sh
   node server.js
   ```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key.

### Puppeteer Configuration

The Puppeteer configuration is set to launch a headless browser with a protocol timeout of 180 seconds.

### Bottleneck Configuration

The Bottleneck setup limits the concurrency of API requests and handles rate limiting.

## Logging

Logs are saved in the `logs` directory:

- `api_error_log.json`: Logs errors encountered during API requests (primarily rate limit errors and/or context length errors).
- `filtered_content_log.json`: Logs content filtered out during preprocessing.
- `markdown_error_log.json`: Logs errors encountered during Markdown conversion.

## File Structure

```
pinterest-recipe-scraper/
├── node_modules/
├── package-lock.json
├── package.json
├── public/
│   ├── index.html
│   └── script.js
├── README.md
├──server.js
├── src/
│   ├── data/
│   │   ├── external_urls.json
│   │   ├── recipes_ingredients.json
│   │   └── recipes_markdown.json
│   ├── logs/
│   │   ├── api_error_log.json
│   │   ├── filtered_content_log.json
│   │   └── markdown_error_log.json
│   ├── scripts/
│   │   ├── markdown_to_ingredients.js
│   │   ├── pinterest.js
│   └── └── urls_to_markdown.js
├── .env
└── README.md
```

## Error Handling

Errors are logged with detailed messages and timestamps in the respective log files. The script retries API requests on rate limit errors with an exponential backoff strategy.
