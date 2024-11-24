class AIService {
  constructor() {
    this.initialized = false;
    this.model = null;
  }

  async initialize() {
    try {
      const capabilities = await ai.languageModel.capabilities();
      console.log("AI capabilities:", capabilities);

      if (capabilities.available === 'readily') {
        // Initialize with English language constraint
        this.model = await ai.languageModel.create();
        this.initialized = true;
        return true;
      } else {
        throw new Error('Language model not available');
      }
    } catch (error) {
      console.error("Failed to initialize AI:", error.message);
      this.initialized = false;
      throw error;
    }
  }

  async generateAnalysis(productData) {
    try {
      const { userProfile } = await chrome.storage.local.get('userProfile');

      if (!this.initialized) {
        await this.initialize();
      }

      // First, validate user profile exists
      if (!userProfile) {
        throw new Error('Please add your measurements in the profile section first');
      }

      // Format measurements for better prompting
      const formatMeasurements = (measurements) => {
        return Object.entries(measurements)
          .map(([key, value]) => `${key}: ${value} cm`)
          .join('\n');
      };

      // Create a more structured prompt
      const prompt = `As a sizing expert, analyze these measurements and recommend the best size.
  
  GARMENT DETAILS:
  Type: ${productData.type || 'Clothing item'}
  Brand: ${productData.brand || 'Not specified'}
  Available Sizes: ${JSON.stringify(productData.availableSizes || [])}
  
  SIZE CHART:
  ${productData.sizeChart ? JSON.stringify(productData.sizeChart, null, 2) : 'Not provided'}
  
  USER MEASUREMENTS:
  ${formatMeasurements(userProfile)}
  
  TASK:
  1. Analyze the user's measurements against the size chart
  2. Consider the garment type and typical fit
  3. Recommend the best size
  4. Explain your reasoning
  5. List any potential fit issues
  
  Format your response like this:
  - Recommended Size: [size]
  - Confidence: [high/medium/low]
  - Reasoning: [clear explanation]
  - Fit Notes: [any specific notes about fit]
  - Alternative Sizes: [if any]
  - Key Measurements: [list critical measurements]
  - Potential Issues: [if any]
  
  Respond in English only and be specific about measurements.`;

      // Get response and handle streaming
      const response = await this.model.prompt(prompt);
      console.log("Raw AI response:", response);

      // Structure the response
      const analysis = {
        productType: productData.type || "clothing",
        sizeInfo: {
          availableSizes: productData.availableSizes || [],
          fitType: this.determineFitType(response),
          sizeChartDetails: productData.sizeChart || {
            headers: [],
            measurements: []
          }
        },
        recommendation: {
          recommendedSize: this.extractSize(response),
          confidence: this.determineConfidence(response),
          reasoning: response,
          fitNotes: this.extractFitNotes(response),
          alternativeSizes: this.extractAlternativeSizes(response, productData.availableSizes)
        },
        measurementAnalysis: {
          keyMeasurements: this.extractKeyMeasurements(response),
          criticalMeasurements: this.extractCriticalMeasurements(userProfile, response),
          potentialIssues: this.extractIssues(response)
        },
        timestamp: new Date().toISOString(),
        url: productData.url
      };

      return analysis;
    } catch (error) {
      console.error("Analysis error details:", error);
      throw error;
    }
  }

  // Add new helper method for extracting fit notes
  extractFitNotes(response) {
    const text = response.toLowerCase();
    const notes = [];

    // Look for specific fit-related phrases
    if (text.includes('fit notes:')) {
      const startIndex = text.indexOf('fit notes:') + 10;
      const endIndex = text.indexOf('\n', startIndex);
      if (endIndex > startIndex) {
        return text.slice(startIndex, endIndex).trim();
      }
    }

    return notes.join('. ');
  }

  // Add new helper method for critical measurements
  extractCriticalMeasurements(userProfile, response) {
    const text = response.toLowerCase();
    const criticalPoints = [];

    // Map user measurements to product measurements
    Object.entries(userProfile).forEach(([key, value]) => {
      if (text.includes(key.toLowerCase())) {
        criticalPoints.push({
          measurement: key,
          value: `${value} cm`
        });
      }
    });

    return criticalPoints;
  }

  // Helper methods to extract information from response
  determineFitType(response) {
    const text = response.toLowerCase();
    if (text.includes('tight') || text.includes('slim') || text.includes('fitted')) return 'fitted';
    if (text.includes('loose') || text.includes('relaxed') || text.includes('oversized')) return 'loose';
    return 'regular';
  }

  extractSize(response) {
    const sizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
    for (const size of sizes) {
      if (response.includes(size)) return size;
    }
    return 'M'; // Default if no size found
  }

  determineConfidence(response) {
    const text = response.toLowerCase();
    if (text.includes('confident') || text.includes('perfect fit') || text.includes('ideal')) return 'high';
    if (text.includes('might') || text.includes('could') || text.includes('possibly')) return 'low';
    return 'medium';
  }

  extractKeyMeasurements(response) {
    const measurements = ['chest', 'waist', 'hip', 'shoulder', 'sleeve', 'length'];
    return measurements.filter(m => response.toLowerCase().includes(m));
  }

  extractIssues(response) {
    const issues = [];
    const text = response.toLowerCase();
    if (text.includes('tight')) issues.push('May be tight');
    if (text.includes('loose')) issues.push('May be loose');
    return issues;
  }

  extractAlternativeSizes(response, availableSizes = []) {
    const mainSize = this.extractSize(response);
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const mainIndex = sizeOrder.indexOf(mainSize);

    return availableSizes
      .filter(size => size !== mainSize)
      .slice(0, 2);
  }

  async analyzeProduct(tabId, productData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log("Starting analysis for product:", productData.title);
      const analysis = await this.generateAnalysis(productData);
      console.log("Analysis completed:", analysis);

      // Store analysis
      await chrome.storage.local.set({
        'lastAnalysis': analysis
      });

      // Notify tab
      await this.notifyTab(tabId, {
        type: 'ANALYSIS_COMPLETE',
        data: analysis
      });

      return analysis;
    } catch (error) {
      console.error("Analysis error:", error);
      await this.notifyTab(tabId, {
        type: 'ANALYSIS_ERROR',
        error: error.message || "Failed to analyze product"
      });
      throw error;
    }
  }

  async notifyTab(tabId, message) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
      console.error("Failed to notify tab:", error);
      await chrome.storage.local.set({
        'pendingAnalysis': {
          tabId,
          message,
          timestamp: Date.now()
        }
      });
    }
  }

  destroy() {
    if (this.model) {
      this.model.destroy();
      this.model = null;
    }
    this.initialized = false;
  }
}

// Initialize service
const aiService = new AIService();

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  if (request.type === 'ANALYZE_PRODUCT' && sender.tab) {
    (async () => {
      try {
        const analysis = await aiService.analyzeProduct(sender.tab.id, request.data);
        sendResponse({ success: true, data: analysis });
      } catch (error) {
        console.error("Failed to process analysis request:", error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    return true;
  }

  if (request.type === 'GET_ANALYSIS') {
    chrome.storage.local.get(['lastAnalysis'], result => {
      sendResponse({ data: result.lastAnalysis });
    });
    return true;
  }

  if (request.type === 'CLEAR_ANALYSIS') {
    chrome.storage.local.remove(['lastAnalysis'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  sendResponse({ received: true });
  return true;
});

// Handle installation and updates
chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === 'install') {
    try {
      console.log("Initializing AI service on install...");
      await aiService.initialize();
      console.log("AI service initialized successfully");
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  }
});

// Cleanup on unload
chrome.runtime.onSuspend.addListener(() => {
  aiService.destroy();
});