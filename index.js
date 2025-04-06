const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scrape", async (req, res) => {
    try {
        const { communityURL } = req.body;
        if (!communityURL || !communityURL.includes("x.com/i/communities/")) {
            return res.status(400).json({ error: "Invalid X community URL" });
        }

        console.log("Starting scraping for:", communityURL);
        const browser = await chromium.launch({ headless: true });
        let page;

        try {
            page = await browser.newPage();
            await page.goto(communityURL, { waitUntil: "domcontentloaded", timeout: 30000 });

            // Wait for community name to appear
            await page.waitForSelector('h2', { timeout: 200000 });

            // Extract both image and community name
            const scrapedData = await page.evaluate(() => {
                const imageSelectors = [
                    'img[src*="pbs.twimg.com"]', 
                    'img[alt*="community"]', 
                    'img[data-testid="communityAvatar"]'
                ];

                let profileImage = null;
                for (const selector of imageSelectors) {
                    const img = document.querySelector(selector);
                    if (img && img.src) {
                        profileImage = img.src;
                        break;
                    }
                }

                let communityName = null;
                const primaryColumn = document.querySelector('div[data-testid="primaryColumn"]');
                if (primaryColumn) {
                    const nameElement = primaryColumn.querySelector('h2');
                    if (nameElement) {
                        communityName = nameElement.textContent?.trim();
                    }
                }

                return { imageUrl: profileImage, communityName };
            });

            console.log("Scraped Data:", scrapedData);
            res.json(scrapedData);

        } catch (error) {
            console.error("Error during scraping:", error);
            res.status(500).json({ error: "Failed to fetch image and name: " + error.message });
        } finally {
            if (page) await page.close();
            await browser.close();
            console.log("Browser closed");
        }
    } catch (error) {
        console.error("Request processing error:", error);
        res.status(500).json({ error: "Request processing error: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Scraper running on port ${PORT}`);
});
