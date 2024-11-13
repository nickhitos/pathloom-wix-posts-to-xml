const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { create } = require("xmlbuilder2");
const fs = require("fs");
const BLOG_URL = "https://www.pathloom.com/all-blogs";

// Set Chrome options for headless mode
const options = new chrome.Options();
options.addArguments("--headless");
options.addArguments("--no-sandbox");
options.addArguments("--disable-dev-shm-usage");
const service = new chrome.ServiceBuilder('/usr/bin/chromedriver'); // Path to ChromeDriver

const driver = new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .setChromeService(service) // Set the ChromeDriver service path
    .build();

let blogData = []; // Declare blog data globally to access it in the signal handler

// Retry utility function
const retry = async (fn, retries = 3, delay = 3000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === retries) throw error;
            console.warn(`Attempt ${attempt} failed. Retrying in ${delay * attempt}ms...`);
            await new Promise(res => setTimeout(res, delay * attempt)); // Exponential backoff
        }
    }
};

const fetchAllBlogs = async () => {
    try {
        let page = 1;

        while (true) {
            // Retry page navigation
            await retry(() => driver.get(`${BLOG_URL}/page/${page}`));
            console.log(`Scraping page ${page}...`);

            const thumbnails = await driver.findElements(By.css("img.gallery-item"));

            const thumbnailSrcs = [];
            for (const thumbnail of thumbnails) {
                const src = await thumbnail.getAttribute("src");
                if (!src.includes('blur')) {
                    thumbnailSrcs.push(src);
                }
            }

            const blogElements = await retry(async () => {
                await driver.wait(
                    until.elementsLocated(By.css(".gallery-item-container a")),
                    10000
                );
                return driver.findElements(By.css(".gallery-item-container a"));
            });

            if (blogElements.length === 0) break; // End of pages

            // Extract links from the current page
            const links = [];
            for (let href of blogElements) {
                links.push(await retry(() => href.getAttribute("href")));
            }

            // Iterate through each blog link for the current page
            for (let link of links) {
                console.log(`Blog link: ${link}`);

                // Visit each blog page with retry
                await retry(() => driver.get(link));

                // Wait for the blog content to load with retry
                await retry(async () => {
                    await driver.executeScript("window.scrollTo(0, document.body.scrollHeight)");
                    await driver.wait(until.elementLocated(By.css(".post-title")), 10000); // Adjust wait time
                });

                const title = await retry(() =>
                    driver.findElement(By.css(".post-title")).getText()
                );
                const date = await retry(() =>
                    driver.findElement(By.css(".post-metadata__date")).getText()
                );
                const content = await retry(() =>
                    driver.findElement(By.css(".blog-post-page-font")).getText()
                );

                // Fetch images from <wow-image> components on the blog page
                const wowImages = await driver.findElements(By.css("wow-image img"));
                const images = [];
                for (const img of wowImages) {
                    const imgSrc = await img.getAttribute("src");
                    images.push(imgSrc);
                }

                blogData.push({ thumbnailSrcs, title, link, date, content, images });
            }

            // Move to the next page
            page++;

        }

    } catch (error) {
        console.error("Error fetching blogs:", error);
    } finally {
        await driver.quit();
    }

    return blogData; // Return the data collected so far
};

// Save blog data to XML format
const blogsToXML = (blogs) => {
    const root = create({ version: "1.0" }).ele("blogs");

    blogs.forEach((blog) => {
        const blogElement = root.ele("blog");

        // Add each main image source
        blogElement.ele("thumbnail").txt(blog.thumbnailSrcs.join(", ")); // Join if multiple thumbnails
        const imagesElement = blogElement.ele("images");
        blog.images.forEach(imageSrc => {
            imagesElement.ele("image").txt(imageSrc);
        });
    });

        blogElement.ele("title").txt(blog.title);
        blogElement.ele("link").txt(blog.link);
        blogElement.ele("date").txt(blog.date);
        blogElement.ele("content").txt(blog.content);

    return root.end({ prettyPrint: true });
};

// Function to save collected data if the program is interrupted
const saveDataOnExit = () => {
    if (blogData && blogData.length > 0) { // Check if there's any data to save
        const xmlData = blogsToXML(blogData);
        fs.writeFileSync("blogs.xml", xmlData);
        console.log("Partial blog data has been saved to blogs.xml");
    } else {
        console.log("No data to save.");
    }
};

// Listen for termination signals
process.on("SIGINT", () => {
    console.log("Process interrupted. Saving data...");
    saveDataOnExit();
    process.exit();
});

process.on("SIGTERM", () => {
    console.log("Process terminated. Saving data...");
    saveDataOnExit();
    process.exit();
});

// Main function to start the scraping process
const main = async () => {
    blogData = await fetchAllBlogs();
    if (blogData && blogData.length > 0) { // Check if there's any data to save
        const xmlData = blogsToXML(blogData);
        fs.writeFileSync("blogs.xml", xmlData);
        console.log("Blogs have been saved to blogs.xml");
    } else {
        console.log("No blogs were fetched.");
    }
};

main();
