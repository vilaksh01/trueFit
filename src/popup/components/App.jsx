import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  User,
  Ruler,
  LoaderCircle,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import ProductAnalysis from './ProductAnalysis';
import UserProfile from './UserProfile';

const LoadingOverlay = ({ status, step }) => (
  <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="max-w-md w-full mx-4">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
        {/* Logo Animation */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
            <Ruler className="w-8 h-8 text-purple-400 animate-spin-slow" />
          </div>
        </div>

        {/* Status Message */}
        <div className="flex items-center gap-3 mb-6">
          <LoaderCircle className="w-5 h-5 text-purple-400 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">
              {status?.message || 'Analyzing...'}
            </p>
            {status?.details && (
              <p className="text-xs text-gray-400 mt-0.5">
                {status.details}
              </p>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {[
            'Initializing...',
            'Extracting product information...',
            'Processing measurements...',
            'Analyzing size chart...',
            'Generating recommendation...'
          ].map((text, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-sm transition-colors duration-300 ${
                index === step
                  ? 'text-purple-400'
                  : index < step
                  ? 'text-gray-500'
                  : 'text-gray-600'
              }`}
            >
              {index < step ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : index === step ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600" />
              )}
              {text}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-6 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{
              width: `${((step + 1) / 5) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [step, setStep] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');

  // Load initial state and set up message listeners
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          setCurrentUrl(tab.url);
          const result = await chrome.runtime.sendMessage({
            type: 'GET_ANALYSIS',
            url: tab.url
          });

          if (result?.data) {
            console.log('Loaded saved analysis:', result.data);
            setAnalysis(result.data);
            setActiveTab('fit');
          }
        }
      } catch (error) {
        console.error('Error loading initial state:', error);
      }
    };

    const messageListener = (message) => {
      console.log('Received message in popup:', message);

      switch (message.type) {
        case 'ANALYSIS_STATUS':
          setStatus(message.status);
          setStep(prev => Math.min(prev + 1, 4));
          break;

        case 'ANALYSIS_COMPLETE':
          console.log('Analysis complete:', message.data);
          if (message.data?.url === currentUrl) {
            setLoading(false);
            setAnalysis(message.data);
            setActiveTab('fit');
            setStatus(null);
            setStep(0);
            setError(null);
          }
          break;

        case 'ANALYSIS_ERROR':
          console.error('Analysis error:', message.error);
          setLoading(false);
          setError(message.error);
          setStatus(null);
          setStep(0);
          break;
      }
    };

    // Set up listeners
    chrome.runtime.onMessage.addListener(messageListener);
    loadInitialState();

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, [currentUrl]);

  const handleAnalyze = async () => {
    console.log('Starting analysis...');
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setStep(0);
    setStatus({ message: 'Initializing analysis...' });

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url?.startsWith('http')) {
        throw new Error('Please navigate to a product page to analyze');
      }

      setCurrentUrl(tab.url);

      // Check if content script is running
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch {
        console.log('Injecting content script...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Request analysis
      await chrome.tabs.sendMessage(tab.id, {
        type: 'ANALYZE_REQUEST'
      });

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message);
      setLoading(false);
      setStatus(null);
      setStep(0);
    }
  };

  const clearAnalysis = async () => {
    try {
      setAnalysis(null);
      setError(null);
      setStatus(null);
      setStep(0);
      await chrome.runtime.sendMessage({
        type: 'CLEAR_ANALYSIS',
        url: currentUrl
      });
    } catch (error) {
      console.error('Error clearing analysis:', error);
    }
  };

  return (
    <div className="content-wrapper">
      {/* Header Tabs */}
      <div className="sticky-header">
        <div className="p-4 pb-2">
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg border border-gray-700/30">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors
                ${activeTab === 'profile' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('fit')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors
                ${activeTab === 'fit' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
            >
              <Ruler size={18} />
              <span>Fit Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content scrollable-content">
        {activeTab === 'profile' ? (
          <UserProfile onComplete={() => setActiveTab('fit')} />
        ) : (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2
                         bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Ruler className="w-4 h-4" />
                    <span>Analyze Product</span>
                  </>
                )}
              </button>

              {analysis && (
                <button
                  onClick={clearAnalysis}
                  className="p-2 text-gray-400 hover:text-gray-200 bg-gray-800/50
                           hover:bg-gray-700/50 rounded-lg transition-all hover:rotate-180"
                  title="Clear analysis"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-400 mb-1">Analysis Error</h3>
                    <p className="text-sm text-red-300/80">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {loading && <LoadingOverlay status={status} step={step} />}

            {/* Analysis Results */}
            {!loading && !error && analysis && (
              <ProductAnalysis analysis={analysis} />
            )}

            {/* No Analysis State */}
            {!loading && !error && !analysis && (
              <div className="text-center p-8 text-gray-400">
                <Ruler className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click "Analyze Product" to get size recommendations</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;