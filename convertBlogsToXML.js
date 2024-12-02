const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { create } = require("xmlbuilder2");
const fs = require("fs");
const BLOG_URL = "https://www.pathloom.com/all-blogs";

// Set Chrome options for headless mode
const options = new chrome.Options();
// options.addArguments("--headless");
options.addArguments("--no-sandbox");
options.addArguments("--disable-dev-shm-usage");
const service = new chrome.ServiceBuilder('/usr/bin/chromedriver'); // Path to ChromeDriver
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const driver = new Builder()
	.forBrowser("chrome")
	.setChromeOptions(options)
	.setChromeService(service) // Set the ChromeDriver service path
	.build();

let blogData = []; // Declare blog data globally to access it in the signal handler

// Retry utility function
const retry = async (fn, retries = 4, delay = 1200) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			if (attempt === retries) throw error;
			console.warn(
				`Attempt ${attempt} failed. Retrying in ${delay * attempt}ms...`
			);
			await new Promise((res) => setTimeout(res, delay * attempt));
		}
	}
};

const fetchTags = async () => {
	const tagElements = await driver.findElements(By.css(".ZjhmPV"));
	const tags = new Set(); // Use a Set to avoid duplicates
	for (const tagElement of tagElements) {
		const tagText = await tagElement.getText();
		if (tagText) tags.add(tagText.trim()); // Trim duplicate tags
	}
	return Array.from(tags).join(", "); // Convert tags to a comma-separated list
};

const fetchContentInOrder = async () => {
    // let elements = await driver.findElements(By.css("subheading, heading, text, wow-image img"));
    let elements = await driver.findElements(By.css("._0-9kb.q87H1.D4VE2.BqjLQ, .mV7hD.q87H1.D4VE2.BqjLQ, .cluSW, wow-image img"));

    const content = [];
    
    for (const element of elements) {
        const tagName = await element.getTagName();
        
        if (tagName === "img") {
            // If it's an image, get the src and wrap it in an <image> tag
            const src = await element.getAttribute('src');
            if ((
                src 
                && !src.includes("logo") // various images we do not need
                && !src.includes("blur") 
                && !src.includes("666292_a359a1aaa615404287862f1364f1c8b4")
                && !src.includes("666292_351a569704f0459280fc52170797efa9%7E")
                && !src.includes("f84b209469da4471b60850dc411d770b")
                && !src.includes("81af6121f84c41a5b4391d7d37fce12a")
                && !src.includes("203dcdc2ac8b48de89313f90d2a4cda1")
                && !src.includes("7528824071724d12a3e6c31eee0b40d4")
            )) 
                {
                content.push({ type: "img", value: src });
            }
        } else {
            // Otherwise, it's text, so extract the text content
            const text = await element.getText();
            if (text.trim()) {
                content.push({ type: "p", value: text.trim() });
        } else {


		}
	}
}

    return content;
};


const scrollToBottomSlowly = async () => {
	let scrollHeight = await driver.executeScript("return document.body.scrollHeight");
	let currentScroll = 0;
	let viewportHeight = await driver.executeScript("return window.innerHeight");
	let increment = 100; // Adjust to control the scroll increment (in pixels)
	let delay = 35; // Adjust to control the delay between each scroll (in milliseconds)

	while (currentScroll < scrollHeight) {
		await driver.executeScript(`window.scrollTo(0, ${currentScroll});`);
		currentScroll += increment;

		// Wait for the specified delay before scrolling again
		await new Promise((resolve) => setTimeout(resolve, delay));
	}
};

const fetchAllBlogs = async () => {
	try {
		let page = 2; // page 2 cause first blog has everything we want to scrape

		while (true) {
			await retry(() => driver.get(`${BLOG_URL}/page/${page}`));
			console.log(`Scraping page ${page}...`);

			const thumbnails = await driver.findElements(
				By.css("img.gallery-item")
			);

			const thumbnailSrcs = [];
			for (const thumbnail of thumbnails) {
				const src = await thumbnail.getAttribute("src");
				if (src && !src.includes("blur")) {
					thumbnailSrcs.push(src);
				}
			}
            
            await sleep(1500);
            await retry(async () => {await scrollToBottomSlowly();});

			const blogElements = await retry(async () => {
				await driver.wait(
					until.elementsLocated(By.css(".gallery-item-container a")),
					10000
				);
				return driver.findElements(By.css(".gallery-item-container a"));
			});

			if (blogElements.length === 0) break;

			const links = [];
			for (let href of blogElements) {
				links.push(await retry(() => href.getAttribute("href")));
			}

			for (let i = 0; i < links.length; i++) {
				const link = links[i];
				console.log(`Blog link: ${link}`);

				await sleep(3000);
				await retry(() => driver.get(link));

				await sleep(3000);
				await retry(async () => {await scrollToBottomSlowly();});

				const author = await retry(() =>
					driver.findElement(By.css(".tQ0Q1A.user-name.dlINDG")).getText()
				);

				const title = await retry(() =>
					driver.findElement(By.css(".post-title")).getText()
				);
				const date = await retry(() =>
					driver.findElement(By.css(".post-metadata__date")).getText()
				);

				const tags = await retry(fetchTags); // Fetch tags

				await driver.executeScript(`
                    const elements = document.querySelectorAll('.MS7sOC, .nITq6z');
                    elements.forEach(element => element.style.display = 'none');
                `);

                const content = await retry(fetchContentInOrder);

				const thumbnail = thumbnailSrcs[i];

				blogData.push({
					thumbnail,
					tags,
					author,
					title,
					link,
					date,
					content,
				});
			}

			page++;
		}
	} catch (error) {
		console.error("Error fetching blogs:", error);
	} finally {
		await driver.quit();
	}
	return blogData;
};

const blogsToXML = (blogs) => {
    const root = create({ version: "1.0" }).ele("blogs");

    blogs.forEach((blog) => {
        const blogElement = root.ele("blog");

        blogElement.ele("thumbnail").txt(blog.thumbnail);
        blogElement.ele("tags").txt(blog.tags);
        blogElement.ele("author").txt(blog.author);
        blogElement.ele("title").txt(blog.title);
        blogElement.ele("link").txt(blog.link);
        blogElement.ele("date").txt(blog.date);

        // Content Handling: Embed images and text together
        let contentString = "\n" + '<![CDATA[';  // Start the CDATA section

        blog.content.forEach(item => {
            if (item.type === "img") {
                contentString += `<img src="${item.value}" />\n`;  // Add image tag
            } else if (item.type === "p") {
                contentString += `<p>${item.value}</p>\n`;  // Add paragraph tag
            }
        });

        contentString += ']]>';  // End the CDATA section

        // Add content as raw data (CDATA section) to the blog
        const contentElement = blogElement.ele("content");
        contentElement.txt(contentString);  // Insert the CDATA content here

    });

    return root.end({ prettyPrint: true });
};


// Function to save collected data if the program is interrupted
const saveDataOnExit = () => {
	if (blogData && blogData.length > 0) {
		// Check if there's any data to save
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
	if (blogData && blogData.length > 0) {
		// Check if there's any data to save
		const xmlData = blogsToXML(blogData);
		fs.writeFileSync("blogs.xml", xmlData);
		console.log("Blogs have been saved to blogs.xml");
	} else {
		console.log("No blogs were fetched.");
	}
};

main();