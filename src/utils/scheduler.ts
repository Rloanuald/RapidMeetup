import { CandidateOption, MemberCommuteItem, Participant, TimeSlot, Venue, VoteBallot } from '../types';

export interface FormattedVoteOption {
  optionNumber: number;
  id: string;
  venueName: string;
  dateTime: string;
  location: string;
  attendance: string;
  whyItFits: string;
  notesCaveats: string;
  isFallbackStage1: boolean;
  rawOption: CandidateOption;
}

export interface DeadlockReport {
  isDeadlock: boolean;
  message: string;
  bottlenecks: string[];
  suggestedAction: string;
}

export function calculateCandidateOptions(
  slots: TimeSlot[],
  venues: Venue[],
  participants: Participant[]
): CandidateOption[] {
  const options: CandidateOption[] = [];
  const totalMembers = participants.length;

  if (totalMembers === 0 || slots.length === 0) return [];

  slots.forEach((slot) => {
    // Determine participant attendance for this slot
    const availableMembers: string[] = [];
    const preferredMembers: string[] = [];
    const busyMembers: string[] = [];

    participants.forEach((p) => {
      const status = p.availableSlots[slot.id] || 'busy';
      if (status === 'preferred') {
        availableMembers.push(p.name);
        preferredMembers.push(p.name);
      } else if (status === 'available') {
        availableMembers.push(p.name);
      } else {
        busyMembers.push(p.name);
      }
    });

    const attendanceCount = availableMembers.length;
    const attendanceRatio = attendanceCount / totalMembers;

    // Evaluate against each candidate venue
    venues.forEach((venue) => {
      const commuteDetails: MemberCommuteItem[] = [];
      let totalMinutes = 0;
      let maxCommute = 0;
      let exceededLimitCount = 0;
      let parkingIssue = false;

      participants.forEach((p) => {
        // Commute time based on individual transit mode to venue
        const minutes = venue.avgCommuteEstimateByMode?.[p.commuteMode] ?? 18;
        const withinLimit = minutes <= p.maxTravelTime;
        if (!withinLimit) exceededLimitCount++;

        if (p.requiresParking && !venue.hasDedicatedParking) {
          parkingIssue = true;
        }

        totalMinutes += minutes;
        if (minutes > maxCommute) maxCommute = minutes;

        commuteDetails.push({
          memberId: p.id,
          memberName: p.name,
          minutes,
          mode: p.commuteMode,
          withinLimit,
          requiresParking: p.requiresParking,
        });
      });

      const avgCommute = Math.round((totalMinutes / totalMembers) * 10) / 10;

      // 1. Attendance Score (0 - 50 points)
      let attendanceScore = 0;
      if (attendanceRatio === 1) {
        attendanceScore = 45 + (preferredMembers.length / totalMembers) * 5; // up to 50
      } else if (attendanceRatio >= 0.8) {
        attendanceScore = 32 + (preferredMembers.length / totalMembers) * 3;
      } else if (attendanceRatio >= 0.65) {
        attendanceScore = 18;
      } else {
        attendanceScore = Math.round(attendanceRatio * 20);
      }

      // 2. Commute & Proximity Score (0 - 30 points)
      let commuteScore = 30;
      if (avgCommute > 15) {
        commuteScore -= (avgCommute - 15) * 0.8;
      }
      commuteScore -= exceededLimitCount * 5;
      if (parkingIssue) {
        commuteScore -= 6;
      }
      commuteScore = Math.max(0, Math.min(30, Math.round(commuteScore)));

      // 3. Amenity & Vibe Match Score (0 - 20 points)
      let matchedVibesCount = 0;
      const allDesiredVibes = new Set<string>();
      participants.forEach((p) => {
        p.vibePreferences.forEach((v) => allDesiredVibes.add(v));
      });

      allDesiredVibes.forEach((desired) => {
        if (venue.vibeTags.some((tag) => tag.toLowerCase() === desired.toLowerCase())) {
          matchedVibesCount++;
        }
      });

      const totalDesired = Math.max(1, allDesiredVibes.size);
      const amenityScore = Math.round(Math.min(20, (matchedVibesCount / totalDesired) * 20));

      const overallScore = Math.min(100, Math.max(10, attendanceScore + commuteScore + amenityScore));

      const highlights: string[] = [];
      const potentialIssues: string[] = [];

      if (attendanceRatio === 1) {
        highlights.push(`100% group availability (${attendanceCount}/${totalMembers} members)`);
      } else {
        highlights.push(`${attendanceCount} of ${totalMembers} members available`);
      }

      if (preferredMembers.length >= 3) {
        highlights.push(`${preferredMembers.length} members mark this as their preferred slot`);
      }

      if (avgCommute <= 18) {
        highlights.push(`Low average travel time (${avgCommute} mins)`);
      }

      if (venue.hasDedicatedParking) {
        highlights.push('Guaranteed parking for driving participants');
      }

      if (busyMembers.length > 0) {
        potentialIssues.push(`Unavailable: ${busyMembers.join(', ')}`);
      }

      if (exceededLimitCount > 0) {
        const exceededNames = commuteDetails
          .filter((c) => !c.withinLimit)
          .map((c) => `${c.memberName} (${c.minutes}m)`)
          .join(', ');
        potentialIssues.push(`Commute exceeds preferred travel limit: ${exceededNames}`);
      }

      if (parkingIssue) {
        potentialIssues.push('Street parking only — may inconvenience driving members');
      }

      const id = `${slot.id}__${venue.id}`;

      options.push({
        id,
        slotId: slot.id,
        venueId: venue.id,
        slot,
        venue,
        overallScore,
        attendanceCount,
        totalMembers,
        availableMembers,
        preferredMembers,
        busyMembers,
        avgCommuteMinutes: avgCommute,
        maxCommuteMinutes: maxCommute,
        commuteDetails,
        parkingSatisfied: !parkingIssue,
        attendanceScore,
        commuteScore,
        amenityScore,
        highlights,
        potentialIssues,
      });
    });
  });

  return options.sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    if (b.attendanceCount !== a.attendanceCount) {
      return b.attendanceCount - a.attendanceCount;
    }
    return a.avgCommuteMinutes - b.avgCommuteMinutes;
  });
}

