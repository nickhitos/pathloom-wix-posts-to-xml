const fs = require("fs");
const { fetchAllBlogs } = require("./scraper");
const { blogsToXML } = require("./xmlGenerator");

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
	let blogData = await fetchAllBlogs();
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
