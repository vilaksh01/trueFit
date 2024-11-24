// src/popup/components/ProductAnalysis.jsx
import { h } from 'preact';
import {
  ShirtIcon,
  RulerIcon,
  CheckCircle2,
  AlertTriangle,
  InfoIcon,
  ThumbsUp,
  ThumbsDown,
  Scale,
  ArrowRight,
  Star,
  Ruler,
  CircleAlert
} from 'lucide-react';

const ConfidenceBadge = ({ level }) => {
  const colors = {
    high: 'bg-green-500/20 text-green-400 border-green-500/20',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20',
    low: 'bg-red-500/20 text-red-400 border-red-500/20'
  };

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Confidence
    </div>
  );
};

const FitCard = ({ title, children, icon: Icon }) => (
  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-purple-400" />
      <h3 className="font-medium">{title}</h3>
    </div>
    {children}
  </div>
);

const SizeChart = ({ headers, measurements }) => {
  // Ensure measurements is an array and each row is an array
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeMeasurements = Array.isArray(measurements) ? measurements : [];

  // Normalize data to ensure each row is an array
  const normalizedMeasurements = safeMeasurements.map(row => {
    if (Array.isArray(row)) return row;
    if (typeof row === 'object') return safeHeaders.map(header => row[header] || '');
    return [];
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {safeHeaders.map((header, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left text-gray-400 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalizedMeasurements.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-2 py-1.5 border-t border-gray-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ProductAnalysis = ({ analysis }) => {
  const buyDecision = () => {
    if (analysis.recommendation.confidence === 'high') {
      return {
        icon: ThumbsUp,
        text: 'Recommended Purchase',
        color: 'text-green-400',
        bg: 'bg-green-500/10'
      };
    }
    if (analysis.recommendation.confidence === 'low') {
      return {
        icon: ThumbsDown,
        text: 'Consider Alternatives',
        color: 'text-red-400',
        bg: 'bg-red-500/10'
      };
    }
    return {
      icon: Scale,
      text: 'Potentially Good Fit',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10'
    };
  };

  const decision = buyDecision();

  return (
    <div className="space-y-4">
      {/* Main Recommendation */}
      <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 rounded-xl p-4 border border-purple-500/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-medium mb-1">
              Size {analysis.recommendation.recommendedSize}
            </h2>
            <ConfidenceBadge level={analysis.recommendation.confidence} />
          </div>
          <div className={`p-3 rounded-lg ${decision.bg}`}>
            <div className="flex flex-col items-center gap-1">
              <decision.icon className={`w-5 h-5 ${decision.color}`} />
              <span className={`text-xs font-medium ${decision.color}`}>
                {decision.text}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-gray-300">{analysis.recommendation.reasoning}</p>
          {analysis.recommendation.fitNotes && (
            <div className="flex gap-2 text-sm bg-gray-900/50 p-3 rounded-lg">
              <InfoIcon size={16} className="flex-shrink-0 mt-0.5" />
              <p className="text-gray-400">{analysis.recommendation.fitNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Alternative Sizes */}
      {analysis.recommendation.alternativeSizes?.length > 0 && (
        <FitCard title="Alternative Sizes" icon={ShirtIcon}>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendation.alternativeSizes.map(size => (
              <div key={size}
                   className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg
                     ${size === analysis.recommendation.recommendedSize 
                       ? 'bg-purple-500/20 border border-purple-500/20' 
                       : 'bg-gray-900/50'}`}
              >
                <span>{size}</span>
                {size === analysis.recommendation.recommendedSize && (
                  <CheckCircle2 size={14} className="text-purple-400" />
                )}
              </div>
            ))}
          </div>
        </FitCard>
      )}

      {/* Size Chart */}
      {analysis.sizeInfo?.sizeChartDetails?.headers && (
        <FitCard title="Size Chart" icon={Ruler}>
          <SizeChart
            headers={analysis.sizeInfo.sizeChartDetails.headers}
            measurements={
              // Ensure measurements is properly formatted
              Array.isArray(analysis.sizeInfo.sizeChartDetails.measurements)
                ? analysis.sizeInfo.sizeChartDetails.measurements
                : []
            }
          />
        </FitCard>
      )}

      {/* Fit Analysis */}
      <FitCard title="Fit Analysis" icon={RulerIcon}>
        {analysis.measurementAnalysis.keyMeasurements?.length > 0 && (
          <div className="space-y-2 mb-4">
            {analysis.measurementAnalysis.keyMeasurements.map((measurement, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ArrowRight size={14} className="text-purple-400" />
                <span>{measurement}</span>
              </div>
            ))}
          </div>
        )}

        {/* Critical Measurements */}
        {analysis.measurementAnalysis.criticalMeasurements?.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1.5">
              <CircleAlert size={14} />
              Critical Measurements
            </h4>
            <div className="space-y-2">
              {analysis.measurementAnalysis.criticalMeasurements.map((measurement, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-yellow-300">
                  <span>•</span>
                  <span>{measurement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential Issues */}
        {analysis.measurementAnalysis.potentialIssues?.length > 0 && (
          <div className="space-y-2 bg-red-500/10 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Potential Fit Issues
            </h4>
            {analysis.measurementAnalysis.potentialIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                <span>•</span>
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}
      </FitCard>

      {/* Product Reviews Summary */}
      {analysis.reviews && (
        <FitCard title="Review Analysis" icon={Star}>
          <div className="space-y-3">
            {analysis.reviews.summary && (
              <p className="text-sm text-gray-300">{analysis.reviews.summary}</p>
            )}
            {analysis.reviews.fitInsights?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-400">Fit Insights from Reviews</h4>
                {analysis.reviews.fitInsights.map((insight, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-900/50 p-2 rounded-lg">
                    <span>•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FitCard>
      )}
    </div>
  );
};

export default ProductAnalysis;