// Top 3 Ranked Options with Fallback Hierarchy & Formatted Report
export function evaluateTop3AndDeadlock(
  allOptions: CandidateOption[],
  participants: Participant[]
): {
  topOptions: FormattedVoteOption[];
  deadlockReport: DeadlockReport | null;
  formattedMarkdownReport: string;
} {
  const total = participants.length;
  if (total === 0 || allOptions.length === 0) {
    return {
      topOptions: [],
      deadlockReport: null,
      formattedMarkdownReport: 'Awaiting participants and schedule data to evaluate options.',
    };
  }

  // 1. Strict mathematical overlap (N of N available)
  const fullMatchOptions = allOptions.filter((opt) => opt.attendanceCount === total);

  // 2. Fallback Stage 1: Constraint relaxation (N-1 near-miss slots)
  const nearMissOptions = allOptions.filter(
    (opt) => opt.attendanceCount === Math.max(1, total - 1)
  );

  const selectedOptions: CandidateOption[] = [];
  const relaxedFlags: Record<string, string | null> = {};

  // Fill up to 3 options: first from fullMatch, then fallback to Stage 1 near-miss
  fullMatchOptions.forEach((opt) => {
    if (selectedOptions.length < 3) {
      selectedOptions.push(opt);
      relaxedFlags[opt.id] = null;
    }
  });

  if (selectedOptions.length < 3) {
    nearMissOptions.forEach((opt) => {
      if (selectedOptions.length < 3 && !selectedOptions.some((s) => s.id === opt.id)) {
        selectedOptions.push(opt);
        const missing = opt.busyMembers.join(', ') || '1 participant';
        relaxedFlags[opt.id] = `[Partial match: ${missing} unavailable]`;
      }
    });
  }

  // Stage 2: Replanning Deadlock if 0 options exist even after fallback
  if (selectedOptions.length === 0) {
    const bottlenecks: string[] = [];

    // Analyze participant conflict pairs
    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const p1 = participants[i];
        const p2 = participants[j];

        // Check if p1 and p2 have any mutually free slots
        const commonSlots = Object.keys(p1.availableSlots).filter(
          (slotId) =>
            p1.availableSlots[slotId] !== 'busy' &&
            p2.availableSlots[slotId] &&
            p2.availableSlots[slotId] !== 'busy'
        );

        if (commonSlots.length === 0) {
          bottlenecks.push(`${p1.name} and ${p2.name} have zero overlapping available time windows`);
        }
      }
    }

    const deadlockReport: DeadlockReport = {
      isDeadlock: true,
      message: 'Scheduling Deadlock: Zero viable meeting times intersect group availability.',
      bottlenecks:
        bottlenecks.length > 0
          ? bottlenecks.slice(0, 3)
          : ['No overlapping time windows found where at least N-1 participants are available.'],
      suggestedAction:
        'Please prompt participants with zero overlapping free slots to submit additional availability windows or propose alternative dates.',
    };

    const formattedMarkdown = [
      '### Stage 2 Deadlock Report & Specific Input Request',
      '',
      `**Status**: ${deadlockReport.message}`,
      '',
      '**Identified Bottlenecks**:',
      ...deadlockReport.bottlenecks.map((b) => ` * ${b}`),
      '',
      `**Recommended Organizer Action**: ${deadlockReport.suggestedAction}`,
    ].join('\n');

    return {
      topOptions: [],
      deadlockReport,
      formattedMarkdownReport: formattedMarkdown,
    };
  }

  // Build the formatted Top 3 options
  const formattedTopOptions: FormattedVoteOption[] = selectedOptions.map((opt, idx) => {
    const isFull = opt.attendanceCount === total;
    const missing = opt.busyMembers.join(', ');
    const attendanceStr = isFull
      ? `Full Match (${opt.attendanceCount}/${total})`
      : `Partial Match (${opt.attendanceCount}/${total} with ${missing} unavailable)`;

    const whyFitParts: string[] = [];
    if (isFull) whyFitParts.push('overlaps all member schedules');
    else whyFitParts.push(`overlaps ${opt.attendanceCount}/${total} members (near-miss)`);

    whyFitParts.push(`~${opt.avgCommuteMinutes}m average transit`);
    if (opt.venue.hasDedicatedParking) whyFitParts.push('dedicated on-site parking for drivers');
    if (opt.venue.noiseLevel === 'Quiet') whyFitParts.push('quiet focused acoustics');

    const caveat = relaxedFlags[opt.id] || (opt.potentialIssues[0] ?? 'None');

    return {
      optionNumber: idx + 1,
      id: opt.id,
      venueName: opt.venue.name,
      dateTime: `${opt.slot.dayLabel}, ${opt.slot.dateFormatted} | ${opt.slot.timeLabel}`,
      location: `${opt.venue.neighborhood} / ${opt.venue.address}`,
      attendance: attendanceStr,
      whyItFits: whyFitParts.join(', '),
      notesCaveats: caveat,
      isFallbackStage1: !isFull,
      rawOption: opt,
    };
  });

  const markdownLines: string[] = ['### Proposed Options for Group Vote', ''];

  formattedTopOptions.forEach((opt) => {
    markdownLines.push(`**Option ${opt.optionNumber}: ${opt.venueName}**`);
    markdownLines.push(` * **Date & Time**: ${opt.dateTime}`);
    markdownLines.push(` * **Location**: ${opt.location}`);
    markdownLines.push(` * **Attendance**: ${opt.attendance}`);
    markdownLines.push(` * **Why it fits**: ${opt.whyItFits}`);
    markdownLines.push(` * **Notes/Caveats**: ${opt.notesCaveats}`);
    markdownLines.push('');
  });

  return {
    topOptions: formattedTopOptions,
    deadlockReport: null,
    formattedMarkdownReport: markdownLines.join('\n'),
  };
}

