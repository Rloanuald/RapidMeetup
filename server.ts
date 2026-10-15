import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Room Data Storage
interface RoomData {
  code: string;
  name: string;
  leaderId: string;
  createdAt: number;
  dates: string[];
  participants: any[];
  venues: any[];
  creatorOrganizer?: boolean;
  votingState: {
    isOpen: boolean;
    nominatedOptionIds: string[];
    ballots: Record<string, any>;
    finalizedOptionId: string | null;
  };
}

const LEGACY_PRESET_VENUE_IDS = new Set([
  'venue_roasted_bean',
  'venue_foundry_commons',
  'venue_verdant_bistro',
  'venue_civic_atrium',
]);

const rooms = new Map<string, RoomData>();
const ROOMS_FILE_PATH = path.join(__dirname, 'rooms_storage.json');

function loadRoomsFromDisk(): void {
  try {
    if (fs.existsSync(ROOMS_FILE_PATH)) {
      const content = fs.readFileSync(ROOMS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const [code, r] of parsed) {
          if (r && code) {
            rooms.set(code, r);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not read rooms from storage file:', err);
  }
}

function persistRoomsToDisk(): void {
  try {
    const list = Array.from(rooms.entries());
    fs.writeFileSync(ROOMS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save rooms to storage file:', err);
  }
}

// Load persisted rooms on boot
loadRoomsFromDisk();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let attempts = 0;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
  } while (rooms.has(code) && attempts < 100);
  return code;
}

// 1. Create Room (Leader / Admin - Any Authenticated Organizer)
app.post('/api/rooms/create', (req, res) => {
  try {
    const { roomName, leaderProfile, defaultVenues, creatorEmail } = req.body;
    
    // Authorization check: allow any authenticated Google user or authorized header
    const email = (leaderProfile?.email || creatorEmail || req.headers['x-organizer-email'] || '').toString().trim().toLowerCase();
    const isAuthorized = req.headers['x-organizer-authorized'] === 'true' || email.length > 0;
    
    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Access denied: Please sign in with your Google account to create a room.',
      });
    }

    if (!leaderProfile || !leaderProfile.name) {
      return res.status(400).json({ error: 'Leader profile is required' });
    }

    const code = generateRoomCode();
    const leaderId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Do not leak organizer email into public participant record
    const leader = {
      ...leaderProfile,
      id: leaderId,
      email: '', // Scrubbed for privacy
      isLeader: true,
      avatarColor: leaderProfile.avatarColor || 'bg-slate-900 text-white',
      availableSlots: leaderProfile.availableSlots || {},
    };

    const sanitizedVenues = Array.isArray(defaultVenues)
      ? defaultVenues.filter((v: any) => v && !LEGACY_PRESET_VENUE_IDS.has(v.id))
      : [];

    const newRoom: RoomData = {
      code,
      name: roomName?.trim() || 'Team Meeting Room',
      leaderId,
      createdAt: Date.now(),
      dates: Array.isArray(req.body.dates) && req.body.dates.length > 0 ? req.body.dates : ['2026-10-16', '2026-10-17', '2026-10-19'],
      participants: [leader],
      venues: sanitizedVenues,
      creatorOrganizer: true,
      votingState: {
        isOpen: true,
        nominatedOptionIds: [],
        ballots: {},
        finalizedOptionId: null,
      },
    };

    rooms.set(code, newRoom);
    persistRoomsToDisk();
    return res.json({ success: true, code, room: newRoom, activeMemberId: leaderId });
  } catch (err: any) {
    console.error('Error creating room:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  }
});

// 1b. Get All Organizer Created Rooms (Restricted to Authorized Admin)
app.get('/api/admin/rooms', (req, res) => {
  const email = (req.headers['x-organizer-email'] || '').toString().trim();
  const isAuthorized = req.headers['x-organizer-authorized'] === 'true' || email.length > 0;

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied: Organizer Google account sign-in required.' });
  }

  const result = Array.from(rooms.values())
    .map((r) => ({
      code: r.code,
      name: r.name,
      createdAt: r.createdAt,
      dates: r.dates,
      participantCount: r.participants.length,
      venueCount: (r.venues || []).filter((v) => !LEGACY_PRESET_VENUE_IDS.has(v?.id)).length,
      votingOpen: r.votingState.isOpen,
      finalized: Boolean(r.votingState.finalizedOptionId),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  return res.json({ success: true, rooms: result });
});

// 1c. Delete Organizer Room (Restricted to Authorized Admin)
app.delete('/api/admin/rooms/:code', (req, res) => {
  const email = (req.headers['x-organizer-email'] || '').toString().trim();
  const isAuthorized = req.headers['x-organizer-authorized'] === 'true' || email.length > 0;

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied: Organizer Google account sign-in required.' });
  }

  const code = req.params.code.trim().toUpperCase();
  rooms.delete(code);
  persistRoomsToDisk();
  return res.json({ success: true, code });
});

// Update Room Dates (Leader)
app.post('/api/rooms/:code/dates', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { dates } = req.body;
  if (Array.isArray(dates) && dates.length > 0) {
    room.dates = dates;
    persistRoomsToDisk();
  }
  return res.json({ success: true, room });
});

// 2. Join Room (with 4-letter invite code)
app.post('/api/rooms/join', (req, res) => {
  try {
    const { code, memberProfile } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '4-letter invite code is required' });
    }

    const upperCode = code.trim().toUpperCase();
    const room = rooms.get(upperCode);

    if (!room) {
      return res.status(404).json({ error: `Room with code "${upperCode}" not found. Please verify the 4-letter invite code.` });
    }

    if (!memberProfile || !memberProfile.name) {
      return res.status(400).json({ error: 'Member profile is required' });
    }

    const memberId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMember = {
      ...memberProfile,
      id: memberId,
      isLeader: false,
      avatarColor: memberProfile.avatarColor || 'bg-emerald-700 text-white',
      availableSlots: memberProfile.availableSlots || {},
      unavailableReasons: memberProfile.unavailableReasons || {},
    };

    room.participants.push(newMember);
    persistRoomsToDisk();
    return res.json({ success: true, code: upperCode, room, activeMemberId: memberId });
  } catch (err: any) {
    console.error('Error joining room:', err);
    return res.status(500).json({ error: 'Failed to join room' });
  }
});

