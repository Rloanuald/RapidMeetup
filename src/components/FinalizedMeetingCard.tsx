import React, { useState } from 'react';
import { CandidateOption, Participant } from '../types';
import { generateIcsContent } from '../utils/scheduler';
import { CalendarCheck, MapPin, Train, Car, Users, Download, Share2, Copy, Check, RotateCcw } from 'lucide-react';

interface FinalizedMeetingCardProps {
  finalizedOption: CandidateOption;
  participants: Participant[];
  onReopenVoting: () => void;
}

export const FinalizedMeetingCard: React.FC<FinalizedMeetingCardProps> = ({
  finalizedOption,
  participants,
  onReopenVoting,
}) => {
  const [copied, setCopied] = useState(false);

  const meetingTitle = 'Q4 Product Strategy & Roadmap Offsite';

  // Export to standard .ics file
  const handleDownloadIcs = () => {
    const icsString = generateIcsContent(meetingTitle, finalizedOption, participants);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `meeting_${finalizedOption.slot.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Google Calendar web intent
  const handleOpenGoogleCalendar = () => {
    const startIso = `${finalizedOption.slot.date.replace(/-/g, '')}T${finalizedOption.slot.startTime.replace(':', '')}00`;
    const endIso = `${finalizedOption.slot.date.replace(/-/g, '')}T${finalizedOption.slot.endTime.replace(':', '')}00`;
    const details = encodeURIComponent(
      `Group Meeting: ${meetingTitle}\nVenue: ${finalizedOption.venue.name}\nTransit: ${finalizedOption.venue.transitAccess}\nParking: ${finalizedOption.venue.parkingInfo}\nAttendees: ${participants.map((p) => p.name).join(', ')}`
    );
    const location = encodeURIComponent(`${finalizedOption.venue.name}, ${finalizedOption.venue.address}`);
    const title = encodeURIComponent(meetingTitle);

    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy textual invite
  const handleCopyInvite = async () => {
    const text = [
      `📅 YOU'RE INVITED: ${meetingTitle}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🗓 Date: ${finalizedOption.slot.dayLabel}, ${finalizedOption.slot.dateFormatted} (2026)`,
      `⏰ Time: ${finalizedOption.slot.timeLabel}`,
      `📍 Venue: ${finalizedOption.venue.name}`,
      `🏢 Address: ${finalizedOption.venue.address}`,
      `🚇 Transit: ${finalizedOption.venue.transitAccess}`,
      `🚗 Parking: ${finalizedOption.venue.parkingInfo}`,
      `👥 Attendees (${participants.length}): ${participants.map((p) => p.name).join(', ')}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Finalized via SyncSphere Multi-Constraint Consensus.`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Confirmation Header */}
      <div className="bg-emerald-900 text-white rounded-lg p-6 shadow-sm relative overflow-hidden">
        {/* Subtle background vector grid */}
        <div
          className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_20px]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <CalendarCheck className="w-4 h-4 text-emerald-300" />
              <span>Consensus Locked & Confirmed</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {meetingTitle}
            </h2>
            <p className="text-xs text-emerald-100 font-normal">
              Finalized with unanimous team availability and verified commute accessibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadIcs}
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download .ICS
            </button>
            <button
              onClick={handleOpenGoogleCalendar}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1.5 border border-emerald-600"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Google Calendar
            </button>
            <button
              onClick={handleCopyInvite}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1.5 border border-emerald-600"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Date & Venue Specification */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Logistics & Coordinates
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/60">
              <div className="text-xs text-slate-500 font-medium">Scheduled Time Window</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {finalizedOption.slot.dayLabel}, {finalizedOption.slot.dateFormatted} &bull; {finalizedOption.slot.timeLabel}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Duration: 2 Hours (Midday Team Alignment)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/60 space-y-2">
              <div className="text-xs text-slate-500 font-medium">Venue & Address</div>
              <div className="text-base font-bold text-slate-900">
                {finalizedOption.venue.name}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{finalizedOption.venue.address}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Train className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-800">Transit Access: </strong>
                  {finalizedOption.venue.transitAccess}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Car className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-slate-800">Parking Info: </strong>
                  {finalizedOption.venue.parkingInfo}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Attendees & Individual Travel Cheat Sheet */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Confirmed Attendees ({participants.length})
            </div>
            <div className="text-xs font-semibold text-emerald-700">
              100% Confirmed
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {finalizedOption.commuteDetails.map((c) => {
              const participant = participants.find((p) => p.id === c.memberId);
              return (
                <div key={c.memberId} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${
                        participant?.avatarColor || 'bg-slate-700 text-white'
                      }`}
                    >
                      {c.memberName[0]}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{c.memberName}</div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        {c.mode} &bull; target &le; {participant?.maxTravelTime || 30}m
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono tabular-nums font-bold text-slate-900">
                      {c.minutes} mins
                    </div>
                    {c.requiresParking && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Parking Covered
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onReopenVoting}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reopen Voting Room
            </button>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              Average Travel: {finalizedOption.avgCommuteMinutes}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
