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
const service = new chrome.ServiceBuilder("/usr/bin/chromedriver"); // Path to ChromeDriver
// const service = new chrome.ServiceBuilder(require("chromedriver").path); // Path to ChromeDriver
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
	// Define individual CSS selectors as variables
	const image = "wow-image img";
	const headerTwo = "._6Aw8R.NfA7j.rIsue.QMtOy";
	const headerThree = ".qAx9-.NfA7j.rIsue.QMtOy";
	const headerFour = ".BmTdM.NfA7j.rIsue.QMtOy";
	const headerFive = ".lWgvw.NfA7j.rIsue.QMtOy";
	const headerSix = ".ORfsN.NfA7j.rIsue.QMtOy";
	const paragraph = ".Is4xI.aaZkV.rIsue.QMtOy";
	const span = ".vsfWl";
	const listItem = ".B229E";

	// Combine all selectors into a single string
	const cssSelector = [
		image,
		headerTwo,
		headerThree,
		headerFour,
		headerFive,
		headerSix,
		paragraph,
		span,
		listItem,
	].join(", ");

	try {
		let elements = await driver.findElements(By.css(cssSelector));

		let content = [];
		const processedLinks = new Set(); // Track links already processed
		let processedText = new Set(); // Track text already processed

		for (const element of elements) {
			const tagName = await element.getTagName();
			const className = await element.getAttribute("class");
			const isBulletPoint = className && className.includes("B229E");

			if (tagName === "img") {
				const src = await element.getAttribute("src");
				if (
					src &&
					!src.includes("logo") && // Exclude unnecessary images
					!src.includes("blur") &&
					!src.includes("666292_a359a1aaa615404287862f1364f1c8b4") &&
					!src.includes(
						"666292_351a569704f0459280fc52170797efa9%7E"
					) &&
					!src.includes("f84b209469da4471b60850dc411d770b") &&
					!src.includes("81af6121f84c41a5b4391d7d37fce12a") &&
					!src.includes("203dcdc2ac8b48de89313f90d2a4cda1") &&
					!src.includes("7528824071724d12a3e6c31eee0b40d4")
				) {
					content.push({ type: "img", value: src });
				}
			} else if (tagName === "h2") {
				let text = await element.getText();
				content.push({ type: "h2", value: text.trim() });
			} else if (tagName === "h3") {
				let text = await element.getText();
				content.push({ type: "h3", value: text.trim() });
			} else if (tagName === "h4") {
				let text = await element.getText();
				content.push({ type: "h4", value: text.trim() });
			} else if (tagName === "h5") {
				let text = await element.getText();
				content.push({ type: "h5", value: text.trim() });
			} else if (tagName === "h6") {
				let text = await element.getText();
				content.push({ type: "h6", value: text.trim() });
			} else {
				const text = await element.getText();
				let anchorElement;

				// Regular text (including hyperlinks in <p>)
				// !processedText.has(anchorElement.trim()) &&
				if (
					text.trim() &&
					!processedText.has(text.trim()) &&
					!className.includes("B229E")
				) {
					let anchorFlag = false;
					let pText = "";

					if ((await element.getTagName()) === "p") {
						const spanElement = await element.findElement(
							By.xpath("./span")
						);
						const spanChildren = await spanElement.findElements(
							By.xpath("./*")
						);
						for (let i = 0; i < spanChildren.length; i++) {
							const childTagName = await spanChildren[
								i
							].getTagName();
							if (childTagName === "span") {
								pText += await spanChildren[i].getText();
							}
							if (childTagName === "a") {
								anchorFlag = true;
								const href = await spanChildren[i].getAttribute(
									"href"
								);

								// Skip if the link has already been processed
								if (!processedLinks.has(href)) {
									const hyperlinkHTML = `<a href="${href}" target="_blank" rel="noopener">${await spanChildren[
										i
									].getText()}</a>`;
									pText += hyperlinkHTML;
									// console.log(JSON.stringify(content, null, 2));
								}
							}
						}
					}

					if (anchorFlag) {
						content.push({ type: "a", value: pText.trim() });
					} else if (text.trim() && !processedText.has(text.trim())) {
						content.push({ type: "p", value: text.trim() });
					}
					processedText.add(text.trim());
				}

				if (isBulletPoint && !processedText.has(text.trim())) {
					let pText = "";
					let anchorFlag = false;
					const paragraphElement = await element.findElement(
						By.xpath("./p")
					);
					try {
						anchorElement = await paragraphElement.findElement(
							By.xpath(".//a")
						);
						anchorFlag = true;
						const href = await anchorElement.getAttribute("href");

						// Skip if the link has already been processed
						if (!processedLinks.has(href)) {
							pText = `<li><a href="${href}" target="_blank" rel="noopener">${await anchorElement.getText()}</a></li>`;
							processedLinks.add(href); // Mark this link as processed
							processedText.add(await anchorElement.getText());
						}
					} catch (error) {
						// If there's no <a> tag, add plain text or other logic here
					}

					if (!anchorFlag) {
						const bulletText = await paragraphElement.getText();
						processedText.add(bulletText.trim());
						pText += `${bulletText.trim()}`;
					}

					if (pText.trim()) {
						// Only push if there's content
						content.push({ type: "a", value: pText });
					}
				}
			}
		}
		content = content.filter(
			(item) => item.value && item.value.trim() !== ""
		);

		return content;
	} catch (error) {
		console.error("Error in fetchContentInOrder:", error);
		return [];
	}
};

