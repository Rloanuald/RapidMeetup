import React, { useState } from 'react';
import { Star, MessageSquare, Check, X, ShieldAlert, Send } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
  defaultMemberName?: string;
  defaultEmail?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  defaultMemberName = '',
  defaultEmail = '',
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('Meeting Schedule & Time');
  const [comments, setComments] = useState('');
  const [name, setName] = useState(defaultMemberName);
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          memberName: name.trim() || 'Anonymous Member',
          rating,
          category,
          comments: comments.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback.');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setComments('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Feedback Submitted</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Thank you! Your feedback has been sent privately to the room organizer.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
                <span>Confidential Member Feedback</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">Share Your Feedback</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your response is private. Only the room leader has permission to view this feedback.
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                {error}
              </div>
            )}

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Overall Experience Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-slate-600 ml-2 font-mono tabular-nums">
                  {rating} of 5 stars
                </span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="Meeting Schedule & Time">Meeting Schedule &amp; Time Options</option>
                <option value="Location & Venues">Location &amp; Meetup Venues</option>
                <option value="Voting Experience">Voting &amp; Consensus Process</option>
                <option value="Feature Suggestion">Feature Suggestion</option>
                <option value="General Feedback">General Feedback / Other</option>
              </select>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Comments &amp; Suggestions
              </label>
              <textarea
                required
                rows={4}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share any thoughts, location suggestions, scheduling conflicts, or ideas..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              />
            </div>

            {/* Name (optional) */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
