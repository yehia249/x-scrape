import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req) {
    try {
        const { communityURL } = await req.json();
        if (!communityURL || !communityURL.includes("x.com/i/communities/")) {
            return NextResponse.json({ error: "Invalid X community URL" }, { status: 400 });
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
                // Image extraction
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

                // Community name extraction (more robust approach)
                let communityName = null;
                const primaryColumn = document.querySelector('div[data-testid="primaryColumn"]');
                if (primaryColumn) {
                    const nameElement = primaryColumn.querySelector('h2');
                    if (nameElement) {
                        communityName = nameElement.textContent?.trim();
                    }
                }

                return { 
                    imageUrl: profileImage, 
                    communityName: communityName 
                };
            });

            console.log("Scraped Data:", scrapedData);
            return NextResponse.json(scrapedData);

        } catch (error) {
            console.error("Error during scraping:", error);
            return NextResponse.json({ 
                error: "Failed to fetch image and name: " + error.message, 
                success: false 
            }, { status: 500 });
        } finally {
            if (page) await page.close();
            await browser.close();
            console.log("Browser closed");
        }
    } catch (error) {
        console.error("Request processing error:", error);
        return NextResponse.json({ 
            error: "Request processing error: " + error.message, 
            success: false 
        }, { status: 500 });
    }
}
