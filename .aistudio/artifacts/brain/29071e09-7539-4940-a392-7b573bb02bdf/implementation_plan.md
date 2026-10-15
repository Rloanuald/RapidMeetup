# RapidMeetup: Location Nomination & Anonymous Blind Voting Architecture

RapidMeetup transforms group scheduling into a friction-free experience where any room member can nominate meetup venues and participate in anonymous 1–5 star blind voting, combining optimal availability windows with community-chosen locations under unified Google-authenticated management.

***

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product specifications were confirmed during interactive clarification and will guide the implementation:

- **Confirmed Blind Voting Model**: Blind voting displays aggregated star ratings and total rating counts anonymously, completely obscuring which member cast individual scores to avoid peer pressure or bias.
- **Confirmed Ballot Format**: Room members rate each nominated location on an intuitive 1 to 5 star rating scale (`★ 1` to `★ 5`), calculating continuous weighted averages and distribution curves.
- **Confirmed Conclusion Action**: Concluding or closing location voting keeps the top-ranked venues prominently spotlighted and accessible for flexible team selection, rather than forcibly locking down a single rigid venue.
- **Confirmed Brand Identity**: Complete transition from legacy "SyncSphere" branding to "RapidMeetup" across page titles, OpenGraph metadata, navigation wordmarks, and invite links formatted as `https://taemeetup.ai.studio/?room=CODE`.
- **Confirmed Open Admin Policy**: Any signed-in Google account is recognized as an authorized organizer/admin, unlocking room creation, full room inventory management, and private feedback monitoring.

***

## 1. Overview & Core Concept

- **What It Does**: RapidMeetup enables teams, clubs, and workgroups to propose meetup dates, submit personal unavailability with conflict notes, nominate real-world meeting venues, and reach consensus through anonymous blind star voting.
- **Target Audience / Persona**: Team organizers, cross-functional project leads, social coordinators, and colleagues scheduling meetings across varying locations, schedules, and commute modes.
- **Key Value**: Eliminates endless back-and-forth chat threads and social hesitation by giving members an equal voice in nominating places and voting blindly, instantly highlighting the highest-rated options alongside optimal group time slots.

***

## 2. User Experience & Visual Design

### Key User Flows

1. **Brand & Welcome Landing**:
   - Clean top navigation showcasing the **RapidMeetup** wordmark and live room status.
   - Quick invite code copy button generating the exact shareable template:
     `Join our RapidMeetup meeting room "[Room Name]"! Use 4-letter invite code: [CODE] or open: https://taemeetup.ai.studio/?room=[CODE]`
   - Direct Google Sign-In button permitting any authenticated user to create new rooms or manage all existing rooms they initiated.

2. **Location Nomination Flow**:
   - Any room member can open the **Nominate Meetup Location** modal or button within the Venue Directory and Location Voting tabs.
   - Member inputs venue title, neighborhood/address, category (e.g., Cafe, Coworking, Library, Restaurant, Park), parking access, and vibe tags.
   - Upon submission, the venue is added to the room's venue pool and automatically enrolled into the active blind voting ballot.

3. **Anonymous Blind Star Voting Flow**:
   - Members navigate to the **Location Voting** section where nominated places are displayed with details, amenities, and commute estimates.
   - Each member rates nominated venues from 1 to 5 stars via an interactive star selector with real-time tactile feedback.
   - The interface maintains strict anonymity:
     - Each member sees their own recorded ratings.
     - The aggregate scoreboard displays overall star averages (e.g. `4.7 / 5.0`) and total ratings cast without revealing individual voter names or specific ballots.
   - Organizer or members can conclude voting, transitioning the view to a **Top Ranked Venues** showcase that highlights 1st, 2nd, and 3rd place locations with their key amenities and travel convenience.

4. **Unavailable Time Slots & Conflict Breakdown**:
   - Seamlessly integrated with the availability matrix, allowing members to mark unavailable slots with clear conflict reasons viewable across the room roster.

### Visual Identity & Theme

- **Aesthetic Direction**: Crisp, modern SaaS productivity aesthetic adhering to strict anti-slop principles: zero artificial gradients, no nested pill badges, no synthetic metrics, and clean whitespace margins.
- **Color Discipline (60-30-10)**:
  - *60% Neutral Canvas*: Crisp slate background (`bg-slate-50`) and pristine white panel surfaces (`bg-white`).
  - *30% Structural Elements*: Hairline borders (`border-slate-200`), neutral slate text (`text-slate-900`, `text-slate-600`), and structured segmented tab bars (`bg-slate-100`).
  - *10% High-Intent Accents*: Deep indigo/slate primary CTAs (`bg-slate-900 text-white`), amber accents for verified host actions, and warm gold star ratings (`text-amber-400 fill-amber-400`).
