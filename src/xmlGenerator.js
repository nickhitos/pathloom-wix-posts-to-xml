const { create } = require("xmlbuilder2");

const blogsToXML = (blogs) => {
	const root = create({ version: "1.0" }).ele("blogs");

	blogs.forEach((blog) => {
		const blogElement = root.ele("blog");
		blogElement.ele("thumbnail").txt(blog.thumbnail);
		blogElement.ele("link").txt(blog.link);
		blogElement.ele("tags").txt(blog.tags);
		blogElement.ele("slug").txt(`${blog.slug}`);
		blogElement.ele("title").txt(blog.title);

		let contentString = "\n<![CDATA[\n"; // Start the CDATA section
		contentString += `<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|40"}},"layout":{"type":"constrained"}} -->\n`;
		contentString += `<div class="wp-block-group"><!-- wp:group {"style":{"spacing":{"margin":{"top":"0","bottom":"0"}}},"layout":{"type":"constrained"}} -->\n`;
		contentString += `<div class="wp-block-group" style="margin-top:0;margin-bottom:0"><!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} -->\n`;
		contentString += `<div class="wp-block-group"><!-- wp:paragraph {"fontSize":"small"} -->\n`;
		contentString += `<p class="has-small-font-size">Published: ${blog.date}</p>\n`;
		contentString += `<!-- /wp:paragraph -->\n`;

		contentString += `<!-- wp:paragraph {"fontSize":"small"} -->\n`;
		contentString += `<p class="has-small-font-size">Edited: ${blog.date}</p>\n`;
		contentString += `<!-- /wp:paragraph --></div>\n`;
		contentString += `<!-- /wp:group -->\n`;

		contentString += `<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap"}} -->\n`;
		contentString += `<div class="wp-block-group"><!-- wp:paragraph -->\n`;
		contentString += `<p>Writer: ${blog.author}</p>\n`;
		contentString += `<!-- /wp:paragraph -->\n`;

		contentString += `<!-- wp:paragraph -->\n`;
		contentString += `<p>Editor: ${blog.author}</p>\n`;
		contentString += `<!-- /wp:paragraph --></div>\n`;
		contentString += `<!-- /wp:group --></div>\n`;

		blog.content.forEach((item) => {
			contentString += `\n`;
			if (item.type === "img") {
				contentString += `<!-- wp:image {"sizeSlug":"large","linkDestination":"none","align":"center"} -->\n`;
				contentString += `<figure class="wp-block-image aligncenter size-large"><img src=${item.value} alt="" /><figcaption class="wp-element-caption">Photo Credit: Jordan</figcaption></figure>\n`;
				contentString += `<!-- /wp:image -->\n`;
			} else if (item.type === "p") {
				contentString += `<!-- wp:paragraph -->\n`; // Add paragraph tag
				contentString += `<p>${item.value}</p>\n`;
				contentString += `<!-- /wp:paragraph -->\n`;
			} else if (item.type === "a") {
				contentString += `<!-- wp:paragraph -->\n`; // Add paragraph tag
				contentString += `<p>${item.value}</p>\n`; // Directly add the hyperlink HTML
				contentString += `<!-- /wp:paragraph -->\n`;
			} else if (item.type === "li") {
				contentString += `<li>${item.value}</li>\n`; // Add bulleted text tag
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

		contentString += `<!-- /wp:group --></div>\n`;
		contentString += "<!-- /wp:group -->\n";
		contentString += "]]>"; // End the CDATA section

		// Add content as raw data (CDATA section) to the blog
		const contentElement = blogElement.ele("content");
		contentElement.txt(contentString); // Insert the CDATA content here
	});

	return root.end({ prettyPrint: true });
};

module.exports = { blogsToXML };
