import { Participant, Venue } from '../types';

// Zero preset members - rooms start with only the leader who creates them!
export const INITIAL_PARTICIPANTS: Participant[] = [];

// Optional sample teammates that the leader can optionally invite/simulate with 1 click to test 5+ people group dynamics
export const SAMPLE_MEMBERS_FOR_DEMO: Participant[] = [
  {
    id: 'marcus_chen',
    name: 'Marcus Chen',
    role: 'Eng Manager',
    email: 'marcus.c@syncteam.io',
    avatarColor: 'bg-indigo-700 text-white',
    commuteMode: 'transit',
    maxTravelTime: 30,
    requiresParking: false,
    vibePreferences: ['High-Speed Wi-Fi', 'Spacious Seating', 'Power Outlets'],
    dietaryNeeds: 'No restrictions',
    availableSlots: {},
    isLeader: false,
  },
  {
    id: 'sarah_jenkins',
    name: 'Sarah Jenkins',
    role: 'Operations Lead',
    email: 'sarah.j@syncteam.io',
    avatarColor: 'bg-amber-700 text-white',
    commuteMode: 'car',
    maxTravelTime: 35,
    requiresParking: true,
    vibePreferences: ['Easy Parking', 'Covered Patio', 'Low Noise'],
    dietaryNeeds: 'Gluten-free menu items',
    availableSlots: {},
    isLeader: false,
  },
  {
    id: 'david_kim',
    name: 'David Kim',
    role: 'Data Scientist',
    email: 'david.k@syncteam.io',
    avatarColor: 'bg-cyan-700 text-white',
    commuteMode: 'transit',
    maxTravelTime: 30,
    requiresParking: false,
    vibePreferences: ['Library Lounge', 'Quiet & Focused', 'Power Outlets'],
    dietaryNeeds: 'Pescatarian',
    availableSlots: {},
    isLeader: false,
  },
  {
    id: 'amara_okafor',
    name: 'Amara Okafor',
    role: 'Product Marketing',
    email: 'amara.o@syncteam.io',
    avatarColor: 'bg-rose-700 text-white',
    commuteMode: 'transit',
    maxTravelTime: 25,
    requiresParking: false,
    vibePreferences: ['Artisanal Lunch', 'Creative Atmosphere', 'Natural Light'],
    dietaryNeeds: 'Dairy-free options',
    availableSlots: {},
    isLeader: false,
  },
  {
    id: 'liam_vance',
    name: 'Liam Vance',
    role: 'Solutions Architect',
    email: 'liam.v@syncteam.io',
    avatarColor: 'bg-slate-700 text-white',
    commuteMode: 'walk',
    maxTravelTime: 20,
    requiresParking: false,
    vibePreferences: ['Specialty Coffee', 'High-Speed Wi-Fi', 'Spacious Seating'],
    dietaryNeeds: 'None',
    availableSlots: {},
    isLeader: false,
  },
];

// Zero preset venues - rooms start with clean slate, venues are nominated by participants/organizers
export const INITIAL_VENUES: Venue[] = [];

// Known IDs of removed preset venues, used to automatically clean legacy session state
export const LEGACY_PRESET_VENUE_IDS = new Set([
  'venue_roasted_bean',
  'venue_foundry_commons',
  'venue_verdant_bistro',
  'venue_civic_atrium',
]);