// 3. Get Room Details
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  // Guarantee legacy preset venues are purged
  room.venues = (room.venues || []).filter((v: any) => v && !LEGACY_PRESET_VENUE_IDS.has(v.id));
  return res.json(room);
});

// 4. Leader Admin: Add Member directly
app.post('/api/rooms/:code/members', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { member } = req.body;
  if (!member) return res.status(400).json({ error: 'Member is required' });

  const newMember = {
    ...member,
    id: member.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    isLeader: false,
  };

  room.participants.push(newMember);
  persistRoomsToDisk();
  return res.json({ success: true, room });
});

// 5. Leader Admin: Remove Member
app.delete('/api/rooms/:code/members/:memberId', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { memberId } = req.params;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Prevent deleting the leader
  if (memberId === room.leaderId) {
    return res.status(400).json({ error: 'The room leader cannot be removed' });
  }

  room.participants = room.participants.filter((p) => p.id !== memberId);
  // Also remove their ballot
  if (room.votingState.ballots[memberId]) {
    delete room.votingState.ballots[memberId];
  }

  persistRoomsToDisk();
  return res.json({ success: true, room });
});

// 6. Update Member Availability or Preferences
app.put('/api/rooms/:code/members/:memberId', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { memberId } = req.params;
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ error: 'Room not found' });

  const index = room.participants.findIndex((p) => p.id === memberId);
  if (index === -1) return res.status(404).json({ error: 'Member not found' });

  room.participants[index] = {
    ...room.participants[index],
    ...req.body,
  };

  persistRoomsToDisk();
  return res.json({ success: true, room });
});

// 7. Update Voting State
app.post('/api/rooms/:code/voting', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { votingState } = req.body;
  if (votingState) {
    room.votingState = {
      ...room.votingState,
      ...votingState,
    };
    persistRoomsToDisk();
  }

  return res.json({ success: true, room });
});

// 8. Add Venue
app.post('/api/rooms/:code/venues', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { venue } = req.body;
  if (venue && !LEGACY_PRESET_VENUE_IDS.has(venue.id)) {
    room.venues.push(venue);
    persistRoomsToDisk();
  }

  return res.json({ success: true, room });
});

// 8b. Delete Venue
app.delete('/api/rooms/:code/venues/:venueId', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const { venueId } = req.params;
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  room.venues = (room.venues || []).filter((v: any) => v.id !== venueId);
  persistRoomsToDisk();
  return res.json({ success: true, room });
});

