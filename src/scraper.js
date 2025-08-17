import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Auto-scroll
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 1000;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 1000);
    });
  });
}

export const getScrapeWebsite = async (url, directory) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--start-maximized"],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1000);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await delay(5000);
  await autoScroll(page);

  // Grab HTML after scroll
  let html = await page.content();

  // Grab ALL assets (including _next stuff)
  const assets = await page.evaluate(() => {
    const urls = [];
    document.querySelectorAll("img[src]").forEach((el) => urls.push(el.src));
    document.querySelectorAll("link[href]").forEach((el) => urls.push(el.href));
    document.querySelectorAll("script[src]").forEach((el) => urls.push(el.src));
    return urls.filter((u) => !u.startsWith("data:"));
  });

  console.log("Assets found:", assets.length);

  // Download assets
  for (const assetUrl of assets) {
    try {
      const response = await axios.get(assetUrl, {
        responseType: "arraybuffer",
      });

      const parsedUrl = new URL(assetUrl);
      const filePath = path.join(
        directory,
        parsedUrl.pathname.replace(/^\//, ""),
      );
      ensureDir(path.dirname(filePath));

      fs.writeFileSync(filePath, response.data);

      // Replace in HTML with relative path
      html = html.replace(
        new RegExp(assetUrl, "g"),
        parsedUrl.pathname.replace(/^\//, ""),
      );
    } catch (err) {
      console.log("❌ Failed to download:", assetUrl, err.message);
    }
  }

  // Save HTML
  fs.writeFileSync(`${directory}/index.html`, html);

  await browser.close();
  console.log("✅ Scraping done.");
};



