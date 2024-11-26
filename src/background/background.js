// Initialize listeners first
self.oninstall = (event) => {
  console.log('Service Worker installing...');
};

self.onactivate = (event) => {
  console.log('Service Worker activating...');
};

// Status Manager Class with persistent storage
class StatusManager {
  constructor() {
    this.currentStatus = null;
    this.steps = [
      { step: 'init', message: 'Initializing analysis...' },
      { step: 'scraping', message: 'Extracting product information...' },
      { step: 'measurements', message: 'Processing measurements...' },
      { step: 'sizechart', message: 'Analyzing size chart...' },
      { step: 'comparing', message: 'Comparing with your profile...' },
      { step: 'materials', message: 'Evaluating material properties...' },
      { step: 'calculating', message: 'Calculating best fit...' },
      { step: 'generating', message: 'Generating recommendations...' },
      { step: 'finalizing', message: 'Finalizing analysis...' }
    ];
    this.stepIndex = 0;
    this.loadStatus();
  }

  async loadStatus() {
    try {
      const { analysisStatus } = await chrome.storage.local.get('analysisStatus');
      if (analysisStatus) {
        this.currentStatus = analysisStatus;
        this.stepIndex = analysisStatus.stepIndex || 0;
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  }

  async updateStatus(status, details = null) {
    this.currentStatus = {
      step: this.steps[this.stepIndex]?.step || 'unknown',
      message: this.steps[this.stepIndex]?.message || 'Processing...',
      details: details,
      timestamp: new Date().toISOString(),
      stepIndex: this.stepIndex,
      totalSteps: this.steps.length
    };

    try {
      // Store status
      await chrome.storage.local.set({ 'analysisStatus': this.currentStatus });

      // Broadcast status
      await this.broadcastStatus();

      // Move to next step
      this.stepIndex = (this.stepIndex + 1) % this.steps.length;
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async broadcastStatus() {
    if (this.currentStatus) {
      try {
        await chrome.runtime.sendMessage({
          type: 'ANALYSIS_STATUS',
          status: this.currentStatus
        });
      } catch (error) {
        console.log('No listeners for status update');
      }
    }
  }

  async reset() {
    this.stepIndex = 0;
    this.currentStatus = null;
    try {
      await chrome.storage.local.remove('analysisStatus');
      await this.broadcastStatus();
    } catch (error) {
      console.error('Error resetting status:', error);
    }
  }
}

class AIService {
  constructor() {
    this.initialized = false;
    this.session = null;
    this.analysisInProgress = false;
    this.statusManager = new StatusManager();
    this.currentProductUrl = null;
  }

  async initialize() {
  try {
    if (this.initialized) return true;

    console.log("Initializing AI service...");
    const capabilities = await ai.languageModel.capabilities();
    console.log("AI capabilities:", capabilities);

    if (capabilities.available === 'no') {
      throw new Error('Language model not available');
    }

    const systemPrompt = `You are a clothing size recommendation expert. Your task is to analyze measurements and provide accurate size recommendations.

Rules:
1. Always respond in English
2. Use exact measurements in centimeters
3. Consider both user measurements and garment measurements
4. Account for fabric stretch and fit preferences
5. Be precise with numbers and calculations

Analyze the measurements provided and respond EXACTLY in this format:

MEASUREMENTS ANALYSIS:
[Compare user measurements with size chart measurements]

BEST SIZE: [Recommend specific size]
CONFIDENCE: [high/medium/low]
REASONING: [Brief explanation with numbers]
FIT TYPE: [fitted/regular/loose]

KEY MEASUREMENTS:
[List key differences]

POTENTIAL ISSUES:
[List potential fit problems]

ALTERNATIVE SIZES:
[List alternatives with reasons]`;

    this.session = await ai.languageModel.create({
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent output
      topK: 1, // Most likely token only
      maxOutputTokens: 750,
      safetySettings: [
        {
          category: "HARM_CATEGORY_DEROGATORY",
          threshold: "BLOCK_LOW_AND_ABOVE"
        }
      ]
    });

    this.initialized = true;
    console.log("AI service initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize AI:", error);
    this.initialized = false;
    throw error;
  }
}

  createAnalysisPrompt(productData, sizeChart, measurements, userProfile) {
  let prompt = `Analyze these measurements for ${productData.title || 'this garment'}:

PRODUCT DETAILS:
- Category: ${productData.category || 'Clothing'}
- Brand: ${productData.brand || 'Not specified'}
- Fit: ${productData.fit || 'Regular Fit'}
- Available Sizes: ${productData.availableSizes?.join(', ')}`;

  // Add material information if available
  if (productData.materials?.length > 0) {
    prompt += `\n\nMATERIALS:
${productData.materials.map(m => `- ${m.material}: ${m.percentage}%`).join('\n')}
Calculated Stretch Factor: ${this.calculateMaterialStretch(productData.materials)}%`;
  }

  // Add review statistics if available
  if (productData.ratings?.fitFeedback) {
    prompt += `\n\nCUSTOMER FEEDBACK:`;
    Object.entries(productData.ratings.fitFeedback).forEach(([aspect, data]) => {
      prompt += `\n- ${aspect}: ${data.response} (${data.percentage}% of customers)`;
    });
  }

  // Add size chart and measurements
  prompt += `\n\nSIZE CHART:
${this.formatSizeChart(sizeChart)}

USER MEASUREMENTS:
${Object.entries(measurements)
  .map(([key, value]) => `- ${key}: ${value}cm`)
  .join('\n')}

PREFERENCES:
- Preferred Fit: ${userProfile.preferredFit || 'Regular'}
- Size Preference: ${userProfile.sizePreference || 'Standard'}

Provide a size recommendation using only these available sizes: ${productData.availableSizes?.join(', ')}
Include exact measurements in your reasoning.`;

  return prompt;
}

  async generateAnalysis(productData, tabId) {
  if (this.analysisInProgress) {
    throw new Error('Analysis already in progress');
  }

  this.currentProductUrl = productData.url;

  try {
    this.analysisInProgress = true;
    this.statusManager.updateStatus('init');

    const profileData = await chrome.storage.local.get('userProfile');
    const userProfile = profileData.userProfile;

    if (!userProfile) {
      throw new Error('Please add your measurements in the profile section first');
    }

    if (!this.initialized) {
      await this.initialize();
    }

    this.statusManager.updateStatus('measurements');
    const relevantMeasurements = this.getRelevantMeasurements(productData.category, userProfile);

    if (Object.keys(relevantMeasurements).length === 0) {
      throw new Error('No relevant measurements found for this garment type');
    }

    const prompt = this.createAnalysisPrompt(productData, productData.sizeChart, relevantMeasurements, userProfile);

    this.statusManager.updateStatus('generating');
    console.log("Sending prompt:", prompt);

    // Add retry mechanism for language issues
    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        response = await this.session.prompt(prompt + "\nRespond in English only.");

        // Validate response format
        if (response.includes('BEST SIZE:') &&
            response.includes('CONFIDENCE:') &&
            response.includes('REASONING:')) {
          break; // Valid response received
        }

        throw new Error('Invalid response format');
      } catch (error) {
        attempts++;
        if (attempts === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
      }
    }

    this.statusManager.updateStatus('finalizing');
    const sizeRecommendation = this.parseRecommendation(response);

    const analysis = {
      sizeRecommendation,
      productInfo: productData,
      userMeasurements: relevantMeasurements,
      materialProperties: {
        stretch: this.calculateMaterialStretch(productData.materials),
        materials: productData.materials
      },
      timestamp: new Date().toISOString(),
      url: this.currentProductUrl
    };

    await chrome.storage.local.set({
      'lastAnalysis': analysis,
      [`analysis_${this.currentProductUrl}`]: analysis
    });

    await this.broadcastResult(analysis, tabId);
    return analysis;

  } catch (error) {
    console.error("Analysis error:", error);
    await this.broadcastError(error, tabId);
    throw error;
  } finally {
    this.analysisInProgress = false;
    this.statusManager.reset();
  }
}
//
//   createAnalysisPrompt(productData, sizeChart, measurements, userProfile) {
//     return `Analyze these measurements and recommend the best size:
//
// PRODUCT DETAILS:
// Category: ${productData.category || 'Not specified'}
// Brand: ${productData.brand || 'Not specified'}
// Fit Type: ${productData.fit || 'Regular Fit'}
// Available Sizes: ${productData.availableSizes?.join(', ')}
//
// SIZE CHART:
// ${this.formatSizeChart(sizeChart)}
//
// USER MEASUREMENTS:
// ${Object.entries(measurements)
//   .map(([key, value]) => `${key}: ${value}cm`)
//   .join('\n')}
//
// FIT PREFERENCE: ${userProfile.preferredFit || 'Regular'}
// Size Preference: ${userProfile.sizePreference || 'Depends on item'}
//
// Provide a size recommendation using only the available sizes: ${productData.availableSizes?.join(', ')}
// Include exact measurements in your reasoning.`;
//   }

  getRelevantMeasurements(category, userProfile) {
    if (!userProfile) return {};

    const measurements = {};
    const categoryMap = {
      'shirt': ['neck', 'chest', 'shoulders', 'waist', 'bicep'],
      't-shirt': ['chest', 'shoulders', 'waist', 'bicep'],
      'pants': ['waist', 'hips', 'thigh', 'inseam'],
      'jacket': ['chest', 'shoulders', 'waist', 'bicep'],
      'dress': ['chest', 'waist', 'hips'],
      'default': ['chest', 'waist', 'hips', 'shoulders']
    };

    // Normalize category
    const normalizedCategory = (category || '').toLowerCase().trim();
    const measurementKeys = categoryMap[normalizedCategory] || categoryMap.default;

    // Get measurements and convert to numbers
    measurementKeys.forEach(key => {
      if (userProfile[key]) {
        const value = parseFloat(userProfile[key]);
        if (!isNaN(value)) {
          measurements[key] = value;
        }
      }
    });

    return measurements;
  }

  normalizeSizeChart(sizeChart) {
    if (!sizeChart || typeof sizeChart !== 'string') {
      console.log('Invalid size chart format:', sizeChart);
      return null;
    }

    try {
      console.log('Raw size chart:', sizeChart);

      // Split and clean the input
      const lines = sizeChart.trim().split('\n')
        .filter(line => line.trim() && !line.includes('---'));

      if (lines.length < 2) {
        console.log('Insufficient size chart data');
        return null;
      }

      // Parse headers
      const headerLine = lines[0];
      const headers = headerLine.split('|')
        .map(h => h.trim())
        .filter(Boolean);

      console.log('Parsed headers:', headers);

      // Initialize normalized structure
      const normalized = {
        headers: [],
        measurements: {},
        original: sizeChart
      };

      // Map headers to standardized names
      normalized.headers = headers.map(header => {
        const clean = header.toLowerCase();
        if (clean.includes('size')) return 'size';
        if (clean.includes('chest') || clean.includes('bust')) return 'chest';
        if (clean.includes('shoulder')) return 'shoulders';
        if (clean.includes('length')) return 'length';
        if (clean.includes('waist')) return 'waist';
        if (clean.includes('hip')) return 'hips';
        if (clean.includes('inseam')) return 'inseam';
        if (clean.includes('sleeve')) return 'sleeve';
        if (clean.includes('neck')) return 'neck';
        return header;
      });

      // Process measurement rows
      lines.slice(1).forEach(line => {
        const values = line.split('|')
          .map(v => v.trim())
          .filter(Boolean);

        if (values.length < 2) return;

        const size = values[0].trim();
        if (!size) return;

        normalized.measurements[size] = {};

        values.slice(1).forEach((value, index) => {
          const header = normalized.headers[index + 1];
          if (!header) return;

          // Extract numeric value and handle units
          const numericValue = value.replace(/[^\d.]/g, '');
          let measurement = parseFloat(numericValue);

          if (isNaN(measurement)) return;

          // Convert inches to cm if needed
          const isInches = value.toLowerCase().includes('in') ||
                          value.includes('"') ||
                          headers[index + 1].toLowerCase().includes('in');

          if (isInches) {
            measurement *= 2.54;
          }

          normalized.measurements[size][header] = Number(measurement.toFixed(1));
        });
      });

      console.log('Normalized size chart:', normalized);
      return normalized;

    } catch (error) {
      console.error('Size chart normalization error:', error);
      return null;
    }
  }

  formatSizeChart(sizeChart) {
    if (!sizeChart || !sizeChart.headers || !sizeChart.measurements) {
      return 'Size chart data not available';
    }

    try {
      // Create header row
      let formatted = 'Size | ' + sizeChart.headers.slice(1).join(' | ') + '\n';

      // Add separator
      formatted += '-'.repeat(formatted.length) + '\n';

      // Add measurements
      Object.entries(sizeChart.measurements).forEach(([size, measurements]) => {
        const measurementValues = sizeChart.headers.slice(1)
          .map(header => measurements[header] ? `${measurements[header].toFixed(1)}` : '-')
          .join(' | ');

        formatted += `${size} | ${measurementValues}\n`;
      });

      return formatted;

    } catch (error) {
      console.error('Error formatting size chart:', error);
      return 'Error formatting size chart';
    }
  }

  parseRecommendation(text) {
  try {
    // Add basic validation of text
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid response from AI model');
    }

    const recommendation = {
      size: '',
      confidence: '',
      reasoning: '',
      fitType: '',
      keyMeasurements: [],
      potentialIssues: [],
      alternativeSizes: []
    };

    // Split into sections more reliably
    const sections = text.split(/\n(?=[A-Z\s]+:)/);

    sections.forEach(section => {
      const [header, ...content] = section.split(':');
      const sectionContent = content.join(':').trim();

      switch (header.trim()) {
        case 'BEST SIZE':
          recommendation.size = sectionContent;
          break;
        case 'CONFIDENCE':
          recommendation.confidence = sectionContent.toLowerCase();
          break;
        case 'REASONING':
          recommendation.reasoning = sectionContent;
          break;
        case 'FIT TYPE':
          recommendation.fitType = sectionContent.toLowerCase();
          break;
        case 'KEY MEASUREMENTS':
          recommendation.keyMeasurements = sectionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().slice(1).trim());
          break;
        case 'POTENTIAL ISSUES':
          recommendation.potentialIssues = sectionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().slice(1).trim());
          break;
        case 'ALTERNATIVE SIZES':
          recommendation.alternativeSizes = sectionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => {
              const altLine = line.trim().slice(1).trim();
              if (altLine.includes(':')) {
                const [size, description] = altLine.split(':').map(s => s.trim());
                return { size, description };
              }
              return altLine;
            });
          break;
      }
    });

    // Validate essential fields
    if (!recommendation.size || !recommendation.confidence) {
      throw new Error('Incomplete recommendation from AI model');
    }

    return recommendation;
  } catch (error) {
    console.error('Error parsing recommendation:', error);
    throw new Error('Failed to parse AI response');
  }
}

  calculateMaterialStretch(materials) {
  if (!materials || !Array.isArray(materials) || materials.length === 0) return 0;

  const stretchFactors = {
    'spandex': 4,
    'elastane': 4,
    'lycra': 4,
    'polyester': 1.5,
    'nylon': 1.5,
    'cotton': 1,
    'wool': 1,
    'linen': 0.5,
    'silk': 0.5
  };

  let totalStretch = 0;
  let totalPercentage = 0;

  materials.forEach(({ material, percentage }) => {
    if (material && percentage && percentage > 0 && percentage <= 100) {
      const materialLower = material.toLowerCase();
      // Filter out non-material entries
      if (!materialLower.includes('off') &&
          !materialLower.includes('discount') &&
          !materialLower.includes('original')) {
        const factor = stretchFactors[materialLower] || 1;
        totalStretch += (percentage * factor);
        totalPercentage += percentage;
      }
    }
  });

  // If valid materials add up to less than 100%, assume the rest is standard
  if (totalPercentage < 100) {
    totalStretch += (100 - totalPercentage) * 1; // Default stretch factor
  }

  return Math.round(totalStretch / 100);
}

  async broadcastError(error, tabId) {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';

    // Notify extension popup
    try {
      await chrome.runtime.sendMessage({
        type: 'ANALYSIS_ERROR',
        error: errorMessage
      });
    } catch (error) {
      console.log('Error sending to popup:', error);
    }

    // Notify content script
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'ANALYSIS_ERROR',
          error: errorMessage
        });
      } catch (error) {
        console.log('Error sending to content script:', error);
      }
    }
  }

  async broadcastResult(analysis, tabId) {
    // Notify extension popup
    try {
      await chrome.runtime.sendMessage({
        type: 'ANALYSIS_COMPLETE',
        data: analysis
      });
    } catch (error) {
      console.log('Error sending to popup:', error);
    }

    // Notify content script
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'ANALYSIS_COMPLETE',
          data: analysis
        });
      } catch (error) {
        console.log('Error sending to content script:', error);
      }
    }
  }

  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
    this.initialized = false;
    this.statusManager.reset();
  }

  async loadPreviousAnalysis(url) {
    try {
      const result = await chrome.storage.local.get(`analysis_${url}`);
      return result[`analysis_${url}`] || null;
    } catch (error) {
      console.error('Error loading previous analysis:', error);
      return null;
    }
  }

  async clearAnalysis(url = null) {
    try {
      if (url) {
        await chrome.storage.local.remove([`analysis_${url}`, 'lastAnalysis']);
      } else {
        const urlPattern = 'analysis_';
        const items = await chrome.storage.local.get(null);
        const keysToRemove = Object.keys(items).filter(key => key.startsWith(urlPattern));
        await chrome.storage.local.remove([...keysToRemove, 'lastAnalysis']);
      }
      this.statusManager.reset();
    } catch (error) {
      console.error('Error clearing analysis:', error);
    }
  }
}

