const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateFavicon() {
  console.log('Generating favicon...');

  try {
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to favicon dimensions
    await page.setViewport({
      width: 32,
      height: 32,
      deviceScaleFactor: 1
    });

    // Load the SVG
    const svgPath = path.join(__dirname, '../public/favicon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Create a simple HTML page with the SVG
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 32px;
              height: 32px;
              overflow: hidden;
              background-color: transparent;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Take a screenshot for favicon.png with transparency
    const faviconPath = path.join(__dirname, '../public/favicon.png');
    await page.screenshot({
      path: faviconPath,
      type: 'png',
      omitBackground: true // This ensures transparency is preserved
    });

    // Generate apple-touch-icon (180x180)
    await page.setViewport({
      width: 180,
      height: 180,
      deviceScaleFactor: 1
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
    await page.screenshot({
      path: appleTouchIconPath,
      type: 'png',
      omitBackground: true // This ensures transparency is preserved
    });

    await browser.close();

    console.log(`Favicon generated successfully at: ${faviconPath}`);
    console.log(`Apple Touch Icon generated successfully at: ${appleTouchIconPath}`);
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
