import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  ShirtIcon,
  Brain,
  Scale,
  Dices,
  RulerIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CircleSlashed,
  Sparkles,
  InfoIcon
} from 'lucide-react';

const LoadingState = ({ currentStep }) => {
  const steps = [
    { icon: Brain, text: "Analyzing measurements..." },
    { icon: Scale, text: "Comparing with size chart..." },
    { icon: Dices, text: "Calculating best fit..." },
    { icon: ShirtIcon, text: "Finalizing recommendation..." }
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
          {/* Animated Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
              <RulerIcon className="w-8 h-8 text-purple-400 animate-spin-slow" />
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isPast = index < currentStep;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 transition-all duration-500
                    ${isActive ? 'scale-105' : 'scale-100'}
                    ${isPast ? 'text-gray-500' : isActive ? 'text-purple-400' : 'text-gray-600'}`}
                >
                  <StepIcon
                    className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`}
                  />
                  <span className={`text-sm ${isActive ? 'text-gray-200' : ''}`}>
                    {step.text}
                  </span>
                  {isPast && (
                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductAnalysis = ({ analysis, isLoading }) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowAnalysis(false);
      const interval = setInterval(() => {
        setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 1500);
      return () => clearInterval(interval);
    } else if (analysis) {
      setTimeout(() => setShowAnalysis(true), 500);
    }
  }, [isLoading, analysis]);

  if (isLoading) {
    return <LoadingState currentStep={loadingStep} />;
  }

  if (!analysis?.sizeRecommendation) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/50 mb-4">
          <AlertTriangle className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-gray-300 font-medium">No Analysis Available</h3>
        <p className="text-gray-500 text-sm mt-2">
          Please try analyzing the product again
        </p>
      </div>
    );
  }

  const { sizeRecommendation, materialProperties } = analysis;

  const confidenceColors = {
    high: 'bg-green-500/20 border-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/20 text-yellow-400',
    low: 'bg-red-500/20 border-red-500/20 text-red-400'
  };

  return (
    <div className={`space-y-4 transition-all duration-500 ${showAnalysis ? 'opacity-100' : 'opacity-0'}`}>
      {/* Main Recommendation Card */}
      <div className="relative bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-6 border border-purple-500/20">
        <div className="absolute top-0 right-0 m-4">
          <div className={`px-3 py-1 rounded-full text-sm border flex items-center gap-2
            ${confidenceColors[sizeRecommendation.confidence] || confidenceColors.medium}`}>
            {sizeRecommendation.confidence === 'high' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {sizeRecommendation.confidence} confidence
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-white">
              Size {sizeRecommendation.size}
            </h2>
            <p className="text-gray-400">
              {sizeRecommendation.fitType || 'Regular'} fit recommended
            </p>
          </div>

          {sizeRecommendation.reasoning && (
            <p className="text-gray-300 leading-relaxed">
              {sizeRecommendation.reasoning}
            </p>
          )}
        </div>
      </div>

      {/* Key Measurements */}
      {sizeRecommendation.keyMeasurements?.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="flex items-center gap-2 text-lg font-medium text-gray-200 mb-4">
            <RulerIcon className="w-5 h-5 text-purple-400" />
            Key Measurements
          </h3>
          <div className="grid gap-3">
            {sizeRecommendation.keyMeasurements.map((measurement, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg"
              >
                <ArrowRight className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300">{measurement}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Potential Issues */}
      {sizeRecommendation.potentialIssues?.length > 0 && (
        <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
          <h3 className="flex items-center gap-2 text-lg font-medium text-red-400 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Potential Fit Issues
          </h3>
          <div className="space-y-3">
            {sizeRecommendation.potentialIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 text-red-300">
                <CircleSlashed className="w-4 h-4 flex-shrink-0 mt-1" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Sizes */}
      {sizeRecommendation.alternativeSizes?.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="flex items-center gap-2 text-lg font-medium text-gray-200 mb-4">
            <ShirtIcon className="w-5 h-5 text-purple-400" />
            Alternative Sizes
          </h3>
          <div className="space-y-3">
            {sizeRecommendation.alternativeSizes.map((size, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-lg text-sm flex-shrink-0 w-16 text-center
                  ${typeof size === 'object' 
                    ? (size.size === sizeRecommendation.size 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' 
                      : 'bg-gray-700/50 text-gray-300')
                    : 'bg-gray-700/50 text-gray-300'}`}>
                  {typeof size === 'object' ? size.size : size}
                </div>
                {typeof size === 'object' && (
                  <span className="text-gray-400">{size.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Material Properties */}
      {materialProperties && materialProperties.materials?.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-medium text-gray-200">Material Analysis</h3>
          </div>
          <div className="space-y-2">
            {materialProperties.materials.map((material, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2 bg-gray-800/30 rounded-lg">
                <span className="text-gray-300">{material.material}</span>
                <span className="text-gray-400">{material.percentage}%</span>
              </div>
            ))}
            {materialProperties.stretch > 0 && (
              <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
                <InfoIcon className="w-4 h-4" />
                This garment has {materialProperties.stretch}% stretch factor
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="p-3 bg-gray-800/30 rounded-lg flex items-start gap-2">
        <InfoIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            Size recommendations are based on your measurements and the product's size chart.
            Consider trying on multiple sizes if available.
          </p>
          {materialProperties?.stretch > 0 && (
            <p>
              This garment has {materialProperties.stretch}% stretch, which has been factored into the recommendation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;