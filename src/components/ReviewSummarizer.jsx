import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Loader2, AlertTriangle } from 'lucide-react';
import { Card } from './ui/theme';
import { Alert, AlertDescription } from './ui/alert';

const ReviewSummarizer = ({ reviews, className = '' }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (reviews?.length > 0) {
      summarizeReviews(reviews);
    }
  }, [reviews]);

  const summarizeReviews = async (reviews) => {
    try {
      setLoading(true);

      const reviewText = reviews
        .map(review => `${review.rating ? `Rating: ${review.rating}` : ''}\n${review.text}`)
        .join('\n\n');

      const summarizer = await ai.summarizer.create();

      const prompt = `Analyze these product reviews and provide:
1. Overall sentiment and recommendation
2. Key points about fit and sizing
3. Most mentioned pros and cons
4. Notable quality or durability feedback
5. Any sizing or fit trends

Reviews:
${reviewText}

Format the summary with clear sections using bullet points.`;

      const result = await summarizer.summarize(prompt);

      // Parse sections
      const structured = parseSummary(result);
      setSummary(structured);

      summarizer.destroy();
    } catch (error) {
      console.error('Error summarizing reviews:', error);
      setError('Failed to summarize reviews');
    } finally {
      setLoading(false);
    }
  };

  const parseSummary = (text) => {
    const sections = text.split('\n\n');
    const structured = {
      overall: '',
      fit: [],
      pros: [],
      cons: [],
      quality: ''
    };

    sections.forEach(section => {
      const clean = section.toLowerCase().trim();
      if (clean.includes('overall') || clean.includes('sentiment')) {
        structured.overall = section.split(':')[1]?.trim() || section;
      } else if (clean.includes('fit') || clean.includes('sizing')) {
        structured.fit = extractBulletPoints(section);
      } else if (clean.includes('pros')) {
        structured.pros = extractBulletPoints(section);
      } else if (clean.includes('cons')) {
        structured.cons = extractBulletPoints(section);
      } else if (clean.includes('quality')) {
        structured.quality = section.split(':')[1]?.trim() || section;
      }
    });

    return structured;
  };

  const extractBulletPoints = (text) => {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => !line.toLowerCase().includes(':'));
  };

  if (loading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-4 text-gray-100">
          <Star className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-medium">Review Summary</h3>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-sm text-gray-300">Analyzing reviews...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!summary) return null;

  return (
    <Card className={`p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-100">
        <Star className="w-5 h-5 text-yellow-400" />
        <h3 className="text-lg font-medium">Review Summary</h3>
      </div>

      {/* Overall Summary */}
      {summary.overall && (
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-100">{summary.overall}</p>
        </div>
      )}

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pros */}
        {summary.pros.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-400 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" />
              Pros
            </h4>
            <ul className="space-y-1">
              {summary.pros.map((pro, index) => (
                <li key={index} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-green-500">•</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cons */}
        {summary.cons.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-400 flex items-center gap-2">
              <ThumbsDown className="w-4 h-4" />
              Cons
            </h4>
            <ul className="space-y-1">
              {summary.cons.map((con, index) => (
                <li key={index} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-red-500">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Fit & Sizing */}
      {summary.fit.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Fit & Sizing
          </h4>
          <ul className="space-y-1">
            {summary.fit.map((point, index) => (
              <li key={index} className="text-sm text-gray-300 flex gap-2">
                <span className="text-purple-500">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quality */}
      {summary.quality && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-300 mb-1">Quality & Durability</h4>
          <p className="text-sm text-gray-300">{summary.quality}</p>
        </div>
      )}
    </Card>
  );
};

export default ReviewSummarizer;