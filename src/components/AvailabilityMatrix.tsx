import React, { useState } from 'react';
import { Participant, TimeSlot, SlotStatus } from '../types';
import {
  Check,
  Star,
  X,
  Calendar,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  Clock,
  UserX,
  CheckCircle2,
  XCircle,
  CalendarX,
  Users,
  Crown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDateLabel, getTodayIsoString } from '../utils/dateSlots';

interface AvailabilityMatrixProps {
  slots: TimeSlot[];
  participants: Participant[];
  activeParticipantId: string;
  isLeader: boolean;
  myMemberId?: string;
  onUpdateSlotStatus: (
    participantId: string,
    slotId: string,
    status: SlotStatus,
    reason?: string
  ) => void;
  onBatchUpdateSlots: (
    participantId: string,
    updates: Record<string, SlotStatus>,
    reason?: string,
    slotReasons?: Record<string, string>
  ) => void;
  onGoToSuggestions: () => void;
  onAddDate?: (dateIso: string) => void;
  onRemoveDate?: (dateIso: string) => void;
}

export const AvailabilityMatrix: React.FC<AvailabilityMatrixProps> = ({
  slots,
  participants,
  activeParticipantId,
  isLeader,
  myMemberId,
  onUpdateSlotStatus,
  onBatchUpdateSlots,
  onGoToSuggestions,
  onAddDate,
  onRemoveDate,
}) => {
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<string | null>(null);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [newDateInput, setNewDateInput] = useState(getTodayIsoString());
  const [slotReasonInput, setSlotReasonInput] = useState('');

  // Unavailable Slots Manager Modal state
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [targetParticipantForUnavailable, setTargetParticipantForUnavailable] = useState<string>('');
  const [tempSlotStatus, setTempSlotStatus] = useState<Record<string, SlotStatus>>({});
  const [tempSlotReasons, setTempSlotReasons] = useState<Record<string, string>>({});
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');

  const activeParticipant =
    participants.find((p) => p.id === activeParticipantId) || participants[0];

  const isEditable = isLeader || (myMemberId && activeParticipant?.id === myMemberId);

  // Derive unique dates dynamically from the slots array
  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort();

  const periods = [
    { key: 'morning', label: 'Morning Focus', time: '09:30 - 11:30' },
    { key: 'lunch', label: 'Midday Sync', time: '12:00 - 14:00' },
    { key: 'afternoon', label: 'Afternoon Session', time: '14:30 - 16:30' },
    { key: 'evening', label: 'Evening Social', time: '17:30 - 19:30' },
  ];

  // Helper to toggle active member's slot status on click in matrix
  const handleSlotClick = (slotId: string) => {
    if (!activeParticipant || !isEditable) return;
    const current = activeParticipant.availableSlots[slotId] || 'busy';
    let next: SlotStatus = 'available';
    if (current === 'busy') next = 'available';
    else if (current === 'available') next = 'preferred';
    else if (current === 'preferred') next = 'busy';

    onUpdateSlotStatus(activeParticipant.id, slotId, next);
  };

  // Open the dedicated Unavailable Slots Manager modal
  const handleOpenUnavailableModal = (participantId?: string) => {
    const targetId = participantId || (myMemberId ? myMemberId : activeParticipant?.id);
    const target = participants.find((p) => p.id === targetId) || activeParticipant;
    if (!target) return;

    setTargetParticipantForUnavailable(target.id);
    // Initialize temporary state with current participant values
    const currentSlots: Record<string, SlotStatus> = {};
    slots.forEach((s) => {
      currentSlots[s.id] = target.availableSlots[s.id] || 'busy';
    });
    setTempSlotStatus(currentSlots);
    setTempSlotReasons({ ...(target.unavailableReasons || {}) });
    setSelectedDateFilter('all');
    setShowUnavailableModal(true);
  };

  // Toggle single slot status in the modal
  const handleToggleTempSlotUnavailable = (slotId: string) => {
    setTempSlotStatus((prev) => {
      const current = prev[slotId] || 'busy';
      const isCurrentlyBusy = current === 'busy';
      return {
        ...prev,
        [slotId]: isCurrentlyBusy ? 'available' : 'busy',
      };
    });
  };

  const handleUpdateTempReason = (slotId: string, reason: string) => {
    setTempSlotReasons((prev) => ({
      ...prev,
      [slotId]: reason,
    }));
  };

  // Bulk actions inside Unavailable Modal
  const handleModalMarkPeriodUnavailable = (periodKey: string) => {
    setTempSlotStatus((prev) => {
      const next = { ...prev };
      slots.forEach((s) => {
        if (s.period === periodKey) {
          next[s.id] = 'busy';
        }
      });
      return next;
    });
  };

  const handleModalMarkDateUnavailable = (dateIso: string) => {
    setTempSlotStatus((prev) => {
      const next = { ...prev };
      slots.forEach((s) => {
        if (s.date === dateIso) {
          next[s.id] = 'busy';
        }
      });
      return next;
    });
  };

  const handleModalClearAllUnavailable = () => {
    setTempSlotStatus((prev) => {
      const next = { ...prev };
      slots.forEach((s) => {
        next[s.id] = 'available';
      });
      return next;
    });
    setTempSlotReasons({});
  };

  const handleModalSaveUnavailable = () => {
    if (!targetParticipantForUnavailable) return;
    onBatchUpdateSlots(
      targetParticipantForUnavailable,
      tempSlotStatus,
      undefined,
      tempSlotReasons
    );
    setShowUnavailableModal(false);
  };

  // Quick preset shortcuts for active member on header
  const handleMarkAllLunchesPreferred = () => {
    if (!activeParticipant || !isEditable) return;
    const updates: Record<string, SlotStatus> = {};
    slots.forEach((s) => {
      if (s.period === 'lunch') {
        updates[s.id] = 'preferred';
      }
    });
    onBatchUpdateSlots(activeParticipant.id, updates);
  };

  const handleMarkAllSlotsAvailable = () => {
    if (!activeParticipant || !isEditable) return;
    const updates: Record<string, SlotStatus> = {};
    slots.forEach((s) => {
      updates[s.id] = 'available';
    });
    onBatchUpdateSlots(activeParticipant.id, updates);
  };

  const detailedSlot = selectedSlotForDetail
    ? slots.find((s) => s.id === selectedSlotForDetail)
    : null;

  const handleOpenSlotDetail = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSlotForDetail(slotId);
    const existingReason = activeParticipant?.unavailableReasons?.[slotId] || '';
    setSlotReasonInput(existingReason);
  };

  const handleSetSlotStatus = (status: SlotStatus) => {
    if (!detailedSlot || !activeParticipant || !isEditable) return;
    onUpdateSlotStatus(activeParticipant.id, detailedSlot.id, status, slotReasonInput);
  };

  const handleAddDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDateInput && onAddDate) {
      onAddDate(newDateInput);
      setShowAddDateModal(false);
    }
  };

  const targetParticipant = participants.find(
    (p) => p.id === targetParticipantForUnavailable
  ) || activeParticipant;

  const filteredSlotsForModal = slots.filter((s) => {
    if (selectedDateFilter === 'all') return true;
    return s.date === selectedDateFilter;
  });

  const countTempUnavailable = Object.values(tempSlotStatus).filter(
    (status) => status === 'busy'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-slate-600" />
            <span>Interactive Availability Heat-Map</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Schedule Matrix ({uniqueDates.length} Date{uniqueDates.length === 1 ? '' : 's'} &bull; {participants.length} Member{participants.length === 1 ? '' : 's'})
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Click any cell to toggle <span className="font-semibold text-slate-900">{activeParticipant?.name || 'your'}</span> status:
            <span className="inline-flex items-center gap-1 mx-1.5 font-medium text-rose-700">
              <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-400 inline-block" /> Not Available (Busy)
            </span>
            &rarr;
            <span className="inline-flex items-center gap-1 mx-1.5 font-medium text-emerald-700">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400 inline-block" /> Available
            </span>
            &rarr;
            <span className="inline-flex items-center gap-1 mx-1.5 font-medium text-amber-700">
              <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-400 inline-block" /> Preferred
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto shrink-0">
          {/* Option to enter what time slots are not available */}
          {isEditable && (
            <button
              onClick={() => handleOpenUnavailableModal(activeParticipant?.id)}
              className="px-3.5 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Select which time blocks you cannot attend and add conflict reasons"
            >
              <CalendarX className="w-3.5 h-3.5 text-rose-600" />
              <span>Enter Unavailable Slots</span>
            </button>
          )}

          {isLeader && onAddDate && (
            <button
              onClick={() => setShowAddDateModal(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Date
            </button>
          )}

          {isEditable && (
            <>
              <button
                onClick={handleMarkAllLunchesPreferred}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                Mark Lunches Preferred
              </button>
              <button
                onClick={handleMarkAllSlotsAvailable}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                Mark All Available
              </button>
            </>
          )}

          <button
            onClick={onGoToSuggestions}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Find Best Options
          </button>
        </div>
      </div>

      {/* Read-Only Notice if viewing another member's profile */}
      {!isEditable && activeParticipant && (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Viewing <strong>{activeParticipant.name}</strong>&apos;s schedule in <strong>read-only</strong> mode. You can only update your own availability.
            </span>
          </div>
          {myMemberId && (
            <button
              onClick={() => handleOpenUnavailableModal(myMemberId)}
              className="text-xs font-semibold text-rose-800 hover:text-rose-900 underline underline-offset-2 shrink-0"
            >
              Edit My Unavailable Slots
            </button>
          )}
        </div>
      )}

      {/* Heatmap Matrix Table */}
      {uniqueDates.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Meeting Dates Configured</h3>
          <p className="text-xs text-slate-500">
            Please add meeting target dates to build the schedule matrix.
          </p>
          {isLeader && onAddDate && (
            <button
              onClick={() => setShowAddDateModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Meeting Date
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                  <th className="p-3.5 w-44">Time Block</th>
                  {uniqueDates.map((dateStr) => {
                    const { dayLabel, dateFormatted } = formatDateLabel(dateStr);
                    return (
                      <th key={dateStr} className="p-3.5 border-l border-slate-200 min-w-[220px]">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900">{dayLabel}</span>
                            <span className="text-slate-500 ml-1.5">{dateFormatted}</span>
                          </div>
                          {isLeader && onRemoveDate && uniqueDates.length > 1 && (
                            <button
                              onClick={() => onRemoveDate(dateStr)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded"
                              title={`Remove date ${dateFormatted}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {periods.map((period) => {
                  return (
                    <tr key={period.key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 align-top bg-slate-50/70 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{period.label}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {period.time}
                        </div>
                      </td>

                      {uniqueDates.map((dateStr) => {
                        const slot = slots.find(
                          (s) => s.date === dateStr && s.period === period.key
                        );
                        if (!slot) return <td key={dateStr} className="border-l border-slate-200" />;

                        // Count free vs busy/unavailable members
                        const freeMembers = participants.filter(
                          (p) => (p.availableSlots[slot.id] || 'busy') !== 'busy'
                        );
                        const busyMembers = participants.filter(
                          (p) => (p.availableSlots[slot.id] || 'busy') === 'busy'
                        );
                        const isFullAttendance =
                          participants.length > 0 && freeMembers.length === participants.length;
                        const activeStatus = activeParticipant?.availableSlots[slot.id] || 'busy';
                        const myConflictReason = activeParticipant?.unavailableReasons?.[slot.id];

                        // Compute cell heat color
                        const ratio =
                          participants.length > 0 ? freeMembers.length / participants.length : 0;
                        let heatBg = 'bg-slate-50 hover:bg-slate-100';
                        let badgeColor = 'text-slate-600 bg-slate-100';

                        if (isFullAttendance) {
                          heatBg = 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-300';
                          badgeColor = 'text-emerald-800 bg-emerald-100 font-semibold';
                        } else if (ratio >= 0.8) {
                          heatBg = 'bg-teal-50/60 hover:bg-teal-100/70 border-teal-200';
                          badgeColor = 'text-teal-800 bg-teal-100 font-semibold';
                        } else if (ratio >= 0.5) {
                          heatBg = 'bg-amber-50/50 hover:bg-amber-100/60 border-amber-200';
                          badgeColor = 'text-amber-800 bg-amber-100';
                        } else if (busyMembers.length === participants.length && participants.length > 0) {
                          heatBg = 'bg-rose-50/40 hover:bg-rose-100/60 border-rose-200';
                          badgeColor = 'text-rose-800 bg-rose-100';
                        }

                        return (
                          <td
                            key={dateStr}
                            className={`p-2.5 border-l border-slate-200 relative transition-all ${
                              isEditable ? 'cursor-pointer' : 'cursor-default'
                            } ${heatBg}`}
                            onClick={() => handleSlotClick(slot.id)}
                          >
                            <div className="flex flex-col gap-1.5">
                              {/* Attendance Count & Unavailability Status */}
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded ${badgeColor} tabular-nums`}
                                >
                                  {freeMembers.length}/{participants.length} Free
                                </span>

                                {busyMembers.length > 0 && (
                                  <span className="text-[10px] text-rose-700 font-semibold tabular-nums">
                                    {busyMembers.length} Busy
                                  </span>
                                )}

                                {isFullAttendance && (
                                  <span className="text-[10px] text-emerald-700 font-medium tracking-tight">
                                    100% Match
                                  </span>
                                )}
                              </div>

                              {/* Active user status toggle */}
                              {activeParticipant && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                                  <span className="text-[11px] text-slate-500 truncate max-w-[80px]">
                                    {activeParticipant.name.split(' ')[0]}:
                                  </span>
                                  <span
                                    className={`text-[11px] font-medium flex items-center gap-1 ${
                                      activeStatus === 'preferred'
                                        ? 'text-amber-700 font-bold'
                                        : activeStatus === 'available'
                                        ? 'text-emerald-700'
                                        : 'text-rose-700 font-medium'
                                    }`}
                                  >
                                    {activeStatus === 'preferred' && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                                    {activeStatus === 'available' && <Check className="w-3 h-3 text-emerald-600" />}
                                    {activeStatus === 'busy' && <X className="w-3 h-3 text-rose-600" />}
                                    <span>
                                      {activeStatus === 'busy' ? 'Not Available' : activeStatus}
                                    </span>
                                  </span>
                                </div>
                              )}

                              {/* Display conflict reason note if present for active participant */}
                              {myConflictReason && activeStatus === 'busy' && (
                                <div className="text-[10px] text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 truncate">
                                  Note: {myConflictReason}
                                </div>
                              )}

                              {/* Clearly Viewable List of Members Not Available in this Slot */}
                              {busyMembers.length > 0 && (
                                <div className="text-[10px] text-rose-800 bg-rose-50/90 border border-rose-200/80 rounded px-1.5 py-0.5 mt-0.5">
                                  <span className="font-semibold text-rose-900">Unavailable: </span>
                                  <span>
                                    {busyMembers
                                      .map((m) => {
                                        const note = m.unavailableReasons?.[slot.id];
                                        return note
                                          ? `${m.name.split(' ')[0]} (${note})`
                                          : m.name.split(' ')[0];
                                      })
                                      .join(', ')}
                                  </span>
                                </div>
                              )}

                              {/* Member avatars preview and slot detail trigger */}
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="flex -space-x-1.5 overflow-hidden">
                                  {participants.slice(0, 5).map((p) => {
                                    const st = p.availableSlots[slot.id] || 'busy';
                                    const initials = p.name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .slice(0, 2);
                                    const reason = p.unavailableReasons?.[slot.id];
                                    return (
                                      <div
                                        key={p.id}
                                        title={`${p.name}: ${st === 'busy' ? 'Not Available' : st}${reason ? ` (${reason})` : ''}`}
                                        className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border border-white ${
                                          st === 'preferred'
                                            ? 'bg-amber-600 text-white ring-1 ring-amber-400'
                                            : st === 'available'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-rose-200 text-rose-800'
                                        }`}
                                      >
                                        {initials}
                                      </div>
                                    );
                                  })}
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleOpenSlotDetail(slot.id, e)}
                                  className="text-[11px] font-medium text-slate-500 hover:text-slate-900 underline underline-offset-2 ml-1"
                                >
                                  Details
                                </button>
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Room Members Availability & Conflict Directory (Clear breakdown viewable for all members) */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Team Availability &amp; Conflict Breakdown</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              Room Members Schedule Summary
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Review which time slots group members are available or blocked for, including conflict explanations.
            </p>
          </div>

          {activeParticipant && isEditable && (
            <button
              type="button"
              onClick={() => handleOpenUnavailableModal(activeParticipant.id)}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <CalendarX className="w-4 h-4 text-rose-600" />
              <span>Enter My Unavailable Slots</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map((member) => {
            const unavailableSlots = slots.filter(
              (s) => (member.availableSlots[s.id] || 'busy') === 'busy'
            );
            const availableCount = slots.length - unavailableSlots.length;
            const isUserSelf = member.id === myMemberId;
            const canEditThisMember = isLeader || isUserSelf;

            return (
              <div
                key={member.id}
                className={`p-4 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                  member.id === activeParticipantId
                    ? 'bg-slate-50/80 border-slate-300 ring-1 ring-slate-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${member.avatarColor}`}
                      >
                        {member.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <span>{member.name}</span>
                          {member.isLeader && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 text-amber-600" />
                              Host
                            </span>
                          )}
                          {isUserSelf && (
                            <span className="text-[10px] font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 capitalize">
                          {member.role} &bull; {member.commuteMode} (max {member.maxTravelTime}m)
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 ${
                          unavailableSlots.length === 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {unavailableSlots.length === 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fully Available ({slots.length}/{slots.length})</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              {unavailableSlots.length} Unavailable ({availableCount}/{slots.length} Free)
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Unavailable Slots Detail List */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Unavailable Time Slots:</span>
                      {unavailableSlots.length > 0 && (
                        <span className="text-rose-600 font-bold lowercase">
                          {unavailableSlots.length} blocked period{unavailableSlots.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>

                    {unavailableSlots.length === 0 ? (
                      <p className="text-xs text-emerald-700 bg-emerald-50/60 border border-emerald-200/70 rounded-md p-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>No conflicts reported. Available for all scheduled meeting times!</span>
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {unavailableSlots.map((s) => {
                          const reason = member.unavailableReasons?.[s.id];
                          return (
                            <div
                              key={s.id}
                              className="text-xs bg-rose-50/80 border border-rose-200/80 rounded-md p-2 flex items-start justify-between gap-2"
                            >
                              <div>
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <span>{s.dayLabel}, {s.dateFormatted}</span>
                                  <span className="text-slate-400">&bull;</span>
                                  <span className="text-slate-700">{s.periodLabel}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {s.timeLabel}
                                </div>
                                {reason && (
                                  <div className="text-[11px] text-rose-800 font-medium mt-1 bg-white/80 border border-rose-200 rounded px-1.5 py-0.5 inline-block">
                                    Conflict: {reason}
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider bg-rose-100/90 px-1.5 py-0.5 rounded shrink-0">
                                Not Available
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer action if editable */}
                {canEditThisMember && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenUnavailableModal(member.id)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                    >
                      <CalendarX className="w-3.5 h-3.5 text-slate-600" />
                      <span>Manage {isUserSelf ? 'My' : member.name.split(' ')[0] + "'s"} Unavailable Slots</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: Dedicated Unavailable Slots Manager Modal */}
      {showUnavailableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                  <CalendarX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Enter Unavailable Time Slots
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure blackout times and conflict explanations for{' '}
                    <strong className="text-slate-800">{targetParticipant?.name}</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowUnavailableModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Bulk Presets Bar */}
            <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleModalMarkPeriodUnavailable('morning')}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  Mornings Unavailable
                </button>
                <button
                  type="button"
                  onClick={() => handleModalMarkPeriodUnavailable('evening')}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 transition-colors"
                >
                  Evenings Unavailable
                </button>
                <button
                  type="button"
                  onClick={handleModalClearAllUnavailable}
                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded text-[11px] font-semibold text-emerald-800 transition-colors"
                >
                  Clear All (100% Free)
                </button>
              </div>

              <span className="text-rose-700 font-bold tabular-nums">
                {countTempUnavailable} slot{countTempUnavailable === 1 ? '' : 's'} marked unavailable
              </span>
            </div>

            {/* Modal Body: Date by Date Slots List */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {uniqueDates.map((dateStr) => {
                const { dayLabel, dateFormatted } = formatDateLabel(dateStr);
                const dateSlots = slots.filter((s) => s.date === dateStr);

                return (
                  <div key={dateStr} className="border border-slate-200 rounded-lg p-3.5 space-y-2.5 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-sm text-slate-900">
                          {dayLabel}, {dateFormatted}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleModalMarkDateUnavailable(dateStr)}
                        className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition-colors"
                      >
                        Mark Entire Day Unavailable
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dateSlots.map((slot) => {
                        const status = tempSlotStatus[slot.id] || 'busy';
                        const isUnavailable = status === 'busy';
                        const reason = tempSlotReasons[slot.id] || '';

                        return (
                          <div
                            key={slot.id}
                            className={`p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 ${
                              isUnavailable
                                ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-300'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-xs text-slate-900 block">
                                  {slot.periodLabel}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {slot.timeLabel}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleTempSlotUnavailable(slot.id)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                                  isUnavailable
                                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-2xs'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                              >
                                {isUnavailable ? (
                                  <>
                                    <X className="w-3 h-3" />
                                    <span>Not Available</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Available</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Conflict Reason field if marked unavailable */}
                            {isUnavailable && (
                              <div className="mt-1">
                                <label className="block text-[10px] font-semibold text-rose-800 mb-0.5">
                                  Conflict Reason (Visible to group):
                                </label>
                                <input
                                  type="text"
                                  value={reason}
                                  onChange={(e) => handleUpdateTempReason(slot.id, e.target.value)}
                                  placeholder="e.g. Doctor appt, client call, personal event"
                                  className="w-full text-xs px-2.5 py-1 border border-rose-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-rose-600 placeholder:text-slate-400"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Changes will be saved and visible to all room members immediately.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnavailableModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleModalSaveUnavailable}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Unavailable Slots</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Single Slot Inspector Modal */}
      {detailedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Slot Availability Breakdown
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {detailedSlot.dayLabel}, {detailedSlot.dateFormatted} — {detailedSlot.periodLabel}
                </h3>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  {detailedSlot.timeLabel}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlotForDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If user is editable, provide clear 3-way toggle with optional reason */}
            {isEditable && activeParticipant && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                <div className="text-xs font-bold text-slate-800">
                  Set Your Availability for this Block ({activeParticipant.name}):
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetSlotStatus('preferred')}
                    className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                      activeParticipant.availableSlots[detailedSlot.id] === 'preferred'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Preferred</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetSlotStatus('available')}
                    className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                      activeParticipant.availableSlots[detailedSlot.id] === 'available'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Available</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetSlotStatus('busy')}
                    className={`py-2 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
                      (activeParticipant.availableSlots[detailedSlot.id] || 'busy') === 'busy'
                        ? 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-400'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-3.5 h-3.5 text-rose-600" />
                    <span>Not Available</span>
                  </button>
                </div>

                {/* Conflict / Unavailability reason note */}
                {(activeParticipant.availableSlots[detailedSlot.id] || 'busy') === 'busy' && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-semibold text-rose-800">
                      Reason for Unavailability (Visible to team members):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={slotReasonInput}
                        onChange={(e) => setSlotReasonInput(e.target.value)}
                        placeholder="e.g. Doctor appointment, client workshop, travelling"
                        className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleSetSlotStatus('busy')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Room Members Availability List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Room Members Status:</span>
                <span className="text-slate-500 font-normal">
                  {participants.filter((p) => (p.availableSlots[detailedSlot.id] || 'busy') !== 'busy').length} Available &bull;{' '}
                  {participants.filter((p) => (p.availableSlots[detailedSlot.id] || 'busy') === 'busy').length} Not Available
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                {participants.map((p) => {
                  const status = p.availableSlots[detailedSlot.id] || 'busy';
                  const isBusy = status === 'busy';
                  const reason = p.unavailableReasons?.[detailedSlot.id];

                  return (
                    <div key={p.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${p.avatarColor}`}>
                          {p.name[0]}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.isLeader && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1 rounded">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 capitalize">
                            {p.role} &bull; {p.commuteMode} (max {p.maxTravelTime}m)
                          </div>
                          {reason && isBusy && (
                            <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 mt-1 inline-block">
                              Reason: {reason}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-1 rounded text-[11px] font-semibold capitalize shrink-0 ${
                          status === 'preferred'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : status === 'available'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {status === 'busy' ? 'Not Available' : status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setSelectedSlotForDetail(null)}
              className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Date */}
      {showAddDateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Meeting Date</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a date to coordinate team availability for.
            </p>

            <form onSubmit={handleAddDateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Date</label>
                <input
                  type="date"
                  required
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Add Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
