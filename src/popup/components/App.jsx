// src/popup/components/App.jsx
import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  User,
  Ruler,
  Loader2,
  RotateCcw,
  AlertCircle,
  Star,
  Scale
} from 'lucide-react';
import ProductAnalysis from './ProductAnalysis';
import UserProfile from './UserProfile';

const App = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSavedAnalysis();
  }, []);

  const loadSavedAnalysis = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.url) {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_ANALYSIS'
        });

        if (response?.data) {
          setAnalysis(response.data);
          setActiveTab('fit');
        }
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.url?.startsWith('http')) {
        throw new Error('Please navigate to a product page to analyze');
      }

      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
      } catch {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await chrome.tabs.sendMessage(tab.id, {
        type: 'ANALYZE_REQUEST'
      });
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const clearAnalysis = async () => {
    setAnalysis(null);
    await chrome.runtime.sendMessage({ type: 'CLEAR_ANALYSIS' });
  };

  return (
    <div className="w-[400px] h-[600px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Header with Navigation */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-900 to-gray-900/95 backdrop-blur-sm">
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
      <div className="p-4">
        {activeTab === 'profile' ? (
          <UserProfile onComplete={() => setActiveTab('fit')} />
        ) : (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600
                         hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Ruler className="w-4 h-4 group-hover:rotate-12 transition-transform" />
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

            {/* Loading State */}
            {loading && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm
                           flex flex-col items-center justify-center text-center p-4">
                <div className="w-16 h-16 mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/30" />
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500
                                border-t-transparent animate-spin" />
                </div>
                <h3 className="text-lg font-medium mb-2">Analyzing Product</h3>
                <p className="text-sm text-gray-400">This may take a few moments...</p>
              </div>
            )}

            {/* Analysis Results */}
            {!loading && !error && analysis && (
              <ProductAnalysis analysis={analysis} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;