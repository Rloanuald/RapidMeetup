import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Participant, TimeSlot, Venue, SlotStatus, VoteBallot, VotingState, Room } from './types';
import { INITIAL_VENUES, SAMPLE_MEMBERS_FOR_DEMO, LEGACY_PRESET_VENUE_IDS } from './data/initialData';
import { calculateCandidateOptions } from './utils/scheduler';
import { generateSlotsForDates } from './utils/dateSlots';
import { Header } from './components/Header';
import { ParticipantSwitcher } from './components/ParticipantSwitcher';
import { AvailabilityMatrix } from './components/AvailabilityMatrix';
import { SuggestedOptions } from './components/SuggestedOptions';
import { VenueDirectory } from './components/VenueDirectory';
import { VotingRoom } from './components/VotingRoom';
import { FinalizedMeetingCard } from './components/FinalizedMeetingCard';
import { RoomEntry } from './components/RoomEntry';
import { FeedbackModal } from './components/FeedbackModal';
import { AdminFeedbackInboxModal } from './components/AdminFeedbackInboxModal';
import { OrganizerRoomsModal } from './components/OrganizerRoomsModal';
import { useOrganizerAuth } from './hooks/useOrganizerAuth';

export default function App() {
  const organizerAuth = useOrganizerAuth();
  const [isOrganizerRoomsModalOpen, setIsOrganizerRoomsModalOpen] = useState(false);

  // Check URL query param for room code (e.g. ?room=ABCD)
  const initialUrlCode = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || '';
    } catch {
      return '';
    }
  }, []);

  const [currentRoom, setCurrentRoom] = useState<Room | null>(() => {
    try {
      const saved = localStorage.getItem('syncsphere_active_room');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.venues)) {
        // Immediately remove any legacy preset venues from stored active session
        parsed.venues = parsed.venues.filter((v: any) => v && !LEGACY_PRESET_VENUE_IDS.has(v.id));
        try {
          localStorage.setItem('syncsphere_active_room', JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [myMemberId, setMyMemberId] = useState<string>(() => {
    try {
      return localStorage.getItem('syncsphere_my_member_id') || '';
    } catch {
      return '';
    }
  });

  const [activeParticipantId, setActiveParticipantId] = useState<string>(() => {
    return myMemberId || currentRoom?.participants[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'availability' | 'suggestions' | 'venues' | 'voting' | 'finalized'>('availability');
  const [entryError, setEntryError] = useState<string | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isAdminFeedbackModalOpen, setIsAdminFeedbackModalOpen] = useState(false);

  // Compute dynamic slots based on manually entered dates in room
  const roomDates = useMemo(() => {
    return currentRoom?.dates && currentRoom.dates.length > 0
      ? currentRoom.dates
      : ['2026-10-16', '2026-10-17', '2026-10-19'];
  }, [currentRoom?.dates]);

  const slots: TimeSlot[] = useMemo(() => {
    return generateSlotsForDates(roomDates);
  }, [roomDates]);

  const participants = currentRoom?.participants || [];
  const venues = currentRoom?.venues || INITIAL_VENUES;
  const votingState = currentRoom?.votingState || {
    isOpen: true,
    nominatedOptionIds: [],
    ballots: {},
    finalizedOptionId: null,
  };

  const activeParticipant = participants.find((p) => p.id === activeParticipantId);
  const myParticipant = participants.find((p) => p.id === myMemberId);

  // Strict Host / Organizer verification:
  // Must be authorized via Google account AND match room leaderId
  const isLeader = Boolean(
    currentRoom &&
    organizerAuth.isAuthorized &&
    (myMemberId ? myMemberId === currentRoom.leaderId : false)
  );

  // Participant selection handler: blocks non-leaders from selecting or assuming the locked organizer profile
  const handleSelectParticipant = (id: string) => {
    const target = participants.find((p) => p.id === id);
    if (target?.isLeader && !isLeader) {
      return; // Organizer profile is strictly locked for normal participants
    }
    setActiveParticipantId(id);
  };

  // Enforce that normal members cannot have the organizer set as active participant
  useEffect(() => {
    if (!isLeader && currentRoom) {
      const activeP = participants.find((p) => p.id === activeParticipantId);
      if (activeP?.isLeader || !activeP) {
        if (myMemberId && participants.some((p) => p.id === myMemberId)) {
          setActiveParticipantId(myMemberId);
        } else {
          const nonLeader = participants.find((p) => !p.isLeader);
          if (nonLeader) setActiveParticipantId(nonLeader.id);
        }
      }
    }
  }, [isLeader, currentRoom, activeParticipantId, myMemberId, participants]);

  // Synchronize localStorage
  useEffect(() => {
    try {
      if (currentRoom) {
        localStorage.setItem('syncsphere_active_room', JSON.stringify(currentRoom));
      } else {
        localStorage.removeItem('syncsphere_active_room');
      }
    } catch {
      // ignore
    }
  }, [currentRoom]);

  useEffect(() => {
    try {
      if (myMemberId) {
        localStorage.setItem('syncsphere_my_member_id', myMemberId);
      } else {
        localStorage.removeItem('syncsphere_my_member_id');
      }
    } catch {
      // ignore
    }
  }, [myMemberId]);

  // Keep activeParticipantId in sync with valid participant without assigning normal members to leader
  useEffect(() => {
    if (participants.length > 0 && !participants.some((p) => p.id === activeParticipantId)) {
      if (isLeader) {
        setActiveParticipantId(currentRoom?.leaderId || participants[0].id);
      } else {
        const myP = myMemberId ? participants.find((p) => p.id === myMemberId) : null;
        if (myP) {
          setActiveParticipantId(myP.id);
        } else {
          const nonLeader = participants.find((p) => !p.isLeader);
          setActiveParticipantId(nonLeader ? nonLeader.id : participants[0].id);
        }
      }
    }
  }, [participants, activeParticipantId, isLeader, myMemberId, currentRoom?.leaderId]);

  // Periodic polling for room state when in an active room
  const pollRoom = useCallback(async () => {
    if (!currentRoom?.code) return;
    try {
      const res = await fetch(`/api/rooms/${currentRoom.code}`);
      if (res.ok) {
        const remoteRoom: Room = await res.json();
        const cleanedRemote: Room = {
          ...remoteRoom,
          venues: (remoteRoom.venues || []).filter((v: any) => v && !LEGACY_PRESET_VENUE_IDS.has(v.id)),
        };

        setCurrentRoom((prev) => {
          if (!prev) return cleanedRemote;
          // Check if remote state changed
          if (
            prev.participants.length !== cleanedRemote.participants.length ||
            (prev.venues?.length || 0) !== (cleanedRemote.venues?.length || 0) ||
            prev.dates?.length !== cleanedRemote.dates?.length ||
            prev.votingState.finalizedOptionId !== cleanedRemote.votingState.finalizedOptionId ||
            Object.keys(prev.votingState.ballots).length !== Object.keys(cleanedRemote.votingState.ballots).length
          ) {
            return cleanedRemote;
          }
          return prev;
        });
      }
    } catch {
      // fallback smoothly to local state
    }
  }, [currentRoom?.code]);

  useEffect(() => {
    if (!currentRoom?.code) return;
    const interval = setInterval(pollRoom, 3500);
    return () => clearInterval(interval);
  }, [pollRoom, currentRoom?.code]);

  // Compute all ranked candidate options dynamically
  const candidateOptions = useMemo(() => {
    return calculateCandidateOptions(slots, venues, participants);
  }, [slots, venues, participants]);

  // Nominated options for voting
  const nominatedOptionIds = votingState.nominatedOptionIds || [];

  // Room Creation (Leader & Admin - Restricted to Authorized Google Account)
  const handleCreateRoom = async (
    roomName: string,
    dates: string[],
    leaderProfile: Partial<Participant>,
    organizerToken?: string | null
  ) => {
    setEntryError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (organizerAuth.isAuthorized) {
        headers['x-organizer-authorized'] = 'true';
      }
      if (organizerToken) {
        headers['Authorization'] = `Bearer ${organizerToken}`;
      }

      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomName,
          dates,
          leaderProfile: {
            ...leaderProfile,
            name: leaderProfile.name || organizerAuth.displayName || 'Event Host',
            email: '', // Never expose email address
          },
          defaultVenues: INITIAL_VENUES,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create room');
      }

      const data = await res.json();
      setCurrentRoom(data.room);
      setMyMemberId(data.activeMemberId);
      setActiveParticipantId(data.activeMemberId);

      // Update URL query string
      try {
        const newUrl = `${window.location.pathname}?room=${data.code}`;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setEntryError(err.message || 'Could not create room.');
    }
  };

  // Join Room (Member enters 4-letter code)
  const handleJoinRoom = async (code: string, memberProfile: Partial<Participant>) => {
    setEntryError(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          memberProfile,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invalid 4-letter invite code.');
      }

      const data = await res.json();
      setCurrentRoom(data.room);
      setMyMemberId(data.activeMemberId);
      setActiveParticipantId(data.activeMemberId);

      try {
        const newUrl = `${window.location.pathname}?room=${data.code}`;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setEntryError(err.message || 'Room not found. Check the 4-letter invite code.');
    }
  };

  // Open Room Directly (for Organizer Room List or Quick Switcher)
  const handleOpenRoom = async (code: string) => {
    setEntryError(null);
    try {
      const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}`);
      if (!res.ok) {
        throw new Error('Room not found or no longer available.');
      }
      const data: Room = await res.json();
      const cleanedRoom: Room = {
        ...data,
        venues: (data.venues || []).filter((v: any) => v && !LEGACY_PRESET_VENUE_IDS.has(v.id)),
      };
      setCurrentRoom(cleanedRoom);

      const leader = cleanedRoom.participants.find((p) => p.isLeader) || cleanedRoom.participants[0];
      const memberId = organizerAuth.isAuthorized && leader ? leader.id : (myMemberId || leader?.id || '');
      setMyMemberId(memberId);
      setActiveParticipantId(memberId);

      try {
        const newUrl = `${window.location.pathname}?room=${cleanedRoom.code}`;
        window.history.replaceState(null, '', newUrl);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setEntryError(err.message || 'Could not open room.');
    }
  };

  // Manage Dates (Leader Admin)
  const handleAddDate = async (newDateIso: string) => {
    if (!currentRoom) return;
    const currentDates = currentRoom.dates || [];
    if (currentDates.includes(newDateIso)) return;
    const nextDates = [...currentDates, newDateIso].sort();

    setCurrentRoom((prev) => (prev ? { ...prev, dates: nextDates } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: nextDates }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveDate = async (dateIso: string) => {
    if (!currentRoom || !currentRoom.dates || currentRoom.dates.length <= 1) return;
    const nextDates = currentRoom.dates.filter((d) => d !== dateIso);

    setCurrentRoom((prev) => (prev ? { ...prev, dates: nextDates } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: nextDates }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Demo Helper: Creates a sample 5+ member room
  const handleQuickDemo = async () => {
    setEntryError(null);
    try {
      const demoDates = ['2026-10-16', '2026-10-17', '2026-10-19'];
      const leaderProfile: Partial<Participant> = {
        name: organizerAuth.displayName || 'Event Host',
        role: 'Team Lead & Organizer',
        email: '',
        avatarColor: 'bg-emerald-700 text-white',
        commuteMode: 'transit',
        maxTravelTime: 25,
        requiresParking: false,
        vibePreferences: ['Specialty Coffee', 'Quiet & Focused', 'Natural Light'],
        dietaryNeeds: 'Oat milk, vegetarian options',
        availableSlots: {},
      };

      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-authorized': 'true',
        },
        body: JSON.stringify({
          roomName: 'Q4 Product Offsite & Roadmap',
          dates: demoDates,
          leaderProfile,
          defaultVenues: INITIAL_VENUES,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedSlots = generateSlotsForDates(demoDates);

        // Prepopulate leader availability for demo
        const leaderSlots: Record<string, SlotStatus> = {};
        generatedSlots.forEach((s) => {
          if (s.period === 'lunch') leaderSlots[s.id] = 'preferred';
          else if (s.period === 'morning') leaderSlots[s.id] = 'available';
        });

        await fetch(`/api/rooms/${data.code}/members/${data.activeMemberId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ availableSlots: leaderSlots }),
        });

        // Add 4 sample teammates with overlapping slots
        for (const sample of SAMPLE_MEMBERS_FOR_DEMO.slice(0, 4)) {
          const sampleSlots: Record<string, SlotStatus> = {};
          generatedSlots.forEach((s) => {
            if (s.period === 'lunch') sampleSlots[s.id] = 'preferred';
            else if (s.period === 'afternoon') sampleSlots[s.id] = 'available';
          });

          await fetch(`/api/rooms/${data.code}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member: {
                ...sample,
                availableSlots: sampleSlots,
              },
            }),
          });
        }

        // Fetch refreshed room
        const roomRes = await fetch(`/api/rooms/${data.code}`);
        const freshRoom: Room = await roomRes.json();

        // Nominate top 3 options
        const initialOpts = calculateCandidateOptions(generatedSlots, freshRoom.venues, freshRoom.participants);
        const top3Ids = initialOpts.slice(0, 3).map((o) => o.id);

        freshRoom.votingState = {
          isOpen: true,
          nominatedOptionIds: top3Ids,
          ballots: {},
          finalizedOptionId: null,
        };

        setCurrentRoom(freshRoom);
        setMyMemberId(data.activeMemberId);
        setActiveParticipantId(data.activeMemberId);

        try {
          const newUrl = `${window.location.pathname}?room=${data.code}`;
          window.history.replaceState(null, '', newUrl);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setEntryError(err.message || 'Demo generation failed.');
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setMyMemberId('');
    setActiveParticipantId('');
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // ignore
    }
  };

  // Leader Admin: Add Member
  const handleAddParticipant = async (newParticipant: Participant) => {
    if (!currentRoom) return;
    const updatedParticipants = [...participants, newParticipant];
    setCurrentRoom((prev) => (prev ? { ...prev, participants: updatedParticipants } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member: newParticipant }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Leader Admin: Remove Member
  const handleRemoveParticipant = async (memberId: string) => {
    if (!currentRoom) return;

    const updatedParticipants = participants.filter((p) => p.id !== memberId);
    const updatedBallots = { ...votingState.ballots };
    delete updatedBallots[memberId];

    setCurrentRoom((prev) =>
      prev
        ? {
            ...prev,
            participants: updatedParticipants,
            votingState: {
              ...prev.votingState,
              ballots: updatedBallots,
            },
          }
        : null
    );

    if (activeParticipantId === memberId && updatedParticipants.length > 0) {
      setActiveParticipantId(updatedParticipants[0].id);
    }

    try {
      await fetch(`/api/rooms/${currentRoom.code}/members/${memberId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Leader Admin: Quick add 4 sample teammates if testing 5+ group
  const handleAddSampleTeammates = async () => {
    if (!currentRoom) return;

    const existingNames = new Set(participants.map((p) => p.name.toLowerCase()));
    const toAdd = SAMPLE_MEMBERS_FOR_DEMO.filter((s) => !existingNames.has(s.name.toLowerCase()));

    for (const member of toAdd) {
      const memberSlots: Record<string, SlotStatus> = {};
      slots.forEach((s) => {
        if (s.period === 'lunch') memberSlots[s.id] = 'preferred';
        else memberSlots[s.id] = 'available';
      });

      await handleAddParticipant({
        ...member,
        availableSlots: memberSlots,
      });
    }
  };

  // Update Member Preferences
  const handleUpdateParticipant = async (updated: Participant) => {
    if (!currentRoom) return;
    const updatedParticipants = participants.map((p) => (p.id === updated.id ? updated : p));
    setCurrentRoom((prev) => (prev ? { ...prev, participants: updatedParticipants } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/members/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Update Slot Status
  const handleUpdateSlotStatus = async (
    participantId: string,
    slotId: string,
    status: SlotStatus,
    reason?: string
  ) => {
    if (!currentRoom) return;
    if (!isLeader && participantId !== myMemberId) return;

    const targetParticipant = participants.find((p) => p.id === participantId);
    if (!targetParticipant) return;

    const updatedSlots = {
      ...targetParticipant.availableSlots,
      [slotId]: status,
    };

    const updatedReasons = {
      ...(targetParticipant.unavailableReasons || {}),
    };

    if (status === 'busy' && reason && reason.trim()) {
      updatedReasons[slotId] = reason.trim();
    } else if (status !== 'busy') {
      delete updatedReasons[slotId];
    }

    const updatedParticipant = {
      ...targetParticipant,
      availableSlots: updatedSlots,
      unavailableReasons: updatedReasons,
    };

    const updatedParticipants = participants.map((p) =>
      p.id === participantId ? updatedParticipant : p
    );

    setCurrentRoom((prev) => (prev ? { ...prev, participants: updatedParticipants } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/members/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableSlots: updatedSlots,
          unavailableReasons: updatedReasons,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Batch Update Slots
  const handleBatchUpdateSlots = async (
    participantId: string,
    updates: Record<string, SlotStatus>,
    reason?: string,
    slotReasons?: Record<string, string>
  ) => {
    if (!currentRoom) return;
    if (!isLeader && participantId !== myMemberId) return;

    const targetParticipant = participants.find((p) => p.id === participantId);
    if (!targetParticipant) return;

    const updatedSlots = {
      ...targetParticipant.availableSlots,
      ...updates,
    };

    const updatedReasons = {
      ...(targetParticipant.unavailableReasons || {}),
    };

    Object.entries(updates).forEach(([slotId, status]) => {
      if (status === 'busy') {
        if (slotReasons && slotReasons[slotId] !== undefined) {
          if (slotReasons[slotId].trim()) {
            updatedReasons[slotId] = slotReasons[slotId].trim();
          } else {
            delete updatedReasons[slotId];
          }
        } else if (reason && reason.trim()) {
          updatedReasons[slotId] = reason.trim();
        }
      } else {
        delete updatedReasons[slotId];
      }
    });

    if (slotReasons) {
      Object.entries(slotReasons).forEach(([slotId, r]) => {
        if (updatedSlots[slotId] === 'busy' && r.trim()) {
          updatedReasons[slotId] = r.trim();
        }
      });
    }

    const updatedParticipant = {
      ...targetParticipant,
      availableSlots: updatedSlots,
      unavailableReasons: updatedReasons,
    };

    const updatedParticipants = participants.map((p) =>
      p.id === participantId ? updatedParticipant : p
    );

    setCurrentRoom((prev) => (prev ? { ...prev, participants: updatedParticipants } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/members/${participantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableSlots: updatedSlots,
          unavailableReasons: updatedReasons,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Add Venue
  const handleAddVenue = async (newVenue: Venue) => {
    if (!currentRoom) return;
    const updatedVenues = [...venues, newVenue];
    setCurrentRoom((prev) => (prev ? { ...prev, venues: updatedVenues } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/venues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: newVenue }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Venue
  const handleDeleteVenue = async (venueId: string) => {
    if (!currentRoom) return;
    const updatedVenues = venues.filter((v) => v.id !== venueId);
    setCurrentRoom((prev) => (prev ? { ...prev, venues: updatedVenues } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/venues/${venueId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Voting Nominations
  const handleToggleNominateOption = async (optionId: string) => {
    if (!currentRoom) return;
    const nextNominated = nominatedOptionIds.includes(optionId)
      ? nominatedOptionIds.filter((id) => id !== optionId)
      : [...nominatedOptionIds, optionId];

    const nextVotingState = {
      ...votingState,
      nominatedOptionIds: nextNominated,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartVotingWithTopOptions = async (count: number = 3) => {
    if (!currentRoom) return;
    const topIds = candidateOptions.slice(0, count).map((o) => o.id);
    const nextVotingState = {
      ...votingState,
      isOpen: true,
      nominatedOptionIds: topIds,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));
    setActiveTab('voting');

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Cast Vote
  const handleCastVote = async (ballot: VoteBallot) => {
    if (!currentRoom) return;
    const nextBallots = {
      ...votingState.ballots,
      [ballot.memberId]: ballot,
    };

    const nextVotingState = {
      ...votingState,
      ballots: nextBallots,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate Member Votes
  const handleSimulateAllVotes = async () => {
    if (!currentRoom) return;
    const currentNominated = nominatedOptionIds.length > 0
      ? nominatedOptionIds
      : candidateOptions.slice(0, 3).map((o) => o.id);

    const newBallots: Record<string, VoteBallot> = { ...votingState.ballots };

    participants.forEach((p) => {
      if (newBallots[p.id]) return;

      const rankedForMember = [...candidateOptions]
        .filter((opt) => currentNominated.includes(opt.id))
        .sort((a, b) => {
          const slotA = p.availableSlots[a.slotId] || 'busy';
          const slotB = p.availableSlots[b.slotId] || 'busy';
          const scoreSlotA = slotA === 'preferred' ? 3 : slotA === 'available' ? 2 : 0;
          const scoreSlotB = slotB === 'preferred' ? 3 : slotB === 'available' ? 2 : 0;
          if (scoreSlotB !== scoreSlotA) return scoreSlotB - scoreSlotA;

          const travelA = a.venue.avgCommuteEstimateByMode?.[p.commuteMode] ?? 18;
          const travelB = b.venue.avgCommuteEstimateByMode?.[p.commuteMode] ?? 18;
          return travelA - travelB;
        })
        .map((opt) => opt.id);

      const approvals: Record<string, 'yes' | 'no'> = {};
      currentNominated.forEach((optId) => {
        const opt = candidateOptions.find((o) => o.id === optId);
        const slotStatus = opt ? p.availableSlots[opt.slotId] || 'busy' : 'busy';
        approvals[optId] = slotStatus !== 'busy' ? 'yes' : 'no';
      });

      newBallots[p.id] = {
        memberId: p.id,
        rankedOptionIds: rankedForMember.slice(0, 3),
        approvals,
        timestamp: Date.now(),
      };
    });

    const nextVotingState = {
      ...votingState,
      nominatedOptionIds: currentNominated,
      ballots: newBallots,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Finalize Decision
  const handleFinalizeDecision = async (optionId: string) => {
    if (!currentRoom) return;
    const nextVotingState = {
      ...votingState,
      finalizedOptionId: optionId,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));
    setActiveTab('finalized');

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetVotes = async () => {
    if (!currentRoom) return;
    const nextVotingState = {
      ...votingState,
      ballots: {},
      finalizedOptionId: null,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenVoting = async () => {
    if (!currentRoom) return;
    const nextVotingState = {
      ...votingState,
      finalizedOptionId: null,
    };

    setCurrentRoom((prev) => (prev ? { ...prev, votingState: nextVotingState } : null));
    setActiveTab('voting');

    try {
      await fetch(`/api/rooms/${currentRoom.code}/voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votingState: nextVotingState }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // If user is not yet in a room, display the Room Entry screen
  if (!currentRoom) {
    return (
      <RoomEntry
        initialCode={initialUrlCode}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onOpenRoom={handleOpenRoom}
        onQuickDemo={handleQuickDemo}
        error={entryError}
        organizerAuth={organizerAuth}
      />
    );
  }

  const finalizedOption = candidateOptions.find(
    (opt) => opt.id === votingState.finalizedOptionId
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Strict Top Bar with Room Code & Leader Indicator */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        votingActive={votingState.isOpen}
        isFinalized={Boolean(votingState.finalizedOptionId)}
        participantCount={participants.length}
        roomCode={currentRoom.code}
        roomName={currentRoom.name}
        isLeader={isLeader}
        isOrganizerAuthorized={organizerAuth.isAuthorized}
        onLeaveRoom={handleLeaveRoom}
        onOpenFeedbackModal={() => setIsFeedbackModalOpen(true)}
        onOpenAdminFeedbackModal={() => setIsAdminFeedbackModalOpen(true)}
        onOpenOrganizerRooms={() => setIsOrganizerRoomsModalOpen(true)}
      />

      {/* Participant Switcher bar with Leader Admin actions & locked organizer */}
      <ParticipantSwitcher
        participants={participants}
        activeParticipantId={activeParticipantId}
        isLeader={isLeader}
        myMemberId={myMemberId}
        roomCode={currentRoom.code}
        onSelectParticipant={handleSelectParticipant}
        onAddParticipant={handleAddParticipant}
        onRemoveParticipant={handleRemoveParticipant}
        onUpdateParticipant={handleUpdateParticipant}
        onAddSampleTeammates={handleAddSampleTeammates}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'availability' && (
          <AvailabilityMatrix
            slots={slots}
            participants={participants}
            activeParticipantId={activeParticipantId}
            isLeader={isLeader}
            myMemberId={myMemberId}
            onUpdateSlotStatus={handleUpdateSlotStatus}
            onBatchUpdateSlots={handleBatchUpdateSlots}
            onGoToSuggestions={() => setActiveTab('suggestions')}
            onAddDate={handleAddDate}
            onRemoveDate={handleRemoveDate}
          />
        )}

        {activeTab === 'suggestions' && (
          <SuggestedOptions
            options={candidateOptions}
            participants={participants}
            nominatedOptionIds={nominatedOptionIds}
            onToggleNominateOption={handleToggleNominateOption}
            onStartVotingWithTopOptions={handleStartVotingWithTopOptions}
            onGoToVoting={() => setActiveTab('voting')}
            votingActive={votingState.isOpen}
            venuesCount={venues.length}
            onGoToVenues={() => setActiveTab('venues')}
          />
        )}

        {activeTab === 'venues' && (
          <VenueDirectory
            venues={venues}
            participants={participants}
            onAddVenue={handleAddVenue}
            onDeleteVenue={handleDeleteVenue}
            onSelectVenueForSuggestions={() => setActiveTab('suggestions')}
          />
        )}

        {activeTab === 'voting' && (
          <VotingRoom
            options={candidateOptions}
            participants={participants}
            activeParticipantId={activeParticipantId}
            votingState={votingState}
            onCastVote={handleCastVote}
            onSimulateAllVotes={handleSimulateAllVotes}
            onFinalizeDecision={handleFinalizeDecision}
            onResetVotes={handleResetVotes}
          />
        )}

        {activeTab === 'finalized' && finalizedOption && (
          <FinalizedMeetingCard
            finalizedOption={finalizedOption}
            participants={participants}
            onReopenVoting={handleReopenVoting}
          />
        )}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>SyncSphere</span>
            <span>&bull;</span>
            <span className="font-semibold text-slate-700">{currentRoom.name}</span>
            <span>&bull;</span>
            <span className="font-mono font-bold text-slate-900 tracking-wider">
              Code: {currentRoom.code}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{participants.length} Member{participants.length === 1 ? '' : 's'}</span>
            <span>&bull;</span>
            <span>{roomDates.length} Target Date{roomDates.length === 1 ? '' : 's'}</span>
            <span>&bull;</span>
            <span>{isLeader ? 'Leader Admin Access Active' : 'Member View (Organizer Locked)'}</span>
          </div>
        </div>
      </footer>

      {/* Organizer Created Rooms Modal (List of all rooms created by admin) */}
      <OrganizerRoomsModal
        isOpen={isOrganizerRoomsModalOpen}
        onClose={() => setIsOrganizerRoomsModalOpen(false)}
        onSelectRoom={handleOpenRoom}
        onNewRoomClick={() => {
          setIsOrganizerRoomsModalOpen(false);
          handleLeaveRoom();
        }}
        currentRoomCode={currentRoom.code}
        isAuthorized={organizerAuth.isAuthorized}
      />

      {/* Participant Feedback Modal (For all attendees) */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        roomCode={currentRoom.code}
        defaultMemberName={activeParticipant?.name || ''}
      />

      {/* Admin Feedback Inbox (Visible to verified organizer) */}
      {(isLeader || organizerAuth.isAuthorized) && (
        <AdminFeedbackInboxModal
          isOpen={isAdminFeedbackModalOpen}
          onClose={() => setIsAdminFeedbackModalOpen(false)}
          roomCode={currentRoom.code}
          leaderMemberId={myMemberId || currentRoom.leaderId}
          isAuthorizedOrganizer={organizerAuth.isAuthorized}
        />
      )}
    </div>
  );
}
