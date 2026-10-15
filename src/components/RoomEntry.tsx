import React, { useState, useEffect } from 'react';
import { CommuteMode, Participant, AdminRoomSummary } from '../types';
import {
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Calendar,
  Plus,
  Trash2,
  Lock,
  LogOut,
  UserCheck,
  AlertCircle,
  FolderKanban,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Users,
  MapPin,
} from 'lucide-react';
import { formatDateLabel, getTodayIsoString } from '../utils/dateSlots';
import type { OrganizerAuthState } from '../hooks/useOrganizerAuth';

interface RoomEntryProps {
  initialCode?: string;
  onCreateRoom: (
    roomName: string,
    dates: string[],
    leaderProfile: Partial<Participant>,
    organizerToken?: string | null
  ) => Promise<void>;
  onJoinRoom: (code: string, memberProfile: Partial<Participant>) => Promise<void>;
  onOpenRoom?: (code: string) => Promise<void>;
  onQuickDemo: () => Promise<void>;
  error?: string | null;
  organizerAuth: OrganizerAuthState;
}

export const RoomEntry: React.FC<RoomEntryProps> = ({
  initialCode = '',
  onCreateRoom,
  onJoinRoom,
  onOpenRoom,
  onQuickDemo,
  error,
  organizerAuth,
}) => {
  const { user, isAuthorized, displayName, photoURL, signIn, signOut, getIdToken, loading: authLoading } =
    organizerAuth;

  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Organizer Rooms state
  const [createdRooms, setCreatedRooms] = useState<AdminRoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [organizerTab, setOrganizerTab] = useState<'rooms' | 'create'>('rooms');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Join Room state (Public User)
  const [joinCode, setJoinCode] = useState(initialCode.toUpperCase());
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('Collaborator');
  const [memberMode, setMemberMode] = useState<CommuteMode>('transit');
  const [memberMaxTime, setMemberMaxTime] = useState(30);
  const [memberParking, setMemberParking] = useState(false);
  const [memberDietary, setMemberDietary] = useState('');

  // Create Room state (Organizer only)
  const [roomName, setRoomName] = useState('Q4 Team Planning & Offsite');
  const [leaderCustomName, setLeaderCustomName] = useState('');
  const [leaderRole, setLeaderRole] = useState('Team Organizer & Host');
  const [leaderMode, setLeaderMode] = useState<CommuteMode>('transit');
  const [leaderMaxTime, setLeaderMaxTime] = useState(25);
  const [leaderParking, setLeaderParking] = useState(false);
  const [leaderDietary, setLeaderDietary] = useState('');

  // Target dates manually entered by organizer
  const [dates, setDates] = useState<string[]>([
    '2026-10-16',
    '2026-10-17',
    '2026-10-19',
  ]);

  const fetchOrganizerRooms = async () => {
    if (!isAuthorized) return;
    setRoomsLoading(true);
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: { 'x-organizer-authorized': 'true' },
      });
      if (res.ok) {
        const data = await res.json();
        const list: AdminRoomSummary[] = data.rooms || [];
        setCreatedRooms(list);
        setOrganizerTab('rooms');
        try {
          localStorage.setItem('syncsphere_admin_rooms_cache', JSON.stringify(list));
        } catch {
          // ignore
        }
      }
    } catch {
      // fallback to cached
      try {
        const cached = localStorage.getItem('syncsphere_admin_rooms_cache');
        if (cached) {
          setCreatedRooms(JSON.parse(cached));
          setOrganizerTab('rooms');
        }
      } catch {
        // ignore
      }
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchOrganizerRooms();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (initialCode) {
      setJoinCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    if (displayName && !leaderCustomName) {
      setLeaderCustomName(displayName);
    }
  }, [displayName, leaderCustomName]);

  // Handle Google Sign-In popup
  const handleGoogleSignIn = async () => {
    setAuthActionLoading(true);
    setAuthErrorMessage(null);
    try {
      const res = await signIn();
      if (!res.success && res.error) {
        setAuthErrorMessage(res.error);
      }
    } catch (err: any) {
      setAuthErrorMessage(err.message || 'Google sign-in was interrupted. Please try again.');
    } finally {
      setAuthActionLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthErrorMessage(null);
    await signOut();
  };

  // Manage manually entered dates
  const handleDateChange = (index: number, value: string) => {
    const updated = [...dates];
    updated[index] = value;
    setDates(updated);
  };

  const handleAddDate = () => {
    const lastDate = dates[dates.length - 1] || getTodayIsoString();
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 1);
    const nextIso = d.toISOString().split('T')[0];
    setDates([...dates, nextIso]);
  };

  const handleRemoveDate = (index: number) => {
    if (dates.length <= 1) return;
    setDates(dates.filter((_, i) => i !== index));
  };

  // Public Member Join Submit
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !memberName.trim()) return;
    setLoading(true);
    try {
      await onJoinRoom(joinCode.trim().toUpperCase(), {
        name: memberName.trim(),
        role: memberRole.trim(),
        email: '',
        avatarColor: 'bg-indigo-700 text-white',
        commuteMode: memberMode,
        maxTravelTime: Number(memberMaxTime) || 30,
        requiresParking: memberParking,
        vibePreferences: ['Specialty Coffee', 'High-Speed Wi-Fi'],
        dietaryNeeds: memberDietary.trim() || 'None',
        availableSlots: {},
        isLeader: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Authorized Organizer Room Creation Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || dates.length === 0 || !leaderCustomName.trim()) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      await onCreateRoom(
        roomName.trim(),
        dates,
        {
          name: leaderCustomName.trim(),
          role: leaderRole.trim() || 'Team Lead & Host',
          email: '', // Never leak email
          avatarColor: 'bg-slate-900 text-white',
          commuteMode: leaderMode,
          maxTravelTime: Number(leaderMaxTime) || 25,
          requiresParking: leaderParking,
          vibePreferences: ['Specialty Coffee', 'Quiet & Focused', 'Power Outlets'],
          dietaryNeeds: leaderDietary.trim() || 'None',
          availableSlots: {},
          isLeader: true,
        },
        token
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const inviteUrl = `https://taemeetup.ai.studio/?room=${code}`;
      await navigator.clipboard.writeText(
        `Join our SyncSphere meeting room! Use 4-letter invite code: ${code} or open: ${inviteUrl}`
      );
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleDeleteRoom = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete room "${code}"?`)) return;

    try {
      const res = await fetch(`/api/admin/rooms/${code}`, {
        method: 'DELETE',
        headers: { 'x-organizer-authorized': 'true' },
      });
      if (res.ok) {
        setCreatedRooms((prev) => prev.filter((r) => r.code !== code));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCreatedRoom = (code: string) => {
    if (onOpenRoom) {
      onOpenRoom(code);
    } else {
      onJoinRoom(code, { name: displayName || 'Event Host' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-xs">
            SS
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          SyncSphere Meeting Coordination
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Optimal meeting time slots &amp; locations for groups of 5+ members.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {authErrorMessage && (
            <div className="mb-5 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Authentication Note</span>
                <span>{authErrorMessage}</span>
              </div>
            </div>
          )}

          {/* VIEW 1: AUTHORIZED ORGANIZER IS LOGGED IN */}
          {isAuthorized ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Creator Status Banner - Strictly shows Name and Badge, hiding email entirely */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                      {displayName ? displayName.charAt(0).toUpperCase() : 'O'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <span>{displayName}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        Verified Organizer
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Official Google Account</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] text-slate-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  title="Sign out of Organizer mode"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Segmented Tab: Created Rooms vs Create New Room */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOrganizerTab('rooms')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    organizerTab === 'rooms'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>My Created Rooms ({createdRooms.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrganizerTab('create')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                    organizerTab === 'create'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Room</span>
                </button>
              </div>

              {/* TAB 1: LIST OF CREATED ROOMS */}
              {organizerTab === 'rooms' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Your Meeting Rooms</h2>
                      <p className="text-xs text-slate-500">
                        Select a room to enter directly as organizer or copy invitation details.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchOrganizerRooms}
                      disabled={roomsLoading}
                      className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                      title="Refresh rooms list"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${roomsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {roomsLoading && createdRooms.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-2" />
                      Loading your created rooms...
                    </div>
                  ) : createdRooms.length === 0 ? (
                    <div className="py-8 text-center space-y-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-6">
                      <FolderKanban className="w-8 h-8 text-slate-400 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">No Rooms Created Yet</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Create your first room to coordinate schedules and venues with your team.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrganizerTab('create')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Meeting Room</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {createdRooms.map((room) => {
                        const formattedDate = new Date(room.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });

                        return (
                          <div
                            key={room.code}
                            className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">{room.name}</span>
                                {room.finalized && (
                                  <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                    Finalized
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                                <div className="flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <KeyRound className="w-3 h-3 text-slate-500" />
                                  <span>{room.code}</span>
                                </div>
                                <span className="text-slate-300">&bull;</span>
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-slate-400" />
                                  <span>{room.participantCount} {room.participantCount === 1 ? 'member' : 'members'}</span>
                                </div>
                                <span className="text-slate-300">&bull;</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{room.venueCount} {room.venueCount === 1 ? 'venue' : 'venues'}</span>
                                </div>
                                <span className="text-slate-300">&bull;</span>
                                <span>{formattedDate}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={(e) => handleCopyCode(room.code, e)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                                title="Copy 4-letter invite code & link"
                              >
                                {copiedCode === room.code ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-700">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-500" />
                                    <span>Code</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSelectCreatedRoom(room.code)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                              >
                                <span>Enter</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteRoom(room.code, e)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setOrganizerTab('create')}
                      className="w-full py-2 text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Another Meeting Room</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CREATE NEW ROOM FORM */}
              {organizerTab === 'create' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h2 className="text-base font-bold text-slate-900">Create New Meeting Room</h2>
                    <p className="text-xs text-slate-500">
                      Configure meeting dates &amp; organizer details to generate a 4-letter invite code.
                    </p>
                  </div>

                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Room / Meeting Name
                      </label>
                      <input
                        type="text"
                        required
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="e.g. Q4 Strategy Offsite"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    {/* Manually Entered Target Dates */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Meeting Target Dates (Manually Entered)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddDate}
                          className="text-[11px] text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"
                        >
                          <Plus className="w-3 h-3" />
                          Add Date
                        </button>
                      </div>

                      <div className="space-y-2">
                        {dates.map((dateStr, idx) => {
                          const { dayLabel, dateFormatted } = formatDateLabel(dateStr);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="date"
                                required
                                value={dateStr}
                                onChange={(e) => handleDateChange(idx, e.target.value)}
                                className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                              />
                              <span className="text-xs text-slate-500 font-medium min-w-[70px]">
                                {dayLabel}, {dateFormatted}
                              </span>
                              {dates.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDate(idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                  title="Remove this date"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Organizer Profile Details */}
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Organizer Display Name
                        </label>
                        <input
                          type="text"
                          required
                          value={leaderCustomName}
                          onChange={(e) => setLeaderCustomName(e.target.value)}
                          placeholder="e.g. Host"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          required
                          value={leaderRole}
                          onChange={(e) => setLeaderRole(e.target.value)}
                          placeholder="Team Organizer"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preferred Commute
                        </label>
                        <select
                          value={leaderMode}
                          onChange={(e) => setLeaderMode(e.target.value as CommuteMode)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                        >
                          <option value="transit">Public Transit</option>
                          <option value="car">Personal Car</option>
                          <option value="bike">Bicycle</option>
                          <option value="walk">Walking</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Max Commute (Minutes)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={90}
                          value={leaderMaxTime}
                          onChange={(e) => setLeaderMaxTime(Number(e.target.value))}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Dietary Preferences
                        </label>
                        <input
                          type="text"
                          value={leaderDietary}
                          onChange={(e) => setLeaderDietary(e.target.value)}
                          placeholder="e.g. Vegetarian, Coffee"
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={leaderParking}
                            onChange={(e) => setLeaderParking(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-0"
                          />
                          Requires Parking
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {createdRooms.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setOrganizerTab('rooms')}
                          className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={loading || !leaderCustomName.trim()}
                        className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{loading ? 'Creating Room...' : 'Create Room & Generate 4-Letter Code'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: PUBLIC USER (Enter 4-letter room code to join) */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                  <span>Join Meeting Room</span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Enter 4-Letter Room Code
                </h2>
                <p className="text-xs text-slate-500">
                  Ask your organizer for the 4-letter invite code to participate in scheduling &amp; voting.
                </p>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                {/* 4-Letter Invite Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4-Letter Room Invite Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                      placeholder="e.g. SYNC"
                      className="w-full text-center text-lg font-mono font-bold tracking-widest uppercase px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Public participants enter via room code only.
                  </span>
                </div>

                {/* Participant Details */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role / Department
                    </label>
                    <input
                      type="text"
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                      placeholder="e.g. Operations Lead"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Commute Mode
                    </label>
                    <select
                      value={memberMode}
                      onChange={(e) => setMemberMode(e.target.value as CommuteMode)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="transit">Public Transit</option>
                      <option value="car">Personal Car</option>
                      <option value="bike">Bicycle</option>
                      <option value="walk">Walking</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Commute Time
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={90}
                      value={memberMaxTime}
                      onChange={(e) => setMemberMaxTime(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dietary Restrictions
                    </label>
                    <input
                      type="text"
                      value={memberDietary}
                      onChange={(e) => setMemberDietary(e.target.value)}
                      placeholder="e.g. Vegetarian, Gluten-free"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={memberParking}
                        onChange={(e) => setMemberParking(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-0"
                      />
                      Requires Parking
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !memberName.trim() || !joinCode.trim()}
                  className="w-full mt-2 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <span>{loading ? 'Joining Room...' : 'Enter Room as Participant'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Discreet Organizer Entry Point */}
              <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  Are you the room organizer?
                </span>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authActionLoading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{authActionLoading ? 'Signing in with Google...' : 'Sign in as Room Organizer'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Demo Helper */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onQuickDemo}
            className="text-[11px] text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-medium"
          >
            <Sparkles className="w-3 h-3 text-slate-400" />
            <span>Launch Quick 5-Member Demo Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
