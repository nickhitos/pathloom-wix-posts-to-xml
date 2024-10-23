const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { create } = require('xmlbuilder2');
const fs = require('fs');

const BLOG_URL = 'https://www.pathloom.com/all-blogs';

// Set Chrome options for headless mode
const options = new chrome.Options();
options.addArguments('--headless'); // Run in headless mode
options.addArguments('--no-sandbox');
options.addArguments('--disable-dev-shm-usage');

// Initialize the Selenium WebDriver (using Chrome in this case)
// const driver = new Builder().forBrowser('chrome').build();
const driver = new Builder().forBrowser('chrome').setChromeOptions(options).build();

const fetchAllBlogs = async () => {
  try {
    // Open the page with all blogs
    await driver.get(BLOG_URL);

    // Wait until blog links are loaded (adjust the class name accordingly)
    await driver.wait(until.elementsLocated(By.css('.gallery-item-container a')), 10000);

    // Get all blog links
    const blogLinks = await driver.findElements(By.css('.gallery-item-container a'));
    const blogCount = blogLinks.length;

    let blogData = [];
    
    // Iterate through each blog link and visit the blog page
    for (let i = 0; i < blogCount; i++) {
      // Re-fetch blog links after navigation to avoid StaleElementReferenceError
      const currentBlogLinks = await driver.findElements(By.css('.gallery-item-container a'));
      const link = await currentBlogLinks[i].getAttribute('href');

      // Visit each blog page
      await driver.get(link);

      // Wait for the blog content to load
      await driver.wait(until.elementLocated(By.css('.blog-post-page-font')), 10000);

      const title = await driver.findElement(By.css('.post-title')).getText();
      const date = await driver.findElement(By.css('.post-metadata__date')).getText();  
      const content = await driver.findElement(By.css('.blog-post-page-font')).getText();

      blogData.push({ title, link, date, content });

      // Go back to the blog listing page
      await driver.navigate().back();
      await driver.wait(until.elementsLocated(By.css('.gallery-item-container a')), 10000);
    }

    return blogData;
  } catch (error) {
    console.error('Error fetching blogs:', error);
  } finally {
    await driver.quit();
  }
};

const blogsToXML = (blogs) => {
  const root = create({ version: '1.0' }).ele('blogs');

  blogs.forEach(blog => {
    const blogElement = root.ele('blog');
    blogElement.ele('title').txt(blog.title);
    blogElement.ele('link').txt(blog.link);
    blogElement.ele('date').txt(blog.date);
    blogElement.ele('content').txt(blog.content);
  });

  const xml = root.end({ prettyPrint: true });
  return xml;
};

const main = async () => {
  const blogs = await fetchAllBlogs();
  if (blogs) {
    const xmlData = blogsToXML(blogs);
    
    // Write the XML to a file
    fs.writeFileSync('blogs.xml', xmlData);
    console.log('Blogs have been saved to blogs.xml');
  }
};

main();