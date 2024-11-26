import './styles/content.css';

// Track analysis state
let analysisInProgress = false;
let lastAnalyzedUrl = null;
let observer = null;

// Constants for pattern matching
const PRODUCT_PATTERNS = {
  gender: {
    patterns: [
      /\b(men'?s?|women'?s?|male|female|unisex)\b/i,
      /\b(boys?|girls?)\b/i
    ],
    defaultValue: 'unisex'
  },
  category: {
    patterns: [
      /\b(shirt|t-shirt|polo|tank\s*top)\b/i,
      /\b(jeans|pants|trousers|shorts)\b/i,
      /\b(dress|skirt|gown)\b/i,
      /\b(jacket|coat|blazer|sweater)\b/i,
      /\b(swimwear|swimsuit|bikini)\b/i
    ],
    defaultValue: 'clothing'
  },
  fit: {
    patterns: {
      slim: /\b(slim|skinny|tight)\s*(fit)?\b/i,
      regular: /\b(regular|classic|standard)\s*(fit)?\b/i,
      loose: /\b(relaxed|loose|comfort|oversized)\s*(fit)?\b/i
    },
    defaultValue: 'regular'
  }
};

class VendorHandler {
  static vendors = {
    MYNTRA: {
      name: 'myntra',
      hostPattern: /myntra\.com$/i,
      selectors: {
        specifications: {
          container: '.index-tableContainer',
          row: '.index-row',
          key: '.index-rowKey',
          value: '.index-rowValue'
        },
        sizeFit: {
          container: '.pdp-sizeFitDesc',
          title: '.pdp-sizeFitDescTitle',
          content: '.pdp-sizeFitDescContent'
        },
        materials: {
          container: '.pdp-sizeFitDesc',
          content: '.pdp-sizeFitDescContent'
        },
        reviews: {
          container: '.ugc-ugcContainer',
          summary: '.ugc-ugcDescriptionTitle',
          fitStats: '.answer-wrapper-AnswerWrapper',
          rating: '.index-overallRating',
          count: '.index-ratingsCount'
        }
      }
    },
    AMAZON: {
      name: 'amazon',
      hostPattern: /amazon\.(com|in)$/i,
      selectors: {
        // Add Amazon-specific selectors
        specifications: {
          container: '#productDetails_techSpec_section_1',
          row: 'tr',
          key: 'th',
          value: 'td'
        },
        // Add other Amazon selectors...
      }
    },
    FLIPKART: {
      name: 'flipkart',
      hostPattern: /flipkart\.com$/i,
      selectors: {
        // Add Flipkart-specific selectors
        specifications: {
          container: '._14cfVK',
          row: '._3-wDH3',
          key: '._2H87wv',
          value: '._2RngUh'
        },
        // Add other Flipkart selectors...
      }
    }
  };

