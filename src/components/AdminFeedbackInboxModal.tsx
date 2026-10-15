import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, X, MessageSquare, RefreshCw, Filter, User } from 'lucide-react';

interface FeedbackItem {
  id: string;
  roomCode?: string;
  memberName: string;
  rating: number;
  category: string;
  comments: string;
  createdAt: number;
}

interface AdminFeedbackInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  leaderMemberId: string;
  isAuthorizedOrganizer?: boolean;
}

export const AdminFeedbackInboxModal: React.FC<AdminFeedbackInboxModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  leaderMemberId,
  isAuthorizedOrganizer = false,
}) => {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('all');

  const fetchFeedback = async () => {
    if (!roomCode) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'x-member-id': leaderMemberId,
      };
      if (isAuthorizedOrganizer) {
        headers['x-organizer-authorized'] = 'true';
      }

      const res = await fetch(`/api/rooms/${roomCode}/feedback?memberId=${encodeURIComponent(leaderMemberId)}`, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied: Only the verified room organizer has permission to view member feedback.');
        }
        throw new Error('Could not retrieve feedback log.');
      }
      const data = await res.json();
      setFeedbackList(data.feedback || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFeedback();
    }
  }, [isOpen, roomCode, leaderMemberId]);

  if (!isOpen) return null;

  const filtered = feedbackList.filter((fb) => {
    if (filterCat !== 'all' && fb.category !== filterCat) return false;
    return true;
  });

  const formatTime = (ts: number) => {
    try {
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Confidential Organizer Inbox</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Member Feedback Log ({feedbackList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confidential submissions visible exclusively to the verified room organizer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchFeedback}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Refresh feedback"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Filter Topic:</span>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="text-xs px-2.5 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="all">All Topics</option>
              <option value="Meeting Schedule & Time">Meeting Schedule &amp; Time</option>
              <option value="Location & Venues">Location &amp; Venues</option>
              <option value="Voting Experience">Voting Experience</option>
              <option value="Feature Suggestion">Feature Suggestion</option>
              <option value="General Feedback">General Feedback</option>
            </select>
          </div>

          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
            Showing {filtered.length} entry{filtered.length === 1 ? '' : 'ies'}
          </span>
        </div>

        {/* Feedback List Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
              {error}
            </div>
          )}

          {loading && feedbackList.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Loading private feedback records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">No Feedback Submitted Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When room participants submit their confidential feedback, it will appear directly here for your review.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {item.memberName[0] || 'A'}
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-slate-900">{item.memberName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatTime(item.createdAt)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        item.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="text-[11px] font-mono text-slate-600 ml-1">
                    {item.rating}/5
                  </span>
                </div>

                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed pt-1">
                  {item.comments}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