export interface VoteTally {
  optionId: string;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
  thirdPlaceVotes: number;
  bordaScore: number;
  approvalsCount: number;
  approvalPercentage: number;
  votedMemberIds: string[];
}

export function computeVoteResults(
  nominatedOptionIds: string[],
  ballots: Record<string, VoteBallot>,
  totalMembers: number
): Record<string, VoteTally> {
  const tallies: Record<string, VoteTally> = {};

  nominatedOptionIds.forEach((id) => {
    tallies[id] = {
      optionId: id,
      firstPlaceVotes: 0,
      secondPlaceVotes: 0,
      thirdPlaceVotes: 0,
      bordaScore: 0,
      approvalsCount: 0,
      approvalPercentage: 0,
      votedMemberIds: [],
    };
  });

  Object.values(ballots).forEach((ballot) => {
    const [first, second, third] = ballot.rankedOptionIds;

    if (first && tallies[first]) {
      tallies[first].firstPlaceVotes += 1;
      tallies[first].bordaScore += 3;
      if (!tallies[first].votedMemberIds.includes(ballot.memberId)) {
        tallies[first].votedMemberIds.push(ballot.memberId);
      }
    }

    if (second && tallies[second]) {
      tallies[second].secondPlaceVotes += 1;
      tallies[second].bordaScore += 2;
      if (!tallies[second].votedMemberIds.includes(ballot.memberId)) {
        tallies[second].votedMemberIds.push(ballot.memberId);
      }
    }

    if (third && tallies[third]) {
      tallies[third].thirdPlaceVotes += 1;
      tallies[third].bordaScore += 1;
      if (!tallies[third].votedMemberIds.includes(ballot.memberId)) {
        tallies[third].votedMemberIds.push(ballot.memberId);
      }
    }

    if (ballot.approvals) {
      Object.entries(ballot.approvals).forEach(([optId, status]) => {
        if (status === 'yes' && tallies[optId]) {
          tallies[optId].approvalsCount += 1;
        }
      });
    }
  });

  const ballotsCount = Math.max(1, Object.keys(ballots).length);
  Object.values(tallies).forEach((tally) => {
    tally.approvalPercentage = Math.round((tally.approvalsCount / ballotsCount) * 100);
  });

  return tallies;
}

