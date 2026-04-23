const puppeteer = require("puppeteer");
const fs = require("fs");

async function scrapeVerge() {
	const browser = await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"]
	});
	const page = await browser.newPage();

	await page.goto("https://www.theverge.com/search?q=1+january+2022+article", {
		waitUntil: "networkidle2"
	});

	// const dates = await page.$$eval('time', els =>
	//   els.map(e => e.textContent).filter(Boolean)
	// );
	// const set = new Set(dates);
	// console.log(set);

	// const title = await page.$$eval("a._1lkmsmo0", els =>
	//   els.map(e => e.textContent).filter(Boolean)
	// );
	// console.log(title);

	const articles = await page.$$eval('div.duet--content-cards--content-card', cards =>
	  cards.map(card => {
		const a = card.querySelector('a._1lkmsmo0');
		let t = null;
		if (a) {
		  // search up to ancestor then check inside that ancestor for a time
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
	// console.log(articles);

	// filter from 2022-01-01, dedupe by link, and sort newest-first
	const cutoff = new Date('2022-01-01T00:00:00Z');

	const withDates = articles.map(r => ({
	  ...r,
	  _date: r.datetime ? new Date(r.datetime) : (r.dateText ? new Date(r.dateText) : null)
	}));

	const filtered = withDates.filter(r => r._date && r._date >= cutoff);

	// dedupe by link (keep first occurrence)
	const dedup = new Map();
	for (const r of filtered) {
	  if (!dedup.has(r.link)) dedup.set(r.link, r);
	}

	const unique = Array.from(dedup.values());

	// sort newest first
	unique.sort((a, b) => b._date - a._date);

	const articlesFromJan1 = unique.map(({ _date, ...rest }) => rest);
	// console.log(articlesFromJan1);

	fs.writeFileSync("articles.json", JSON.stringify(articlesFromJan1, null, 2));

	await browser.close();
}

scrapeVerge()

fetch("articles.json")
	.then(res => res.json())
	.then(data => {
		document.body.innerHTML = `
			<pre>${JSON.stringify(data, null, 2)}</pre>
		`;
	});