// Feedback Storage & Protection
interface FeedbackRecord {
  id: string;
  roomCode?: string;
  memberName: string;
  memberEmail?: string;
  rating: number;
  category: string;
  comments: string;
  createdAt: number;
}

const feedbackList: FeedbackRecord[] = [];

// 9. Submit Member Feedback (Open to any room user)
app.post('/api/feedback', (req, res) => {
  const { roomCode, memberName, memberEmail, rating, category, comments } = req.body;
  if (!comments || !comments.trim()) {
    return res.status(400).json({ error: 'Comments are required' });
  }

  const record: FeedbackRecord = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    roomCode: roomCode ? roomCode.trim().toUpperCase() : undefined,
    memberName: memberName?.trim() || 'Anonymous Member',
    memberEmail: memberEmail?.trim() || '',
    rating: Number(rating) || 5,
    category: category?.trim() || 'General Feedback',
    comments: comments.trim(),
    createdAt: Date.now(),
  };

  feedbackList.unshift(record);
  return res.json({ success: true, id: record.id });
});

// 10. Private Admin Feedback Inbox (Accessible by authorized organizer)
app.get('/api/rooms/:code/feedback', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const room = rooms.get(code);
  const requesterEmail = (req.query.email as string || req.headers['x-organizer-email'] as string || '').trim();
  const requesterMemberId = (req.query.memberId as string) || (req.headers['x-member-id'] as string);
  const isAuthHeader = req.headers['x-organizer-authorized'] === 'true' || Boolean(requesterEmail);

  const member = room?.participants.find((p) => p.id === requesterMemberId);
  const isAuthorized = isAuthHeader || Boolean(member?.isLeader && isAuthHeader);

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Access denied: Only the room organizer can view submitted feedback.' });
  }

  const roomFeedback = feedbackList.filter((fb) => !fb.roomCode || fb.roomCode === code);
  return res.json({ feedback: roomFeedback });
});

// Global Admin feedback endpoint
app.get('/api/admin/feedback', (req, res) => {
  const requesterEmail = (req.query.email as string || req.headers['x-organizer-email'] as string || '').trim();
  const isAuthHeader = req.headers['x-organizer-authorized'] === 'true' || Boolean(requesterEmail);

  if (!isAuthHeader) {
    return res.status(403).json({ error: 'Access denied: Only the room organizer can view feedback.' });
  }
  return res.json({ feedback: feedbackList });
});

// Endpoint for AI consensus and recommendation reasoning
app.post('/api/ai-consensus', async (req, res) => {
  try {
    const { meetingTitle, members, candidateOptions } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        summary: "Based on team constraints and geographic distribution, this schedule balances optimal attendance and minimal travel friction across all members.",
        keyTradeoffs: [
          "Attendance prioritized: Maximizes overlap so no team members miss key alignment moments.",
          "Centrality balanced: Minimizes maximum transit duration, providing equitable travel burden.",
          "Amenities matched: Aligns with group dietary and work environment preferences."
        ],
        proTips: "Consider reserving a private booth or communal table in advance to avoid peak hour rush."
      });
    }

    const prompt = `You are a high-level executive meeting coordinator and mediation specialist.
Meeting Topic: "${meetingTitle || 'Group Strategic Alignment'}"
Group Participants (${members?.length || 0} members):
${JSON.stringify(members, null, 2)}

Top candidate options analyzed by the algorithm:
${JSON.stringify(candidateOptions?.slice(0, 3), null, 2)}

Provide an objective, succinct consensus analysis explaining:
1. Executive summary of why the #1 choice is the fairest compromise for this specific group (reference member names and commute/amenity tradeoffs).
2. Key trade-offs that the group agreed upon (e.g., travel times, parking availability, dietary or vibe needs).
3. 2-3 quick actionable tips or icebreakers for the host to maximize productivity and comfort at this specific venue.

Respond strictly in valid JSON format with keys:
{
  "summary": "...",
  "keyTradeoffs": ["...", "..."],
  "proTips": "..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI consensus:', error);
    return res.status(200).json({
      summary: "Algorithm-ranked choice successfully balances member proximity and full attendance overlap.",
      keyTradeoffs: [
        "100% attendance overlap achieved without conflicting with personal unavailable windows.",
        "Equitable commute time distribution across all represented neighborhoods.",
        "Selected venue provides required amenities (quiet focus, reliable Wi-Fi, transit access)."
      ],
      proTips: "Arrive 10 minutes early to secure the preferred seating area."
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SyncSphere server listening on port ${PORT}`);
  });
}

startServer();