const scrollToBottomSlowly = async () => {
	let scrollHeight = await driver.executeScript(
		"return document.body.scrollHeight"
	);
	let currentScroll = 0;
	let viewportHeight = await driver.executeScript(
		"return window.innerHeight"
	);
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
		let page = 1; // page 2 cause first blog has everything we want to scrape

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
			await retry(async () => {
				await scrollToBottomSlowly();
			});

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

			for (let i = 0; i < 1; i++) {
				const link = links[i];
				console.log(`Blog link: ${link}`);

				await sleep(3000);
				await retry(() => driver.get(link));

				await sleep(3000);
				await retry(async () => {
					await scrollToBottomSlowly();
				});

				const author = await retry(() =>
					driver
						.findElement(By.css(".tQ0Q1A.user-name.dlINDG"))
						.getText()
				);

				const title = await retry(() =>
					driver.findElement(By.css(".post-title")).getText()
				);
				const date = await retry(() =>
					driver.findElement(By.css(".post-metadata__date")).getText()
				);

				const tags = await retry(fetchTags); // Fetch tags

				const baseBlogPath = "https://www.pathloom.com/post/";
				const slug = link.startsWith(baseBlogPath)
					? link.replace(baseBlogPath, "")
					: link;

				await driver.executeScript(`
                    const elements = document.querySelectorAll('.MS7sOC, .nITq6z');
                    elements.forEach(element => element.style.display = 'none');
                `);

				const content = await retry(fetchContentInOrder);

				const thumbnail = thumbnailSrcs[i];

				blogData.push({
					thumbnail,
					tags,
					slug,
					author,
					title,
					link,
					date,
					content,
				});
			}
			break;
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
		blogElement.ele("link").txt(blog.link);
		blogElement.ele("tags").txt(blog.tags);
		blogElement.ele("slug").txt(blog.slug);
		blogElement.ele("author").txt(blog.author);
		blogElement.ele("title").txt(blog.title);
		blogElement.ele("date").txt(blog.date);

		// Content Handling: Embed images, text, and hyperlinks together
		let contentString = "<![CDATA["; // Start the CDATA section

		blog.content.forEach((item) => {
			if (item.type === "img") {
				contentString += `<img src="${item.value}" />\n`; // Add image tag
			} else if (item.type === "p") {
				contentString += `<p>${item.value}</p>\n`; // Add paragraph tag
			} else if (item.type === "li") {
				contentString += `<li>${item.value}</li>\n`; // Add bulleted text tag
			} else if (item.type === "a") {
				contentString += `<p>${item.value}</p>\n`; // Directly add the hyperlink HTML
			} else if (item.type === "aHyper") {
				contentString += `<p>${item.value}</p>\n`; // Directly add the hyperlink HTML thats bulleted
			} else if (item.type === "h2") {
				contentString += `<!-- wp:heading {"level":2} -->\n<h2 class="wp-block-heading">${item.value}</h2>\n<!-- /wp:heading -->\n`;
			} else if (item.type === "h3") {
				contentString += `<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">${item.value}</h3>\n<!-- /wp:heading -->\n`;
			} else if (item.type === "h4") {
				contentString += `<!-- wp:heading {"level":4} -->\n<h4 class="wp-block-heading">${item.value}</h4>\n<!-- /wp:heading -->\n`;
			} else if (item.type === "h5") {
				contentString += `<!-- wp:heading {"level":5} -->\n<h5 class="wp-block-heading">${item.value}</h5>\n<!-- /wp:heading -->\n`;
			} else if (item.type === "h6") {
				contentString += `<!-- wp:heading {"level":6} -->\n<h6 class="wp-block-heading">${item.value}</h6>\n<!-- /wp:heading -->\n`;
			}
		});

		contentString += "]]> <!-- /wp:group -->"; // End the CDATA section

		// Add content as raw data (CDATA section) to the blog
		const contentElement = blogElement.ele("content");
		contentElement.txt(contentString); // Insert the CDATA content here
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
