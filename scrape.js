const puppeteer = require("puppeteer"); //is for web scraping, it allows us to control a headless browser and extract data from web pages
const fs = require("fs");

async function scrapeVerge() {
	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});
	const page = await browser.newPage();

	// paginate search results, aggregate across pages
	const baseUrl = 'https://www.theverge.com/search?q=1+january+2022+article';
	const maxPages = 10; // safety cap
	const results = [];

	// loop the whole page and extract the articles
	for (let p = 1; p <= maxPages; p++) {
		const url = p === 1 ? baseUrl : `${baseUrl}&page=${p}`;
		await page.goto(url, { waitUntil: 'networkidle2' });
		const articles = await page.$$eval('div.duet--content-cards--content-card', cards =>
			cards.map(card => {
				const a = card.querySelector('a._1lkmsmo0');
				let t = null;
				if (a) {
					const anc = a.closest('div') || card;
					t = anc.querySelector('time') || card.querySelector('time');
				} else {
					t = card.querySelector('time');
				}
				return {
					title: a ? a.textContent.trim() : null,
					link: a ? new URL(a.getAttribute('href'), location.origin).href : null,
					dateText: t ? t.textContent.trim() : null,
					datetime: t ? t.getAttribute('datetime') : null
				};
			}).filter(x => x.title)
		);
		if (!articles.length) break; // no more results
		results.push(...articles);
	}
	// console.log('total results raw:', results);

	// parse dates, keep only those with valid dates
	const withDates = results.map(r => ({
		...r,
		_date: r.datetime ? new Date(r.datetime) : (r.dateText ? new Date(r.dateText) : null)
	}));

	// keep only dates from 2022-01-01 onwards
	const cutoff = new Date('2022-01-01T00:00:00Z');

	// filter out invalid dates and those before cutoff
	const filtered = withDates.filter(r => r._date && r._date >= cutoff);
	// console.log(filtered);

	// sort newest first
	const articlesFromJan1 = filtered.sort((a, b) => b._date - a._date);
	// console.log(articlesFromJan1);

	// create a output
	fs.writeFileSync("articles.json", JSON.stringify(articlesFromJan1, null, 2));

	await browser.close();
}

scrapeVerge()
