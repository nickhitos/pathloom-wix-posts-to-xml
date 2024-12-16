# pathloom-wix-posts-to-xml

## Overview
This project is a web scraper designed for extracting blog data from [Pathloom's All Blogs page](https://www.pathloom.com/all-blogs). The scraper collects various pieces of information from each blog across all pages of the site.

## Features
The scraper extracts the following blog details:
- **Blog Title**
- **Blog Links**
- **Blog Slugs**
- **Blog Tags**
- **Blog Content**:
  - Headers
  - Sub-headers
  - Hyperlinks
  - Plain-text

### Known Limitations
- **Does Not Scrape:**
  - Text with special formatting (e.g., bold, italicized, colored, underlined).
- **Bullet Points:**
  - Bullet-pointed text can be scraped.
  - Hyperlinks nested inside bullet points are **not** scraped.

## Setup Instructions
To use the scraper, ensure the necessary dependencies are installed:
1. Run:
   ```bash
   npm i
   ```
2. If step 1 fails, try:
   ```bash
   npm i chromedriver
   ```

## File Descriptions
- **`config.js`**: Contains configuration details for Selenium WebDriver, such as Chrome options and the blog URL to scrape.
- **`index.js`**: Serves as the entry point for the application. Handles the orchestration of the scraping process and saves data to `blogs.xml`.
- **`scraper.js`**: Implements the logic for navigating the blog pages and extracting blog content using Selenium.
- **`utils.js`**: Provides utility functions like `sleep` (for delays) and `retry` (for handling retries in case of failures).
- **`xmlGenerator.js`**: Converts the scraped blog data into an XML format and saves it as `blogs.xml`.
- **`example.xml`**: Is an example file of what the output file `blogstoXML.xml` should look like after the scraping process is complete.


