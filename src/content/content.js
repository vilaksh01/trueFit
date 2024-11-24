import './styles/content.css';  // Update the import path

const SITE_SELECTORS = {
  'myntra.com': {
    sizeChart: {
      container: '.size-chart-table',
      headers: 'th',
      rows: 'tr:not(:first-child)',
      cells: 'td'
    },
    productInfo: {
      title: '.pdp-title',
      price: '.pdp-price',
      description: '.pdp-product-description'
    },
    sizes: '.size-buttons-size-container button'
  },
  'flipkart.com': {
    sizeChart: {
      container: '._2WkH- table', // Update with actual Flipkart selectors
      headers: 'th',
      rows: 'tr:not(:first-child)',
      cells: 'td'
    },
    productInfo: {
      title: '.B_NuCI',
      price: '._30jeq3',
      description: '._1mXcCf'
    },
    sizes: '._1q8vHb button'
  }
  // Add more sites as needed
};

class SmartProductDetector {
  constructor() {
    this.confidenceScores = {
      url: 0,
      elements: 0,
      content: 0
    };
  }

  async detect() {
    console.log("Starting product detection...");
    this.analyzeURL();
    this.analyzeElements();
    this.analyzeContent();

    if (this.isConfidentProductPage()) {
      const productData = await this.extractProductData();
      return productData;
    }
    return null;
  }

  analyzeURL() {
    const url = window.location.href;
    const dressIndicators = [
      '/dress/', '/dresses/', '/clothing/dress',
      'category=dress', 'dresses', 'dress-'
    ];

    dressIndicators.forEach(indicator => {
      if (url.toLowerCase().includes(indicator)) {
        this.confidenceScores.url += 0.3;
      }
    });
  }

  analyzeElements() {
    const indicators = {
      '[data-category*="dress" i]': 0.3,
      '[class*="dress" i]': 0.2,
      'select[name*="size" i]': 0.3,
      'button[aria-label*="size" i]': 0.3,
      '.size-selector': 0.3,
      '[class*="size-chart"]': 0.3,
      '[class*="measurement"]': 0.2
    };

    Object.entries(indicators).forEach(([selector, score]) => {
      try {
        if (document.querySelector(selector)) {
          this.confidenceScores.elements += score;
        }
      } catch (e) {
        console.debug(`Invalid selector skipped: ${selector}`);
      }
    });
  }

  analyzeContent() {
    const bodyText = document.body.textContent.toLowerCase();
    const indicators = [
      'dress', 'gown', 'frock',
      'size guide', 'size chart', 'fit',
      'measurements', 'dimensions',
      'select size', 'size & fit',
      'cm', 'inches'
    ];

    indicators.forEach(indicator => {
      if (bodyText.includes(indicator.toLowerCase())) {
        this.confidenceScores.content += 0.2;
      }
    });
  }

  isConfidentProductPage() {
    const totalConfidence = Object.values(this.confidenceScores)
      .reduce((sum, score) => sum + score, 0);
    return totalConfidence > 0.5;
  }

  async findSizeInfo() {
    // Get available sizes
    const sizeElements = [
      ...Array.from(document.querySelectorAll('button')).filter(el =>
        el.textContent.match(/^(XS|S|M|L|XL|XXL|XXXL|\d+)$/)),
      ...Array.from(document.querySelectorAll('select option')).filter(el =>
        el.textContent.match(/^(XS|S|M|L|XL|XXL|XXXL|\d+)$/)),
      ...Array.from(document.querySelectorAll('[class*="size-"],[id*="size-"]')).filter(el =>
        el.textContent.match(/^(XS|S|M|L|XL|XXL|XXXL|\d+)$/))
    ];

    const sizes = sizeElements.map(el => el.textContent.trim())
      .filter(size => size && size !== 'Select Size');

    // Get size chart
    const sizeChart = this.findSizeChart();

    return {
      availableSizes: [...new Set(sizes)],
      sizeChart: sizeChart?.rawData || null,
      sizeChartDetails: sizeChart
    };
  }

