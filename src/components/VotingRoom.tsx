import React, { useState } from 'react';
import { CandidateOption, Participant, VoteBallot, VotingState } from '../types';
import { computeVoteResults, VoteTally } from '../utils/scheduler';
import { Vote, CheckCircle, Trophy, Users, Star, ArrowUp, RefreshCw, ThumbsUp, ThumbsDown, Lock } from 'lucide-react';

interface VotingRoomProps {
  options: CandidateOption[];
  participants: Participant[];
  activeParticipantId: string;
  votingState: VotingState;
  onCastVote: (ballot: VoteBallot) => void;
  onSimulateAllVotes: () => void;
  onFinalizeDecision: (optionId: string) => void;
  onResetVotes: () => void;
}

export const VotingRoom: React.FC<VotingRoomProps> = ({
  options,
  participants,
  activeParticipantId,
  votingState,
  onCastVote,
  onSimulateAllVotes,
  onFinalizeDecision,
  onResetVotes,
}) => {
  const activeParticipant = participants.find((p) => p.id === activeParticipantId) || participants[0];

  // Candidates up for voting
  const nominatedOptions = options.filter((opt) =>
    votingState.nominatedOptionIds.includes(opt.id)
  );

  // Existing ballot for active participant
  const existingBallot = votingState.ballots[activeParticipant.id];

  const [rank1, setRank1] = useState<string>(
    existingBallot?.rankedOptionIds[0] || nominatedOptions[0]?.id || ''
  );
  const [rank2, setRank2] = useState<string>(
    existingBallot?.rankedOptionIds[1] || nominatedOptions[1]?.id || ''
  );
  const [rank3, setRank3] = useState<string>(
    existingBallot?.rankedOptionIds[2] || nominatedOptions[2]?.id || ''
  );

  const [approvals, setApprovals] = useState<Record<string, 'yes' | 'no'>>(
    existingBallot?.approvals ||
      nominatedOptions.reduce((acc, opt) => ({ ...acc, [opt.id]: 'yes' }), {})
  );

  // Compute live tallies
  const tallies = computeVoteResults(
    votingState.nominatedOptionIds,
    votingState.ballots,
    participants.length
  );

  // Sort candidates by Borda Score descending
  const sortedByVotes = [...nominatedOptions].sort((a, b) => {
    const tallyA = tallies[a.id]?.bordaScore || 0;
    const tallyB = tallies[b.id]?.bordaScore || 0;
    if (tallyB !== tallyA) return tallyB - tallyA;
    return (tallies[b.id]?.approvalsCount || 0) - (tallies[a.id]?.approvalsCount || 0);
  });

  const frontrunner = sortedByVotes[0];
  const frontrunnerTally = frontrunner ? tallies[frontrunner.id] : null;

  const totalBallots = Object.keys(votingState.ballots).length;
  const allVoted = totalBallots >= participants.length;

  const handleBallotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ranked: string[] = [];
    if (rank1) ranked.push(rank1);
    if (rank2 && rank2 !== rank1) ranked.push(rank2);
    if (rank3 && rank3 !== rank1 && rank3 !== rank2) ranked.push(rank3);

    const ballot: VoteBallot = {
      memberId: activeParticipant.id,
      rankedOptionIds: ranked,
      approvals,
      timestamp: Date.now(),
    };

    onCastVote(ballot);
  };

  const toggleApproval = (optId: string) => {
    setApprovals((prev) => ({
      ...prev,
      [optId]: prev[optId] === 'yes' ? 'no' : 'yes',
    }));
  };

  if (nominatedOptions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center max-w-lg mx-auto space-y-4">
        <Vote className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">No Options Nominated Yet</h3>
        <p className="text-xs text-slate-500">
          Return to the Suggested Options tab and nominate top candidates to launch the team voting process.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Voting Status */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Vote className="w-3.5 h-3.5" />
            <span>Consensus Decision Room</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Team Ballot & Final Selection Process
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Ranked-choice points: 1st Place = 3 pts &bull; 2nd Place = 2 pts &bull; 3rd Place = 1 pt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!allVoted && (
            <button
              onClick={onSimulateAllVotes}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Simulate Remaining Member Votes
            </button>
          )}

          {frontrunner && totalBallots > 0 && (
            <button
              onClick={() => onFinalizeDecision(frontrunner.id)}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize Winner: {frontrunner.venue.name.split(' ')[0]}
            </button>
          )}
        </div>
      </div>

      {/* Voter Progress Strip */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span>
              Voting Progress ({totalBallots} of {participants.length} submitted)
            </span>
          </div>
          <button
            onClick={onResetVotes}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-normal"
          >
            Reset All Ballots
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {participants.map((p) => {
            const hasVoted = Boolean(votingState.ballots[p.id]);
            const isCurrent = p.id === activeParticipant.id;

            return (
              <div
                key={p.id}
                className={`p-2 rounded text-xs border flex items-center justify-between ${
                  hasVoted
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ${p.avatarColor}`}>
                    {p.name[0]}
                  </span>
                  <span className="truncate font-medium">{p.name.split(' ')[0]}</span>
                </div>

                {hasVoted ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="text-[10px] text-slate-400">Pending</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Voting Ballot on Left, Live Tally on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Participant's Ballot Form */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Your Ballot
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Cast Vote as {activeParticipant.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your 1st, 2nd, and 3rd choices among the nominated options.
            </p>
          </div>

          <form onSubmit={handleBallotSubmit} className="space-y-4">
            {/* 1st Choice */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center">
                  1
                </span>
                <span>1st Choice (3 Points)</span>
              </label>
              <select
                value={rank1}
                onChange={(e) => setRank1(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">Select your #1 option</option>
                {nominatedOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.slot.dayLabel} {opt.slot.timeLabel} @ {opt.venue.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2nd Choice */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>2nd Choice (2 Points)</span>
              </label>
              <select
                value={rank2}
                onChange={(e) => setRank2(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">Select your #2 option</option>
                {nominatedOptions
                  .filter((opt) => opt.id !== rank1)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.slot.dayLabel} {opt.slot.timeLabel} @ {opt.venue.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* 3rd Choice */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
                <span>3rd Choice (1 Point)</span>
              </label>
              <select
                value={rank3}
                onChange={(e) => setRank3(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              >
                <option value="">Select your #3 option</option>
                {nominatedOptions
                  .filter((opt) => opt.id !== rank1 && opt.id !== rank2)
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.slot.dayLabel} {opt.slot.timeLabel} @ {opt.venue.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Quick Approval Checkboxes */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                Approval Check (Can you make it?):
              </div>
              <div className="space-y-1.5">
                {nominatedOptions.map((opt) => {
                  const isApproved = approvals[opt.id] !== 'no';
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleApproval(opt.id)}
                      className={`p-2 rounded text-xs flex items-center justify-between cursor-pointer border transition-colors ${
                        isApproved
                          ? 'bg-slate-50 border-slate-200 text-slate-800'
                          : 'bg-red-50/50 border-red-200 text-red-700'
                      }`}
                    >
                      <span className="truncate pr-2 font-medium">
                        {opt.slot.dayLabel} &bull; {opt.venue.name.split(' ')[0]}
                      </span>
                      <span className="text-[11px] font-semibold shrink-0">
                        {isApproved ? '✓ Acceptable' : '✕ Veto / Cannot'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              {existingBallot ? 'Update Submitted Ballot' : 'Submit My Ballot'}
            </button>
          </form>
        </div>

        {/* Right Column: Live Voting Results & Leaderboard */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            <span>Live Tally & Consensus Standings</span>
            <span>{totalBallots} Ballots Counted</span>
          </div>

          {/* Frontrunner Callout */}
          {frontrunner && frontrunnerTally && totalBallots > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Current Frontrunner ({frontrunnerTally.bordaScore} Points)
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {frontrunner.venue.name}
                  </h4>
                  <p className="text-xs text-slate-600 font-mono tabular-nums">
                    {frontrunner.slot.dayLabel}, {frontrunner.slot.dateFormatted} &bull; {frontrunner.slot.timeLabel}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onFinalizeDecision(frontrunner.id)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shrink-0"
              >
                Lock In Choice
              </button>
            </div>
          )}

          {/* Ranked List of Nominees with Live Point Bars */}
          <div className="space-y-3">
            {sortedByVotes.map((option, idx) => {
              const tally = tallies[option.id] || {
                bordaScore: 0,
                firstPlaceVotes: 0,
                secondPlaceVotes: 0,
                thirdPlaceVotes: 0,
                approvalPercentage: 0,
                votedMemberIds: [],
              };

              // Max possible points if all voted #1
              const maxPossiblePoints = Math.max(1, participants.length * 3);
              const pointPercentage = Math.round((tally.bordaScore / maxPossiblePoints) * 100);

              return (
                <div
                  key={option.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {option.venue.name}
                        </h4>
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {option.slot.dayLabel}, {option.slot.dateFormatted} &bull; {option.slot.timeLabel}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                        {tally.bordaScore} <span className="text-xs font-normal text-slate-500">pts</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {tally.firstPlaceVotes} first-place votes
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>Borda Consensus Score</span>
                      <span className="font-mono tabular-nums font-semibold">
                        {pointPercentage}% of max
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx === 0 ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                        style={{ width: `${pointPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom Stats & Voter Avatars */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Approval: <strong className="text-slate-900 font-mono tabular-nums">{tally.approvalPercentage}%</strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="tabular-nums">Avg commute: {option.avgCommuteMinutes}m</span>
                    </div>

                    <button
                      onClick={() => onFinalizeDecision(option.id)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
                    >
                      Select this option
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
