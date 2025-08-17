import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import axios from "axios";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}


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

// Handling iframe content
async function processIframes(page) {
  try {
    const iframes = await page.$$('iframe');
    console.log(`Found ${iframes.length} iframes`);
    
    for (let i = 0; i < iframes.length; i++) {
      try {
        const iframe = iframes[i];
        const src = await iframe.evaluate(el => el.src);
        
        if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
          console.log(`Processing iframe: ${src}`);
          
          // Try to access iframe content if it's from the same origin
          try {
            const frame = await iframe.contentFrame();
            if (frame) {
              await frame.waitForLoadState('domcontentloaded', { timeout: 10000 });
              await autoScroll(frame);
            }
          } catch (frameError) {
            console.log(`⚠️  Iframe ${src} - Cross-origin or access denied:`, frameError.message);
          }
        }
      } catch (iframeError) {
        console.log(`⚠️  Error processing iframe ${i}:`, iframeError.message);
      }
    }
  } catch (error) {
    console.log('⚠️  Error finding iframes:', error.message);
  }
}

// Download asset 
async function downloadAsset(assetUrl, directory, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try original URL first
      let urlsToTry = [assetUrl];
      
      // For Next.js chunks with dpl parameters that return 404, try without dpl
      if (assetUrl.includes('?dpl=') && assetUrl.includes('_next/static/chunks/')) {
        const urlWithoutDpl = assetUrl.split('?dpl=')[0];
        urlsToTry.push(urlWithoutDpl);
      }
      
      // For other query parameters, also try without them
      if (assetUrl.includes('?') && !urlsToTry.includes(assetUrl.split('?')[0])) {
        urlsToTry.push(assetUrl.split('?')[0]);
      }
      
      let lastError;
      
      for (const tryUrl of urlsToTry) {
        try {
          const response = await axios.get(tryUrl, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });

          const parsedUrl = new URL(tryUrl);
          let filePath = path.join(directory, parsedUrl.pathname.replace(/^\//, ""));
          
          // Handle files without extensions or with query parameters
          if (!path.extname(filePath)) {
            const contentType = response.headers['content-type'];
            if (contentType?.includes('javascript')) {
              filePath += '.js';
            } else if (contentType?.includes('css')) {
              filePath += '.css';
            } else if (contentType?.includes('image')) {
              const ext = contentType.split('/')[1];
              filePath += `.${ext}`;
            }
          }
          
          // Remove query parameters from file path
          filePath = filePath.split('?')[0];
          
          ensureDir(path.dirname(filePath));
          fs.writeFileSync(filePath, response.data);
          
          console.log(`✅ Downloaded: ${tryUrl} ${tryUrl !== assetUrl ? '(fallback)' : ''}`);
          return { 
            success: true, 
            originalUrl: assetUrl, 
            actualUrl: tryUrl,
            localPath: parsedUrl.pathname.replace(/^\//, "").split('?')[0] 
          };
          
        } catch (urlError) {
          lastError = urlError;
          console.log(`⚠️  Failed ${tryUrl}: ${urlError.response?.status || urlError.message}`);
          continue;
        }
      }
      
      throw lastError;
      
    } catch (err) {
      console.log(`❌ Attempt ${attempt}/${maxRetries} failed for ${assetUrl}:`, err.response?.status || err.message);
      if (attempt === maxRetries) {
        return { success: false, originalUrl: assetUrl, error: err.response?.status || err.message };
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export const getScrapeWebsite = async (url, directory, options = {}) => {
  const {
    ignoreFailedAssets = true,
    timeout = 60000,
    waitForNetworkIdle = true,
    processIframesEnabled = true
  } = options;

  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--start-maximized",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor"
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    console.log(`🚀 Starting to scrape: ${url}`);
    
   
    try {
      await page.goto(url, { 
        waitUntil: waitForNetworkIdle ? "networkidle2" : "domcontentloaded",
        timeout: timeout
      });
    } catch (navigationError) {
      console.log(`⚠️  Navigation warning: ${navigationError.message}`);
      // Continue anyway, sometimes the page loads despite timeout
    }
    
    await delay(5000);
  
    if (processIframesEnabled) {
      await processIframes(page);
    }

    // console.log('📜 Auto-scrolling to load dynamic content...');
    await autoScroll(page);
    await delay(2000);

    let html = await page.content();
    console.log(`📄 HTML content length: ${html.length} characters`);

    const assets = await page.evaluate(() => {
      const urls = [];
      
      // Images
      document.querySelectorAll("img[src]").forEach((el) => {
        if (el.src && !el.src.startsWith("data:")) urls.push(el.src);
      });
      
      // Stylesheets
      document.querySelectorAll("link[href]").forEach((el) => {
        if (el.href && !el.href.startsWith("data:")) urls.push(el.href);
      });
      
      // Scripts
      document.querySelectorAll("script[src]").forEach((el) => {
        if (el.src && !el.src.startsWith("data:")) urls.push(el.src);
      });
      
      // Background images from CSS
      const elementsWithBgImage = document.querySelectorAll("*");
      elementsWithBgImage.forEach((el) => {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== "none") {
          const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match && match[1] && !match[1].startsWith("data:")) {
            urls.push(match[1].startsWith("http") ? match[1] : new URL(match[1], window.location.origin).href);
          }
        }
      });
      
      return [...new Set(urls)];
    });

    console.log(`🔍 Found ${assets.length} assets to download`);

    // Download assets with error handling
    const downloadResults = [];
    const failedDownloads = [];
    
    for (const assetUrl of assets) {
      const result = await downloadAsset(assetUrl, directory);
      downloadResults.push(result);
      
      if (result.success) {
        try {
          const regex = new RegExp(result.originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          html = html.replace(regex, result.localPath);
        } catch (replaceError) {
          console.log(`⚠️  Error replacing URL in HTML: ${replaceError.message}`);
        }
      } else {
        failedDownloads.push(result);
        if (!ignoreFailedAssets) {
          throw new Error(`Failed to download critical asset: ${result.originalUrl}`);
        }
      }
    }

    ensureDir(directory);
    
    fs.writeFileSync(`${directory}/index.html`, html);
 
    // console.log(`✅ Successfully downloaded: ${report.successfulDownloads}/${report.totalAssets} assets`);
    if (failedDownloads.length > 0) {
      console.log(`❌ Failed downloads: ${failedDownloads.length}`);
      failedDownloads.forEach(f => console.log(`   - ${f.originalUrl}: ${f.error}`));
    }
    console.log(`📁 Files saved to: ${directory}`);

  } catch (error) {
    console.error('💥 Fatal error during scraping:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Usage examples:

// Basic usage (ignores failed assets by default)
// getScrapeWebsite("https://hitesh.ai", "hiteshai");

// With custom options
// getScrapeWebsite("https://hitesh.ai", "hiteshai", {
//   ignoreFailedAssets: true,  // Continue scraping even if some assets fail
//   timeout: 30000,           // 30 second timeout for page load
//   waitForNetworkIdle: true, // Wait for network to be idle
//   processIframesEnabled: true // Process iframe content
// });