export function generateIcsContent(
  meetingTitle: string,
  option: CandidateOption,
  participants: Participant[]
): string {
  const dateStr = option.slot.date.replace(/-/g, '');
  const startHours = option.slot.startTime.replace(':', '');
  const endHours = option.slot.endTime.replace(':', '');

  const dtStart = `${dateStr}T${startHours}00`;
  const dtEnd = `${dateStr}T${endHours}00`;

  const attendeeList = participants
    .map((p) => `ATTENDEE;CN=${p.name};ROLE=REQ-PARTICIPANT:mailto:${p.email}`)
    .join('\r\n');

  const description = [
    `Group Meeting: ${meetingTitle}`,
    `Venue: ${option.venue.name}`,
    `Address: ${option.venue.address}`,
    `Transit Access: ${option.venue.transitAccess}`,
    `Parking: ${option.venue.parkingInfo}`,
    `Attendees: ${participants.map((p) => p.name).join(', ')}`,
    '',
    'Scheduled via SyncSphere Group Meeting & Location Matcher.',
  ].join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SyncSphere//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:syncsphere-${option.id}-${Date.now()}@syncteam.io`,
    `DTSTAMP:${dateStr}T120000Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${meetingTitle} @ ${option.venue.name}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${option.venue.name}, ${option.venue.address}`,
    'STATUS:CONFIRMED',
    attendeeList,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