  findSizeChart() {
    const sizeChartSelectors = [
      'table[class*="size-chart"]',
      'div[class*="size-chart"] table',
      '[data-testid*="size-chart"] table',
      '.measurement-chart table'
    ];

    let sizeChartTable = null;

    for (const selector of sizeChartSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.toLowerCase();
          if (text.includes('size') &&
             (text.includes('cm') || text.includes('inches'))) {
            sizeChartTable = element;
            break;
          }
        }
      } catch (e) {
        console.debug(`Error with selector ${selector}:`, e);
      }
    }

    if (!sizeChartTable) return null;

    try {
      const headers = Array.from(sizeChartTable.querySelectorAll('th'))
        .map(th => th.textContent.trim());

      const rows = Array.from(sizeChartTable.querySelectorAll('tr'))
        .slice(1) // Skip header row
        .map(row => Array.from(row.querySelectorAll('td'))
          .map(td => td.textContent.trim())
        );

      return {
        rawData: { headers, rows },
        normalized: this.normalizeMeasurements(headers, rows)
      };
    } catch (e) {
      console.error("Error processing size chart:", e);
      return null;
    }
  }

  normalizeMeasurements(headers, rows) {
    const sizeIndex = headers.findIndex(h =>
      h.toLowerCase().includes('size'));
    if (sizeIndex === -1) return null;

    return rows.map(row => ({
      size: row[sizeIndex],
      measurements: headers.reduce((acc, header, i) => {
        if (i !== sizeIndex) {
          const value = this.parseMeasurement(row[i]);
          if (value) acc[header.toLowerCase()] = value;
        }
        return acc;
      }, {})
    }));
  }

  parseMeasurement(value) {
    if (!value) return null;
    const match = value.toString().match(/(\d+(?:\.\d+)?)\s*(cm|in|")?/i);
    if (!match) return null;

    const num = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();

    if (isNaN(num)) return null;
    return unit?.includes('in') || unit?.includes('"')
      ? Math.round(num * 2.54 * 10) / 10  // Convert to cm
      : num;
  }

  async extractProductData() {
    // Try to get structured product data first
    let structuredData = {};
    try {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        const data = JSON.parse(jsonLd.textContent);
        if (data['@type'] === 'Product') {
          structuredData = data;
        }
      }
    } catch (e) {
      console.debug('Error parsing structured data:', e);
    }

    // Get reviews
    const reviews = Array.from(document.querySelectorAll('[itemtype*="Review"], [class*="review"]'))
      .map(review => ({
        text: review.textContent.trim(),
        rating: review.querySelector('[class*="rating"], [class*="stars"]')?.textContent,
        date: review.querySelector('[class*="date"]')?.textContent
      }))
      .filter(r => r.text.length > 0);

    // Get size information
    const sizeInfo = await this.findSizeInfo();

    return {
      title: structuredData.name || document.querySelector('h1')?.textContent.trim(),
      price: structuredData.offers?.price || document.querySelector('[class*="price"]')?.textContent.trim(),
      description: structuredData.description || document.querySelector('[class*="description"]')?.textContent.trim(),
      ...sizeInfo,
      reviews,
      url: window.location.href,
      metadata: {
        confidence: this.confidenceScores,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Initialize the detector
const detector = new SmartProductDetector();

// Handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.type === 'ANALYZE_REQUEST') {
    (async () => {
      try {
        const productData = await detector.detect();
        if (!productData) {
          throw new Error('Could not detect product information');
        }

        // Send data to background script for analysis
        const response = await chrome.runtime.sendMessage({
          type: 'ANALYZE_PRODUCT',
          data: productData
        });

        sendResponse({ success: true });
      } catch (error) {
        console.error('Analysis error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'PING') {
    sendResponse({ status: 'alive' });
    return true;
  }

  // Default response
  sendResponse({ received: true });
  return true;
});