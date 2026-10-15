export type CommuteMode = 'transit' | 'car' | 'bike' | 'walk';
export type SlotStatus = 'available' | 'preferred' | 'busy';

export interface Participant {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  commuteMode: CommuteMode;
  maxTravelTime: number; // minutes
  requiresParking: boolean;
  vibePreferences: string[];
  dietaryNeeds: string;
  availableSlots: Record<string, SlotStatus>;
  unavailableReasons?: Record<string, string>; // slotId -> optional conflict explanation
  isLeader?: boolean;
}

export type SlotPeriod = 'morning' | 'lunch' | 'afternoon' | 'evening';

export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD manually entered
  dayLabel: string; // e.g. "Fri"
  dateFormatted: string; // e.g. "Oct 24"
  period: SlotPeriod;
  periodLabel: string;
  timeLabel: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Venue {
  id: string;
  name: string;
  category: string;
  address: string;
  neighborhood: string;
  transitAccess: string;
  parkingInfo: string;
  hasDedicatedParking: boolean;
  noiseLevel: 'Quiet' | 'Moderate' | 'Lively';
  vibeTags: string[];
  priceLevel: '$' | '$$' | '$$$';
  rating: number;
  amenities: string[];
  avgCommuteEstimateByMode: Record<CommuteMode, number>;
  mapAccentColor: string;
}

export interface MemberCommuteItem {
  memberId: string;
  memberName: string;
  minutes: number;
  mode: CommuteMode;
  withinLimit: boolean;
  requiresParking: boolean;
}

export interface CandidateOption {
  id: string;
  slotId: string;
  venueId: string;
  slot: TimeSlot;
  venue: Venue;
  overallScore: number; // 0 to 100
  attendanceCount: number;
  totalMembers: number;
  availableMembers: string[];
  preferredMembers: string[];
  busyMembers: string[];
  avgCommuteMinutes: number;
  maxCommuteMinutes: number;
  commuteDetails: MemberCommuteItem[];
  parkingSatisfied: boolean;
  attendanceScore: number;
  commuteScore: number;
  amenityScore: number;
  highlights: string[];
  potentialIssues: string[];
}

export interface VoteBallot {
  memberId: string;
  rankedOptionIds: string[]; // 1st, 2nd, 3rd choice
  approvals: Record<string, 'yes' | 'no'>;
  timestamp: number;
}

export interface VotingState {
  isOpen: boolean;
  nominatedOptionIds: string[];
  ballots: Record<string, VoteBallot>;
  finalizedOptionId: string | null;
}

export interface Room {
  code: string; // 4-letter uppercase invitation code (e.g. "SYNC")
  name: string;
  leaderId: string;
  createdAt: number;
  dates: string[]; // Manually entered dates (YYYY-MM-DD)
  slots: TimeSlot[];
  participants: Participant[];
  venues: Venue[];
  votingState: VotingState;
}

export interface AdminRoomSummary {
  code: string;
  name: string;
  createdAt: number;
  dates: string[];
  participantCount: number;
  venueCount: number;
  votingOpen: boolean;
  finalized: boolean;
}