- **Typography & Tabular Discipline**:
  - Primary UI & Display: `Plus Jakarta Sans` for clean, professional legibility.
  - Data, Room Codes & Star Scores: `JetBrains Mono` and `font-mono tabular-nums` for precise alignment of ratings, counts, and invite codes.
- **Interactive Feedback**:
  - Smooth star hover states and click confirmations.
  - Non-intrusive toast notifications when copying invite links or saving ballots.
  - Zero-latency optimistic UI updates with background server persistence.

***

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Star-Rating Blind Voting with Anonymous Aggregate Display
- **Chosen Approach**: Members rate nominated venues between 1 and 5 stars. The server stores ballots linked to member IDs to prevent duplicate votes per person, but public room responses aggregate scores into anonymous averages and total vote counts.
- **Why**: Star ratings provide more expressive signal than a binary yes/no, accommodating nuanced member preferences without creating divisive ties. Anonymity prevents social bias (e.g., voting for a manager's pick).
- **Alternatives Considered**: Ranked-choice voting (complex UX for non-technical users) or public vote cards (introduces social conformity and pressure).

### Decision 2: Flexible Top-Ranked Venue Visibility upon Conclusion
- **Chosen Approach**: When voting closes, the room displays the ranked list of top-voted venues with their average star scores and commute highlights, leaving flexible coordination open rather than restricting the room to a single fixed venue.
- **Why**: Teams often prefer having a primary choice with an immediate backup option in case of venue capacity, weather, or unexpected reservation limits.

### Decision 3: Universal Google Account Organizer Privileges
- **Chosen Approach**: Any user who signs in with a Google account is granted organizer status to create rooms, access their personal created rooms inventory, and administer room settings.
- **Why**: Fulfills the user's explicit request to remove the hardcoded single-email restriction (`lhong23@gmail.com`) while preserving secure authenticated session gating.

***

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RapidMeetup Client                             │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │   Header & Invites   │  │  Venue & Nomination  │  │ Blind Star Voting │  │
│  │  - RapidMeetup Brand │  │  - Member Nominations│  │  - 1-5 Star Input │  │
│  │  - taemeetup URL     │  │  - Amenity Details   │  │  - Anonymous Stats│  │
│  │  - Admin Hub Modal   │  │  - Real-time Sync    │  │  - Top Venues View│  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬─────────┘  │
│             │                         │                        │            │
│             └─────────────────────────┼────────────────────────┘            │
│                                       ▼                                     │
│                       State Orchestrator (App.tsx)                          │
│                                       │                                     │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ REST / JSON
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Express Application Server                         │
│                                                                             │
│  ┌────────────────────┐   ┌─────────────────────┐   ┌────────────────────┐  │
│  │ Room & Nomination  │   │ Star Voting Engine  │   │ Organizer Auth     │  │
│  │ - POST /venues     │   │ - POST /vote-star   │   │ - Any Google User  │  │
│  │ - Location Storage │   │ - Anonymous Tally   │   │ - GET /admin/rooms │  │
│  └──────────┬─────────┘   └──────────┬──────────┘   └──────────┬─────────┘  │
│             │                        │                         │            │
│             └────────────────────────┴─────────────────────────┘            │
│                                       │                                     │
│                                       ▼                                     │
│                       File-Backed JSON Persistence                          │
│                         (./data/rooms_storage.json)                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Model Enhancements

```typescript
// Extended Venue with nomination metadata
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
  nominatedByMemberId?: string;
  nominatedByMemberName?: string;
}

// Location Star Voting State
export interface VenueVotingState {
  isOpen: boolean;
  votes: Record<string, Record<string, number>>; // venueId -> { memberId: stars (1-5) }
  concluded: boolean;
}
```

### Interactive Component & State Mapping

1. **`Header.tsx`**: Updated to "RapidMeetup" branding with invite clipboard logic using `https://taemeetup.ai.studio/?room=${roomCode}` and active room switching.
2. **`VenueDirectory.tsx`**: Adds "Nominate Location" button accessible to all participants, with quick input for venue title, address, category, parking, and transit details.
3. **`VotingRoom.tsx`**: Provides the dedicated **Location Star Voting** interface:
   - Interactive 1–5 star rating buttons per nominated venue.
   - Anonymous tally calculations (mean star rating, total ballots cast, star breakdown).
   - "Conclude Voting" toggle that switches to a persistent top-ranked podium view showcasing 1st, 2nd, and 3rd place venues.
4. **`RoomEntry.tsx`**: Brand updates to RapidMeetup; allows any signed-in Google account to administer rooms and review past hosted sessions.
5. **`index.html` & `metadata.json`**: Sync metadata titles and descriptions to "RapidMeetup: Group Meeting & Location Matcher".
