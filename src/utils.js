const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

module.exports = { sleep, retry };
