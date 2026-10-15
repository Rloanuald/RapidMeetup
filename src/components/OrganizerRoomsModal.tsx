import React, { useState, useEffect } from 'react';
import { AdminRoomSummary } from '../types';
import {
  X,
  KeyRound,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Calendar,
  Users,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface OrganizerRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (code: string) => void;
  onNewRoomClick: () => void;
  currentRoomCode?: string;
  isAuthorized: boolean;
}

export const OrganizerRoomsModal: React.FC<OrganizerRoomsModalProps> = ({
  isOpen,
  onClose,
  onSelectRoom,
  onNewRoomClick,
  currentRoomCode,
  isAuthorized,
}) => {
  const [rooms, setRooms] = useState<AdminRoomSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchRooms = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/rooms', {
        headers: {
          'x-organizer-authorized': 'true',
        },
      });

      if (!res.ok) {
        throw new Error('Unable to fetch your created rooms.');
      }

      const data = await res.json();
      const fetchedRooms: AdminRoomSummary[] = data.rooms || [];
      setRooms(fetchedRooms);

      // Cache locally
      try {
        localStorage.setItem('syncsphere_admin_rooms_cache', JSON.stringify(fetchedRooms));
      } catch {
        // ignore
      }
    } catch (err: any) {
      // Fall back to local cache if offline or error
      try {
        const cached = localStorage.getItem('syncsphere_admin_rooms_cache');
        if (cached) {
          setRooms(JSON.parse(cached));
        } else {
          setError(err.message || 'Failed to load rooms');
        }
      } catch {
        setError(err.message || 'Failed to load rooms');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen, isAuthorized]);

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
    if (!window.confirm(`Are you sure you want to delete room "${code}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/rooms/${code}`, {
        method: 'DELETE',
        headers: {
          'x-organizer-authorized': 'true',
        },
      });

      if (res.ok) {
        setRooms((prev) => prev.filter((r) => r.code !== code));
        try {
          const cached = localStorage.getItem('syncsphere_admin_rooms_cache');
          if (cached) {
            const list: AdminRoomSummary[] = JSON.parse(cached);
            localStorage.setItem(
              'syncsphere_admin_rooms_cache',
              JSON.stringify(list.filter((r) => r.code !== code))
            );
          }
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Organizer Meeting Rooms
                </h3>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Admin Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                All meeting rooms created under your authorized Google account.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchRooms}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
              title="Refresh rooms"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {loading && rooms.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
              Loading your created rooms...
            </div>
          ) : error && rooms.length === 0 ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 text-center">
              {error}
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h4 className="text-sm font-bold text-slate-900">No Rooms Created Yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  You haven&apos;t created any meeting rooms yet. Create a room to begin coordinating schedules and venues.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNewRoomClick();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Room</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rooms.map((room) => {
                const isCurrent = room.code === currentRoomCode;
                const formattedDate = new Date(room.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div
                    key={room.code}
                    onClick={() => {
                      onSelectRoom(room.code);
                      onClose();
                    }}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{room.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                            Active Room
                          </span>
                        )}
                        {room.finalized && (
                          <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            Finalized
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(room.code, e)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded transition-colors flex items-center gap-1"
                        title="Copy invite code & link"
                      >
                        {copiedCode === room.code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectRoom(room.code);
                          onClose();
                        }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                      >
                        <span>{isCurrent ? 'Current' : 'Open'}</span>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} found</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewRoomClick();
            }}
            className="px-3 py-1.5 font-semibold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
