import React, { useState } from 'react';
import { CalendarCheck, Vote, Sparkles, Copy, Check, Crown, LogOut, MessageSquare, ShieldCheck, FolderKanban } from 'lucide-react';

interface HeaderProps {
  activeTab: 'availability' | 'suggestions' | 'venues' | 'voting' | 'finalized';
  setActiveTab: (tab: 'availability' | 'suggestions' | 'venues' | 'voting' | 'finalized') => void;
  votingActive: boolean;
  isFinalized: boolean;
  participantCount: number;
  roomCode: string;
  roomName: string;
  isLeader: boolean;
  isOrganizerAuthorized?: boolean;
  onLeaveRoom: () => void;
  onOpenFeedbackModal: () => void;
  onOpenAdminFeedbackModal: () => void;
  onOpenOrganizerRooms?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  votingActive,
  isFinalized,
  participantCount,
  roomCode,
  roomName,
  isLeader,
  isOrganizerAuthorized,
  onLeaveRoom,
  onOpenFeedbackModal,
  onOpenAdminFeedbackModal,
  onOpenOrganizerRooms,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      const inviteUrl = `https://taemeetup.ai.studio/?room=${roomCode}`;
      await navigator.clipboard.writeText(
        `Join our SyncSphere meeting room "${roomName}"! Use 4-letter invite code: ${roomCode} or open: ${inviteUrl}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const canViewAdminInbox = isLeader || isOrganizerAuthorized;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark with room context */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
              SyncSphere
            </span>

            {/* Room Invite Code Badge */}
            <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 px-2.5 py-1 rounded-md transition-colors">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Room:</span>
              <span className="font-mono font-bold text-xs tracking-wider text-slate-900">
                {roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-slate-500 hover:text-slate-900 transition-colors ml-0.5 p-0.5"
                title="Copy 4-letter invite code & link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              </button>
            </div>

            {isLeader && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                <Crown className="w-3 h-3 text-amber-600" />
                Verified Host
              </span>
            )}
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <button
              onClick={() => setActiveTab('availability')}
              className={`whitespace-nowrap transition-colors py-1 relative ${
                activeTab === 'availability'
                  ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Availability ({participantCount})
            </button>
            <button
              onClick={() => setActiveTab('suggestions')}
              className={`whitespace-nowrap transition-colors py-1 relative ${
                activeTab === 'suggestions'
                  ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suggested Options
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              className={`whitespace-nowrap transition-colors py-1 relative ${
                activeTab === 'venues'
                  ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Meetup Venues
            </button>
            <button
              onClick={() => setActiveTab('voting')}
              className={`whitespace-nowrap transition-colors py-1 relative ${
                activeTab === 'voting'
                  ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Voting Room {votingActive && !isFinalized ? '(Live)' : ''}
            </button>
            {isFinalized && (
              <button
                onClick={() => setActiveTab('finalized')}
                className={`whitespace-nowrap transition-colors py-1 relative ${
                  activeTab === 'finalized'
                    ? 'text-slate-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Confirmed Plan
              </button>
            )}
          </nav>

          {/* Zone 3: 1 primary action + Feedback controls + Exit Room */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Feedback button (for all users) */}
            <button
              onClick={onOpenFeedbackModal}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              title="Submit confidential feedback"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Feedback</span>
            </button>

            {/* Admin-only Feedback Inbox (Privately visible to authorized organizer) */}
            {canViewAdminInbox && (
              <>
                {onOpenOrganizerRooms && (
                  <button
                    onClick={onOpenOrganizerRooms}
                    className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors"
                    title="View all rooms created by Organizer"
                  >
                    <FolderKanban className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">My Rooms</span>
                  </button>
                )}

                <button
                  onClick={onOpenAdminFeedbackModal}
                  className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors"
                  title="Confidential Organizer Feedback Inbox"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Organizer Inbox</span>
                </button>
              </>
            )}

            {isFinalized ? (
              <button
                onClick={() => setActiveTab('finalized')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                View Plan
              </button>
            ) : votingActive ? (
              <button
                onClick={() => setActiveTab('voting')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Vote className="w-3.5 h-3.5" />
                Voting Room
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('suggestions')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                View Suggestions
              </button>
            )}

            <button
              onClick={onLeaveRoom}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Leave Room"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex border-t border-slate-100 overflow-x-auto px-4 py-2 gap-2 text-xs font-medium text-slate-600">
        <button
          onClick={() => setActiveTab('availability')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'availability' ? 'bg-slate-900 text-white' : 'bg-slate-50'
          }`}
        >
          Availability ({participantCount})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'suggestions' ? 'bg-slate-900 text-white' : 'bg-slate-50'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setActiveTab('venues')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'venues' ? 'bg-slate-900 text-white' : 'bg-slate-50'
          }`}
        >
          Venues
        </button>
        <button
          onClick={() => setActiveTab('voting')}
          className={`px-3 py-1.5 rounded whitespace-nowrap ${
            activeTab === 'voting' ? 'bg-slate-900 text-white' : 'bg-slate-50'
          }`}
        >
          Voting
        </button>
        {isFinalized && (
          <button
            onClick={() => setActiveTab('finalized')}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${
              activeTab === 'finalized' ? 'bg-emerald-700 text-white' : 'bg-slate-50'
            }`}
          >
            Confirmed
          </button>
        )}
      </div>
    </header>
  );
};