// Initialize service
const aiService = new AIService();
console.log('AI Service created');

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Extension message received:", message);

  const handleError = (error) => {
    console.error("Operation failed:", error);
    sendResponse({ error: error.toString() });
  };

  switch (message.type) {
    case 'ANALYZE_PRODUCT':
      if (sender.tab) {
        sendResponse({ received: true });
        aiService.generateAnalysis(message.data, sender.tab.id).catch(handleError);
      }
      return false;

    case 'GET_ANALYSIS':
      if (message.url) {
        aiService.loadPreviousAnalysis(message.url)
          .then(analysis => sendResponse({ data: analysis }))
          .catch(handleError);
      } else {
        chrome.storage.local.get(['lastAnalysis', 'analysisStatus'])
          .then(result => sendResponse(result))
          .catch(handleError);
      }
      return true;

    case 'CLEAR_ANALYSIS':
      aiService.clearAnalysis(message.url)
        .then(() => sendResponse({ success: true }))
        .catch(handleError);
      return true;
  }

  return false;
});

// Handle installation and cleanup
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      await aiService.initialize();
      console.log("AI service initialized on install");
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  }
});

chrome.runtime.onSuspend.addListener(() => {
  console.log("Extension suspending, cleaning up...");
  if (aiService) {
    aiService.destroy();
  }
});