  static getVendor(hostname) {
    return Object.values(this.vendors).find(vendor =>
      vendor.hostPattern.test(hostname)
    ) || null;
  }
}


  class ProductAnalyzer {
    constructor() {
    this.vendor = VendorHandler.getVendor(window.location.hostname);
    this.setupObservers();
    this.analysisCache = new Map();
  }

    static detectSite() {
      const hostname = window.location.hostname.toLowerCase();
      const SUPPORTED_SITES = {
        'myntra': ['myntra.com'],
        'amazon': ['amazon.com', 'amazon.in'],
        'flipkart': ['flipkart.com']
      };

      for (const [site, domains] of Object.entries(SUPPORTED_SITES)) {
        if (domains.some(domain => hostname.includes(domain))) {
          return site;
        }
      }
      return null;
    }

    setupObservers() {
      // Clean up existing observer
      if (observer) {
        observer.disconnect();
      }

      // Create new observer for dynamic content
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const sizeChartAdded = Array.from(mutation.addedNodes).some(node => {
              if (node.nodeType === 1) {
                return node.classList?.contains('size-chart-modal') ||
                       node.querySelector?.('.size-chart-modal') ||
                       node.querySelector?.('table');
              }
              return false;
            });

            if (sizeChartAdded) {
              console.log('Size chart detected in DOM');
            }
          }
        }
      });

      // Observe the entire document
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    detectGender() {
      // Check URL path first
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/men')) return 'men';
      if (path.includes('/women')) return 'women';

      // Check breadcrumbs
      const breadcrumbs = document.querySelector('.breadcrumbs-list');
      if (breadcrumbs) {
        const text = breadcrumbs.textContent.toLowerCase();
        if (text.includes('men')) return 'men';
        if (text.includes('women')) return 'women';
      }

      // Check product title
      const title = document.querySelector('.pdp-title');
      if (title) {
        const text = title.textContent.toLowerCase();
        if (text.includes('men')) return 'men';
        if (text.includes('women')) return 'women';
      }

      return 'unisex';
    }

    detectCategory() {
      // Try to get from breadcrumbs first
      const breadcrumbs = document.querySelector('.breadcrumbs-list');
      if (breadcrumbs) {
        const text = breadcrumbs.textContent.toLowerCase();
        for (const [category, patterns] of Object.entries(PRODUCT_PATTERNS.category.patterns)) {
          if (patterns.test(text)) return category;
        }
      }

      // Check product title
      const title = document.querySelector('.pdp-title');
      if (title) {
        const text = title.textContent.toLowerCase();
        for (const [category, patterns] of Object.entries(PRODUCT_PATTERNS.category.patterns)) {
          if (patterns.test(text)) return category;
        }
      }

      // Check product description
      const description = document.querySelector('.pdp-product-description');
      if (description) {
        const text = description.textContent.toLowerCase();
        for (const [category, patterns] of Object.entries(PRODUCT_PATTERNS.category.patterns)) {
          if (patterns.test(text)) return category;
        }
      }

      return 'clothing';
    }

    async analyze() {
    try {
      console.log('Starting product analysis...');

      // Check cache first
      const currentUrl = window.location.href;
      if (this.analysisCache.has(currentUrl)) {
        console.log('Returning cached analysis');
        return this.analysisCache.get(currentUrl);
      }

      let analysisData = {
        url: currentUrl,
        site: this.site,
        timestamp: new Date().toISOString()
      };

      // Get each piece of information separately with error handling
      try {
        const basicInfo = await this.getBasicInfo();
        analysisData = { ...analysisData, ...basicInfo };
      } catch (error) {
        console.error('Error getting basic info:', error);
        throw new Error('Could not extract product information. Please make sure you are on a product page.');
      }

      try {
        const sizeInfo = await this.getSizeInfo();
        if (!sizeInfo.sizeChart) {
          throw new Error('Size chart not available');
        }
        analysisData.sizeChart = sizeInfo.sizeChart;
        analysisData.availableSizes = sizeInfo.availableSizes;
      } catch (error) {
        console.error('Error getting size info:', error);
        throw new Error('Could not find size information. Please make sure the size chart is available.');
      }

      try {
        const reviews = await this.getReviews();
        analysisData.reviews = reviews;
      } catch (error) {
        console.warn('Error getting reviews:', error);
        analysisData.reviews = [];
      }

      // Validate required fields
      if (!analysisData.title || !analysisData.availableSizes?.length) {
        throw new Error('Missing required product information');
      }

      // Cache the analysis
      this.analysisCache.set(currentUrl, analysisData);

      console.log('Full analysis data:', analysisData);
      return analysisData;

    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }

  async getMaterials() {
    const materials = [];
    try {
      const materialContainer = document.querySelector(this.vendor.selectors.materials.container);
      if (materialContainer) {
        const materialText = materialContainer.textContent;
        // Look for material percentages
        const materialMatches = materialText.match(/(\d+)%\s*([\w\s]+?)(?=\s*(?:\d+%|$))/g) || [];

        materialMatches.forEach(match => {
          const [_, percentage, material] = match.match(/(\d+)%\s*([\w\s]+)/) || [];
          if (percentage && material) {
            const cleanMaterial = material.trim().toLowerCase();
            // Filter out non-material percentage matches
            if (!cleanMaterial.includes('off') && !cleanMaterial.includes('discount')) {
              materials.push({
                material: material.trim(),
                percentage: parseInt(percentage)
              });
            }
          }
        });
      }
    } catch (error) {
      console.warn('Error parsing materials:', error);
    }
    return materials;
  }

  async getSizeFitInfo() {
    const info = {
      fit: '',
      modelSize: '',
      modelMeasurements: {}
    };

    try {
      const container = document.querySelector(this.vendor.selectors.sizeFit.container);
      if (container) {
        const content = container.querySelector(this.vendor.selectors.sizeFit.content)?.textContent || '';

        // Extract fit
        const fitMatch = content.match(/Fit:\s*([\w\s]+)/i);
        if (fitMatch) info.fit = fitMatch[1].trim();

        // Extract model size
        const sizeMatch = content.match(/Size worn by the model:\s*(\d+)/i);
        if (sizeMatch) info.modelSize = sizeMatch[1];

        // Extract model measurements
        const measurements = content.match(/(?:Chest|Height|Waist):\s*([\d'"\s]+)/g) || [];
        measurements.forEach(measurement => {
          const [key, value] = measurement.split(':').map(s => s.trim());
          info.modelMeasurements[key.toLowerCase()] = value;
        });
      }
    } catch (error) {
      console.warn('Error getting size & fit info:', error);
    }

    return info;
  }

  async getReviewStats() {
    const stats = {
      average: null,
      count: 0,
      fitFeedback: {},
      summary: ''
    };

    try {
      if (!this.vendor.selectors.reviews) return stats;

      // Get rating and count
      const ratingElement = document.querySelector(this.vendor.selectors.reviews.rating);
      if (ratingElement) {
        stats.average = parseFloat(ratingElement.textContent);
      }

      const countElement = document.querySelector(this.vendor.selectors.reviews.count);
      if (countElement) {
        stats.count = parseInt(countElement.textContent.match(/\d+/)?.[0] || 0);
      }

      // Get fit statistics
      const fitStatsContainer = document.querySelector(this.vendor.selectors.reviews.fitStats);
      if (fitStatsContainer) {
        const fitRows = fitStatsContainer.querySelectorAll('.answer-AnswerRow');
        fitRows.forEach(row => {
          const aspect = row.previousElementSibling?.textContent?.trim().toLowerCase();
          const percentage = row.querySelector('.answer-caption-wrapper')?.textContent?.match(/\d+/)?.[0];
          const response = row.querySelector('.answer-caption-wrapper')?.textContent?.split('(')[0]?.trim();

          if (aspect && percentage && response) {
            stats.fitFeedback[aspect] = {
              response,
              percentage: parseInt(percentage)
            };
          }
        });
      }

    } catch (error) {
      console.warn('Error getting review stats:', error);
    }

    return stats;
  }



  async getSpecifications() {
    const specs = {};
    try {
      const container = document.querySelector(this.vendor.selectors.specifications.container);
      if (container) {
        const rows = container.querySelectorAll(this.vendor.selectors.specifications.row);
        rows.forEach(row => {
          const key = row.querySelector(this.vendor.selectors.specifications.key)?.textContent?.trim();
          const value = row.querySelector(this.vendor.selectors.specifications.value)?.textContent?.trim();
          if (key && value) specs[key] = value;
        });
      }
    } catch (error) {
      console.warn('Error getting specifications:', error);
    }
    return specs;
  }

  async getBasicInfo() {
    try {
      if (!this.vendor) {
        throw new Error('Unsupported vendor');
      }

      // Get specifications
      const specs = await this.getSpecifications();

      // Get materials
      const materials = await this.getMaterials();

      // Get size and fit info
      const sizeFitInfo = await this.getSizeFitInfo();

      // Get product description
      const description = document.querySelector('.pdp-product-description-content')?.textContent?.trim();

      // Get brand and title
      const brand = document.querySelector('.pdp-title .brand-name')?.textContent?.trim();
      const title = document.querySelector('.pdp-name')?.textContent?.trim();

      // Get ratings and reviews
      const reviewStats = await this.getReviewStats();

      return {
        title: brand ? `${brand} ${title}` : title,
        brand,
        gender: this.detectGender(),
        category: this.detectCategory(),
        fit: specs['Fit'] || sizeFitInfo.fit || this.detectFit(description),
        materials,
        price: document.querySelector('.pdp-price strong')?.textContent?.trim(),
        description,
        specifications: specs,
        sizeFitInfo,
        ratings: reviewStats,
        vendor: this.vendor.name
      };

    } catch (error) {
      console.error('Error getting basic info:', error);
      throw new Error('Failed to extract product information');
    }
  }

  detectFit(description = '', specs = {}) {
    try {
      // Check specifications first
      const fitKeys = ['Fit', 'fit', 'Style', 'style', 'Type', 'type'];
      for (const key of fitKeys) {
        if (specs[key]) {
          const fitValue = specs[key].toLowerCase();
          for (const [fit, pattern] of Object.entries(PRODUCT_PATTERNS.fit.patterns)) {
            if (pattern.test(fitValue)) return fit;
          }
        }
      }

      // Check product title and description for fit information
      const textToCheck = [
        document.querySelector('.pdp-title')?.textContent || '',
        description,
        document.body.textContent
      ].join(' ').toLowerCase();

      for (const [fit, pattern] of Object.entries(PRODUCT_PATTERNS.fit.patterns)) {
        if (pattern.test(textToCheck)) return fit;
      }

      // Default to regular fit
      return 'regular';
    } catch (error) {
      console.warn('Error detecting fit:', error);
      return 'regular';
    }
  }

    async findSizeChart() {
    try {
      // For Myntra, first click size chart button
      const sizeChartButton = document.querySelector('.size-buttons-show-size-chart');
      if (sizeChartButton) {
        sizeChartButton.click();

        // Wait for modal to load
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Try multiple selectors for Myntra's size chart table
        const selectors = [
          '.sizeChartWeb-tableNew',
          'table.sizeChart',
          '.size-chart-table',
          '.size-fit-modal table',
          '[class*="sizeChart"] table',
          '[class*="size-chart"] table'
        ];

        let table = null;
        for (const selector of selectors) {
          table = document.querySelector(selector);
          if (table) break;
        }

        if (!table) {
          // Try waiting a bit longer and search again
          await new Promise(resolve => setTimeout(resolve, 1000));
          for (const selector of selectors) {
            table = document.querySelector(selector);
            if (table) break;
          }
        }

        if (!table) {
          // Last resort: try to find any table within the modal
          const modal = document.querySelector('.size-chart-modal') ||
                       document.querySelector('[class*="sizeChart"]') ||
                       document.querySelector('[class*="size-chart"]');
          if (modal) {
            table = modal.querySelector('table');
          }
        }

        if (table) {
          console.log('Found Myntra size chart:', table);

          // Extract headers (accounting for Myntra's nested structure)
          const headers = Array.from(table.querySelectorAll('th, thead td'))
            .map(th => th.textContent.trim())
            .filter(Boolean);

          // Extract rows (accounting for possible radio buttons or other elements)
          const rows = Array.from(table.querySelectorAll('tbody tr'))
            .map(tr => {
              const cells = Array.from(tr.querySelectorAll('td'))
                .map(td => {
                  // Get text content, removing any hidden elements
                  const hiddenElements = td.querySelectorAll('.hidden, [style*="display: none"]');
                  hiddenElements.forEach(el => el.remove());
                  return td.textContent.trim();
                })
                .filter(Boolean);

              // Ensure we have valid data
              return cells.some(cell => /\d/.test(cell)) ? cells : null;
            })
            .filter(Boolean);

          // Normalize measurements
          const normalizedRows = rows.map(row =>
            row.map(cell => {
              // Extract numbers and convert if needed
              const numbers = cell.match(/[\d.]+/g);
              if (!numbers) return cell;

              const value = parseFloat(numbers[0]);
              if (isNaN(value)) return cell;

              // Convert inches to cm if needed
              const isInches = cell.toLowerCase().includes('in') ||
                             cell.includes('"') ||
                             headers.some(h => h.toLowerCase().includes('in'));

              return isInches ? (value * 2.54).toFixed(1) : value.toFixed(1);
            })
          );

          const sizeChartData = {
            headers,
            rows: normalizedRows,
            normalized: true
          };

          console.log('Parsed size chart data:', sizeChartData);

          // Format as markdown table
          let markdown = headers.join(' | ') + '\n';
          markdown += headers.map(() => '---').join(' | ') + '\n';
          markdown += normalizedRows.map(row => row.join(' | ')).join('\n');

          return markdown;
        }
      }

      // If specific Myntra handling fails, try generic approach
      return await this.findGenericSizeChart();

    } catch (error) {
      console.error('Error finding size chart:', error);
      // Try generic approach as fallback
      const genericChart = await this.findGenericSizeChart();
      if (genericChart) return genericChart;
      return null;
    }
  }

  async findGenericSizeChart() {
    try {
      const tableSelectors = [
        'table[class*="size"]',
        'table[class*="chart"]',
        'table[id*="size"]',
        'table[id*="chart"]',
        '.size-guide table',
        '.size-chart table',
        '[class*="sizeChart"] table',
        '[class*="size-chart"] table'
      ];

      let table = null;
      for (const selector of tableSelectors) {
        table = document.querySelector(selector);
        if (table) break;
      }

      if (!table) {
        // Look for tables with size-related content
        const tables = Array.from(document.querySelectorAll('table'));
        table = tables.find(t => {
          const text = t.textContent.toLowerCase();
          return text.includes('size') &&
                 (text.includes('cm') || text.includes('inch')) &&
                 t.rows.length > 1;
        });
      }

      if (table) {
        // Extract and format data similarly to Myntra handler
        const headers = Array.from(table.querySelectorAll('th, thead td'))
          .map(th => th.textContent.trim())
          .filter(Boolean);

        const rows = Array.from(table.querySelectorAll('tbody tr'))
          .map(tr => {
            const cells = Array.from(tr.querySelectorAll('td'))
              .map(td => td.textContent.trim())
              .filter(Boolean);
            return cells.some(cell => /\d/.test(cell)) ? cells : null;
          })
          .filter(Boolean);

        // Format as markdown
        let markdown = headers.join(' | ') + '\n';
        markdown += headers.map(() => '---').join(' | ') + '\n';
        markdown += rows.map(row => row.join(' | ')).join('\n');

        return markdown;
      }

      return null;

    } catch (error) {
      console.error('Error in generic size chart finder:', error);
      return null;
    }
  }

  // Update getSizeInfo method to handle failures better
  async getSizeInfo() {
    console.log('Getting size information...');

    try {
      // Get available sizes first
      const sizes = await this.findSizes();
      console.log('Available sizes:', sizes);

      if (!sizes || sizes.length === 0) {
        throw new Error('No available sizes found');
      }

      // Try to get size chart multiple times
      let attempts = 0;
      let sizeChart = null;

      while (!sizeChart && attempts < 3) {
        sizeChart = await this.findSizeChart();
        if (!sizeChart) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // If we still don't have a size chart, create a basic one from available sizes
      if (!sizeChart && sizes.length > 0) {
        sizeChart = this.createBasicSizeChart(sizes);
      }

      return {
        availableSizes: sizes,
        sizeChart: this.formatSizeChart(sizeChart)
      };

    } catch (error) {
      console.error('Error getting size info:', error);
      throw new Error('Failed to extract size information: ' + error.message);
    }
  }

  // Helper method to create basic size chart when none is found
  createBasicSizeChart(sizes) {
    const headers = ['Size', 'Standard Measurements'];
    let markdown = headers.join(' | ') + '\n';
    markdown += headers.map(() => '---').join(' | ') + '\n';
    markdown += sizes.map(size => `${size} | Standard ${size} measurements`).join('\n');
    return markdown;
  }


    async findSizes() {
      const sizeElements = Array.from(document.querySelectorAll('.size-buttons-size-button'));

      if (!sizeElements.length) {
        // Fallback to generic size elements
        return this.findGenericSizes();
      }

      const sizes = sizeElements
        .map(el => el.getAttribute('data-size') || el.textContent.trim())
        .filter(size => /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+)$/i.test(size.trim()));

      return [...new Set(sizes)];
    }

    findGenericSizes() {
      const sizePatterns = [
        /\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/g,
        /\b(3[0-9]|4[0-9]|5[0-9])\b/g
      ];

      const sizes = new Set();
      const elements = document.querySelectorAll('button, select option, [class*="size"]');

      elements.forEach(el => {
        const text = el.textContent.trim();
        sizePatterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(size => sizes.add(size.trim()));
          }
        });
      });

      return Array.from(sizes);
    }



    formatSizeChart(markdownTable) {
      if (!markdownTable) return null;

      // Clean up the markdown table
      return markdownTable
        .replace(/\n+/g, '\n')
        .replace(/\s+\|\s+/g, ' | ')
        .trim();
    }

    async getReviews() {
      try {
        const reviewsContainer = document.querySelector('.user-review-userReviewWrapper');
        const reviews = [];

        if (!reviewsContainer) return reviews;

        const reviewElements = reviewsContainer.querySelectorAll('.user-review');
        reviewElements.forEach(review => {
          const text = review.querySelector('.user-review-reviewTextWrapper')?.textContent?.trim();
          const rating = review.querySelector('.user-review-rating')?.textContent?.trim();
          const date = review.querySelector('.user-review-date')?.textContent?.trim();

          if (text) {
            reviews.push({
              text,
              rating: rating ? parseInt(rating) : null,
              date,
            });
          }
        });

        return reviews;

      } catch (error) {
        console.error('Error getting reviews:', error);
        return [];
      }
    }
  }

  // Initialize analyzer and handle messages
  let analyzer = null;

  const initializeAnalyzer = () => {
    if (!analyzer) {
      analyzer = new ProductAnalyzer();
    }
    return analyzer;
  };

  const handleAnalysisRequest = async () => {
    if (analysisInProgress) {
      console.log('Analysis already in progress');
      return { error: 'Analysis already in progress' };
    }

    const currentUrl = window.location.href;

    try {
      analysisInProgress = true;
      const productAnalyzer = initializeAnalyzer();
      const productData = await productAnalyzer.analyze();

      if (!productData) {
        throw new Error('Could not detect product information');
      }

      lastAnalyzedUrl = currentUrl;

      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PRODUCT',
        data: productData
      });

      return response?.received ?
        { success: true } :
        { error: 'Background script did not acknowledge' };

    } catch (error) {console.error('Analysis error:', error);
      return { error: error.toString() };
    } finally {
      analysisInProgress = false;
    }
  };

  // Message handling
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    switch (request.type) {
      case 'ANALYZE_REQUEST':
        handleAnalysisRequest()
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ error: error.toString() }));
        return true; // Will respond asynchronously

      case 'PING':
        sendResponse({ status: 'alive' });
        return false;

      case 'GET_CURRENT_URL':
        sendResponse({ url: window.location.href });
        return false;
    }

    return false;
  });

  // Listen for analysis results
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'ANALYSIS_COMPLETE') {
      console.log('Analysis complete:', message.data);

      // Cache the result
      if (analyzer) {
        analyzer.analysisCache.set(window.location.href, message.data);
      }

    } else if (message.type === 'ANALYSIS_ERROR') {
      console.error('Analysis error:', message.error);

      // Clear cache for current URL on error
      if (analyzer) {
        analyzer.analysisCache.delete(window.location.href);
      }
    }
  });

  // Handle page navigation
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log('URL changed:', currentUrl);
      lastUrl = currentUrl;

      // Clear analysis state
      analysisInProgress = false;

      // Reinitialize analyzer for new page
      if (analyzer) {
        analyzer.setupObservers();
      }
    }
  }).observe(document, { subtree: true, childList: true });

  // CSS for size chart overlay
  const style = document.createElement('style');
  style.textContent = `
    .size-chart-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    .size-chart-modal {
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
    }
  
    .size-chart-table {
      width: 100%;
      border-collapse: collapse;
    }
  
    .size-chart-table th,
    .size-chart-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }
  
    .size-chart-table th {
      background: #f5f5f5;
    }
  
    .size-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      height: 40px;
      margin: 4px;
      padding: 0 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .size-button:hover {
      background: #f5f5f5;
    }
  
    .size-button.selected {
      border-color: #ff3e6c;
      color: #ff3e6c;
    }
  
    .size-button.out-of-stock {
      opacity: 0.5;
      cursor: not-allowed;
      text-decoration: line-through;
    }
  
    .measurements-note {
      margin-top: 10px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      font-size: 12px;
      color: #666;
    }
  `;

  document.head.appendChild(style);

  // Helper function to inject measurement tooltips
  const injectMeasurementTooltips = () => {
    const sizeChart = document.querySelector('.size-chart-table');
    if (!sizeChart) return;

    const headers = Array.from(sizeChart.querySelectorAll('th'));
    headers.forEach(header => {
      const text = header.textContent.toLowerCase();
      let tooltip = '';

      if (text.includes('chest')) {
        tooltip = 'Measure around the fullest part of your chest';
      } else if (text.includes('waist')) {
        tooltip = 'Measure around your natural waistline';
      } else if (text.includes('hip')) {
        tooltip = 'Measure around the fullest part of your hips';
      } else if (text.includes('shoulder')) {
        tooltip = 'Measure across the back of your shoulders between the sleeve seams';
      }

      if (tooltip) {
        header.title = tooltip;
        header.style.cursor = 'help';
      }
    });
  };

  // Initialize measurement tooltips when size chart is shown
  if (window.location.hostname.includes('myntra.com')) {
    const observeDOM = () => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' &&
              mutation.addedNodes.length &&
              document.querySelector('.size-chart-table')) {
            injectMeasurementTooltips();
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observeDOM);
    } else {
      observeDOM();
    }
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductAnalyzer };
  }