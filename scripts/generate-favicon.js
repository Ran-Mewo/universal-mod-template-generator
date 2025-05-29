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
      width: 48,
      height: 48,
      deviceScaleFactor: 1
    });

    // Load the SVG
    const svgPath = path.join(__dirname, '../public/favicon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Function to generate HTML with dynamic size and SVG scaling
    const generateDynamicHtml = (width, height, svgContentString) => `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: ${width}px;
              height: ${height}px;
              overflow: hidden;
              background-color: transparent;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          ${svgContentString}
        </body>
      </html>
    `;

    // Generate favicon.png (48x48)
    let currentHtml = generateDynamicHtml(48, 48, svgContent);
    await page.setContent(currentHtml, { waitUntil: 'networkidle0' });

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

    // Generate apple-touch-icon (180x180)
    currentHtml = generateDynamicHtml(180, 180, svgContent);
    await page.setContent(currentHtml, { waitUntil: 'networkidle0' });

    const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
    await page.screenshot({
      path: appleTouchIconPath,
      type: 'png',
      omitBackground: true // This ensures transparency is preserved
    });

    // Generate favicon-32x32.png (32x32)
    await page.setViewport({
      width: 32,
      height: 32,
      deviceScaleFactor: 1
    });

    // Generate favicon-32x32.png (32x32)
    currentHtml = generateDynamicHtml(32, 32, svgContent);
    await page.setContent(currentHtml, { waitUntil: 'networkidle0' });

    const favicon32Path = path.join(__dirname, '../public/favicon-32x32.png');
    await page.screenshot({
      path: favicon32Path,
      type: 'png',
      omitBackground: true // This ensures transparency is preserved
    });

    await browser.close();

    console.log(`Favicon generated successfully at: ${faviconPath}`);
    console.log(`Apple Touch Icon generated successfully at: ${appleTouchIconPath}`);
    console.log(`Favicon 32x32 generated successfully at: ${favicon32Path}`);
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
