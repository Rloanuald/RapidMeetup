import React, { useState, useMemo } from 'react';
import { CandidateOption, Participant } from '../types';
import { evaluateTop3AndDeadlock } from '../utils/scheduler';
import { Sparkles, CheckCircle, AlertTriangle, Users, Vote, Copy, Check, ShieldAlert, ArrowRight } from 'lucide-react';

interface SuggestedOptionsProps {
  options: CandidateOption[];
  participants: Participant[];
  nominatedOptionIds: string[];
  onToggleNominateOption: (optionId: string) => void;
  onStartVotingWithTopOptions: (count: number) => void;
  onGoToVoting: () => void;
  votingActive: boolean;
  venuesCount?: number;
  onGoToVenues?: () => void;
}

export const SuggestedOptions: React.FC<SuggestedOptionsProps> = ({
  options,
  participants,
  nominatedOptionIds,
  onToggleNominateOption,
  onStartVotingWithTopOptions,
  onGoToVoting,
  votingActive,
  venuesCount,
  onGoToVenues,
}) => {
  const [filterMinAttendance, setFilterMinAttendance] = useState<'all' | 'full'>('all');
  const [copiedReport, setCopiedReport] = useState(false);

  // Run the Meetup Organizer Assistant Constraint Evaluation & Fallback Engine
  const { topOptions, deadlockReport, formattedMarkdownReport } = useMemo(() => {
    return evaluateTop3AndDeadlock(options, participants);
  }, [options, participants]);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(() => {
    return topOptions[0]?.id || options[0]?.id || null;
  });

  const activeOption = options.find((opt) => opt.id === selectedOptionId) || options[0];

  const handleCopyMarkdownReport = async () => {
    try {
      await navigator.clipboard.writeText(formattedMarkdownReport);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleLaunchVote = () => {
    if (topOptions.length > 0) {
      onStartVotingWithTopOptions(Math.min(3, topOptions.length));
    } else {
      onGoToVoting();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            <span>Meetup Organizer Assistant</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Top Ranked Options for Group Vote
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Evaluates strict time overlap, venue feasibility, and location fairness with Stage 1 & Stage 2 fallback handling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyMarkdownReport}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Copied' : 'Copy Formatted Report'}</span>
          </button>

          {topOptions.length > 0 && (
            <button
              onClick={handleLaunchVote}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Vote className="w-3.5 h-3.5" />
              <span>{votingActive ? 'Go to Active Voting' : 'Launch Group Vote (Top 3)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Zero Venues Guidance Banner */}
      {venuesCount === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900">
              No Venues Nominated Yet
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Preset venues have been cleared. To calculate top-ranked schedule and venue pairings, propose candidate meetup locations in the Venues tab.
            </p>
          </div>
          {onGoToVenues && (
            <button
              onClick={onGoToVenues}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              <span>Go to Venues Tab</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : deadlockReport ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Stage 2 Deadlock Report &amp; Replanning Request</span>
          </div>
          <p className="text-xs text-red-800 font-medium leading-relaxed">
            {deadlockReport.message}
          </p>

          <div className="space-y-1.5 pt-2 border-t border-red-200 text-xs">
            <div className="font-semibold text-red-900">Identified Bottlenecks:</div>
            {deadlockReport.bottlenecks.map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-red-700">
                <span>&bull;</span>
                <span>{b}</span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white/80 rounded border border-red-200 text-xs text-slate-800">
            <strong>Recommended Organizer Action: </strong>
            {deadlockReport.suggestedAction}
          </div>
        </div>
      ) : null}

      {/* Proposed Options for Group Vote Cards (Exact user specification) */}
      {topOptions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Proposed Options for Group Vote ({topOptions.length} Viable Choices)</span>
            <span className="text-slate-400 font-normal">Ranked by Availability &amp; Centrality</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topOptions.map((opt) => {
              const isSelected = activeOption?.id === opt.id;
              const isNominated = nominatedOptionIds.includes(opt.id);

              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`bg-white rounded-lg border p-4 flex flex-col justify-between transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-slate-900 shadow-sm ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-white">
                        Option {opt.optionNumber}
                      </span>

                      {opt.isFallbackStage1 ? (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Stage 1 Relaxed
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          Strict Match
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {opt.venueName}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {opt.dateTime}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                      <div>
                        <strong className="text-slate-800">Location: </strong>
                        <span>{opt.location}</span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Attendance: </strong>
                        <span className={opt.isFallbackStage1 ? 'text-amber-800 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {opt.attendance}
                        </span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Why it fits: </strong>
                        <span>{opt.whyItFits}</span>
                      </div>
                      <div>
                        <strong className="text-slate-800">Notes/Caveats: </strong>
                        <span className={opt.notesCaveats !== 'None' ? 'text-amber-800' : 'text-slate-500'}>
                          {opt.notesCaveats}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {opt.rawOption.overallScore}% Match
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleNominateOption(opt.id);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                        isNominated
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {isNominated ? '✓ In Ballot' : '+ Add to Ballot'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Formatted Markdown Preview Drawer / Inspector */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Generated Group Vote Proposal (Markdown)
            </span>
          </div>
          <button
            onClick={handleCopyMarkdownReport}
            className="text-xs text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 transition-colors"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Text</span>
          </button>
        </div>

        <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {formattedMarkdownReport}
        </pre>
      </div>
    </div>
  );
};
