const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

let browserPromise = null;
function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ args: ['--disable-gpu', '--no-sandbox'] });
  }
  return browserPromise;
}

// Render'in saglik kontrolu ve manuel dogrulama icin - auth gerektirmez.
app.get('/', (_req, res) => {
  res.status(200).send('ok');
});

app.post('/render', async (req, res) => {
  if (!API_KEY || req.header('x-api-key') !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { url } = req.body || {};
  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'gecerli bir url gerekli' });
  }

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 390, height: 844 },
    });

    // Gorsel/font/medya indirmeyi engelle - sadece HTML/JS'in calismasi lazim, bu da
    // sinirli CPU/RAM'de sayfayi cok daha hizli ve hafif yukluyor.
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (type === 'image' || type === 'font' || type === 'media') return route.abort();
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    const html = await page.content();
    res.status(200).json({ html });
  } catch (error) {
    res.status(502).json({ error: `render basarisiz: ${error.message}` });
  } finally {
    if (page) await page.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`Headless render servisi ${PORT} portunda calisiyor`);
});
