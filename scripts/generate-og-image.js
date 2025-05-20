const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generateOGImage() {
  console.log('Generating Open Graph image...');

  try {
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to OG image dimensions
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 1
    });

    // Load the HTML template
    const htmlPath = path.join(__dirname, '../public/og-image.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Take a screenshot
    const outputPath = path.join(__dirname, '../public/og-image.png');
    await page.screenshot({
      path: outputPath,
      type: 'png'
    });

    await browser.close();

    console.log(`Open Graph image generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating Open Graph image:', error);
  }
}

generateOGImage();
