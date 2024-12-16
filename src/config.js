const chrome = require("selenium-webdriver/chrome");

const options = new chrome.Options();
options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");

const service = new chrome.ServiceBuilder(require("chromedriver").path);

module.exports = {
	BLOG_URL: "https://www.pathloom.com/all-blogs",
	options,
	service,
};
