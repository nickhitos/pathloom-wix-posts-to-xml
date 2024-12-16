const { Builder, By, until } = require("selenium-webdriver");
const { options, service, BLOG_URL } = require("./config");
const { sleep, retry } = require("./utils");

const driver = new Builder()
	.forBrowser("chrome")
	.setChromeOptions(options)
	.setChromeService(service) // Set the ChromeDriver service path
	.build();

let blogData = []; // Declare blog data globally to access it in the signal handler

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
	const headerTwo = ".edXX-.QdIE9.sw7z0.bfpEf";
	const headerThree =
		".wthqs.QdIE9.sw7z0.bfpEf, ._6Aw8R.NfA7j.rIsue.QMtOy, .qAx9-.NfA7j.rIsue.QMtOy";
	const headerFour = ".BmTdM.NfA7j.rIsue.QMtOy";
	const headerFive = ".lWgvw.NfA7j.rIsue.QMtOy";
	const headerSix = ".ORfsN.NfA7j.rIsue.QMtOy";
	const paragraph =
		".-XFiF.FMjBj.sw7z0.bfpEf, .-XFiF.FMjBj.omz53.bfpEf, .Is4xI.aaZkV.rIsue.QMtOy, .Is4xI.aaZkV.HZbzS.QMtOy";
	// const span = ".dBc0Z, .TCUah";
	const listItem = ".NdNAj, .B229E";

	// Combine all selectors into a single string
	const cssSelector = [
		image,
		headerTwo,
		headerThree,
		headerFour,
		headerFive,
		headerSix,
		paragraph,
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
			const isBulletPoint =
				className &&
				(className.includes("NdNAj") || className.includes("B229E"));

			if (tagName === "img") {
				const imgAlt = await element.getAttribute("alt");
				const src = await element.getAttribute("src");
				if (
					src &&
					!imgAlt.includes("Writer's picture") &&
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

				if (
					text.trim() &&
					isBulletPoint &&
					!processedText.has(text.trim())
				) {
					let pText = "";
					let anchorFlag = false;
					const paragraphElement = await element.findElement(
						By.xpath("./p")
					);

					try {
						const paragraphChildren =
							await paragraphElement.findElement(
								By.xpath("./span")
							);
						const spanChildren =
							await paragraphChildren.findElements(
								By.xpath("./*")
							);

						for (let i = 0; i < spanChildren.length; i++) {
							const childTagName = await spanChildren[
								i
							].getTagName();

							if (childTagName === "span") {
								pText += await spanChildren[i].getText();
								// console.log(`${pText}`);
							}

							if (childTagName === "a") {
								anchorFlag = true;

								const href = await spanChildren[i].getAttribute(
									"href"
								);
								console.log(`${href}`);

								if (!processedLinks.has(href)) {
									pText += `<a href="${href}" target="_blank" rel="noopener">${await spanChildren[
										i
									].getText()}</a>`;
									// console.log(`${pText}`);

									content.push({
										type: "bulletedHyperlinks",
										value: pText,
									});
									processedLinks.add(href); // Mark this link as processed
									processedText.add(spanChildren.getText());
									processedText.add(text.trim());
								}
							}
						}
					} catch (error) {
						// If there's no <a> tag, add plain text or other logic here
					}

					if (!anchorFlag) {
						let bulletText = await paragraphElement.getText();
						pText += `${bulletText.trim()}`;
						content.push({ type: "li", value: pText });
					} else if (text.trim() && !processedText.has(text.trim())) {
						pText += text;
						content.push({ type: "p", value: text.trim() });
					}
				}

				// Regular text (including hyperlinks in <p>)
				// !processedText.has(anchorElement.trim()) &&
				if (
					text.trim() &&
					!processedText.has(text.trim()) &&
					!isBulletPoint
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
								}
							}
						}
					}

					if (anchorFlag) {
						content.push({ type: "a", value: pText.trim() });
					} else if (text.trim() && !processedText.has(text.trim())) {
						content.push({ type: "p", value: text.trim() });
					}
				}
			}
		}

		content = content.filter(
			(item, index, self) =>
				index ===
				self.findIndex(
					(t) =>
						t.value === item.value &&
						(t.type === "li" || t === item)
				)
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
		let page = 4; // page 2 cause first blog has everything we want to scrape

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

module.exports = { fetchAllBlogs };
