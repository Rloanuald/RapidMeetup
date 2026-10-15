import React, { useState } from 'react';
import { Participant, CommuteMode } from '../types';
import { Plus, Car, Train, Bike, Footprints, Settings2, Crown, Trash2, Sparkles, AlertCircle, Lock } from 'lucide-react';

interface ParticipantSwitcherProps {
  participants: Participant[];
  activeParticipantId: string;
  isLeader: boolean;
  myMemberId?: string;
  roomCode: string;
  onSelectParticipant: (id: string) => void;
  onAddParticipant: (participant: Participant) => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (participant: Participant) => void;
  onAddSampleTeammates?: () => void;
}

export const ParticipantSwitcher: React.FC<ParticipantSwitcherProps> = ({
  participants,
  activeParticipantId,
  isLeader,
  myMemberId,
  roomCode,
  onSelectParticipant,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  onAddSampleTeammates,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Participant | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // New participant state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newMode, setNewMode] = useState<CommuteMode>('transit');
  const [newMaxTime, setNewMaxTime] = useState(30);
  const [newRequiresParking, setNewRequiresParking] = useState(false);
  const [newDietary, setNewDietary] = useState('');

  const activeParticipant = participants.find((p) => p.id === activeParticipantId) || participants[0];

  const getModeIcon = (mode: CommuteMode) => {
    switch (mode) {
      case 'car':
        return <Car className="w-3.5 h-3.5" />;
      case 'transit':
        return <Train className="w-3.5 h-3.5" />;
      case 'bike':
        return <Bike className="w-3.5 h-3.5" />;
      case 'walk':
        return <Footprints className="w-3.5 h-3.5" />;
    }
  };

  const handleCreateParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const colors = [
      'bg-teal-700 text-white',
      'bg-purple-700 text-white',
      'bg-orange-700 text-white',
      'bg-blue-700 text-white',
      'bg-rose-700 text-white',
      'bg-amber-700 text-white',
    ];

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMember: Participant = {
      id: newId,
      name: newName.trim(),
      role: newRole.trim() || 'Team Member',
      email: `${newName.toLowerCase().replace(/\s+/g, '.')}@syncteam.io`,
      avatarColor: randomColor,
      commuteMode: newMode,
      maxTravelTime: Number(newMaxTime),
      requiresParking: newRequiresParking,
      vibePreferences: ['Quiet & Focused', 'Power Outlets'],
      dietaryNeeds: newDietary.trim() || 'None',
      availableSlots: {},
      isLeader: false,
    };

    onAddParticipant(newMember);
    onSelectParticipant(newId);
    setShowAddModal(false);
    setNewName('');
    setNewRole('');
    setNewDietary('');
  };

  const confirmDeleteMember = () => {
    if (memberToDelete) {
      onRemoveParticipant(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Active participant banner & selector */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>Members ({participants.length}):</span>
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {participants.map((p) => {
                const isSelected = p.id === activeParticipantId;
                const isOrganizer = Boolean(p.isLeader);
                const isOrganizerLocked = isOrganizer && !isLeader;
                const initials = p.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2);

                if (isOrganizerLocked) {
                  return (
                    <div
                      key={p.id}
                      className="flex items-center rounded-md border border-slate-200 bg-slate-100 text-slate-500 text-xs font-medium px-2.5 py-1.5 cursor-not-allowed select-none transition-colors"
                      title="Organizer Profile (Locked) — Only the verified host Google account can manage the organizer."
                      onClick={() => {
                        setLockedNotice(
                          'The Organizer profile is locked. Normal participants cannot select or assume the organizer role.'
                        );
                        setTimeout(() => setLockedNotice(null), 3500);
                      }}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-300 text-slate-700">
                        {initials}
                      </span>
                      <span className="whitespace-nowrap flex items-center gap-1.5 ml-1.5 font-semibold text-slate-600">
                        <span>{p.name}</span>
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-300 px-1.5 py-0.2 rounded shadow-2xs">
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                          Locked
                        </span>
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className={`flex items-center rounded-md border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/70'
                    }`}
                  >
                    <button
                      onClick={() => onSelectParticipant(p.id)}
                      className="flex items-center gap-2 px-2.5 py-1.5"
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isSelected ? 'bg-white/20 text-white' : p.avatarColor
                        }`}
                      >
                        {initials}
                      </span>
                      <span className="whitespace-nowrap flex items-center gap-1">
                        {p.name}
                        {p.isLeader && (
                          <Crown className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />
                        )}
                      </span>
                    </button>

                    {/* Admin delete privilege (leader can remove non-leader members) */}
                    {isLeader && !p.isLeader && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberToDelete(p);
                        }}
                        className={`px-1.5 py-1.5 transition-colors border-l ${
                          isSelected
                            ? 'text-slate-300 hover:text-red-300 border-slate-700'
                            : 'text-slate-400 hover:text-red-600 border-slate-200'
                        }`}
                        title={`Remove ${p.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Leader Add Member Action */}
              {isLeader && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Member (Admin)
                </button>
              )}

              {/* Sample teammates helper if room has < 5 members */}
              {isLeader && participants.length < 5 && onAddSampleTeammates && (
                <button
                  onClick={onAddSampleTeammates}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shrink-0"
                  title="Simulate 4 more team members to reach 5+ group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>+ Quick Add 4 Teammates (Demo 5+)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick summary of active member's constraints & preferences */}
          {activeParticipant && (
            <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-900">{activeParticipant.role}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="flex items-center gap-1">
                  {getModeIcon(activeParticipant.commuteMode)}
                  <span className="capitalize">{activeParticipant.commuteMode}</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="tabular-nums">Max {activeParticipant.maxTravelTime}m</span>
                {activeParticipant.requiresParking && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-amber-800 font-medium">Needs Parking</span>
                  </>
                )}
              </div>
              {(isLeader || activeParticipant.id === myMemberId) && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-slate-500 hover:text-slate-900 transition-colors p-0.5"
                  title="Edit preferences"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {lockedNotice && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2 animate-in fade-in">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{lockedNotice}</span>
          </div>
        )}
      </div>

      {/* Modal: Confirm Remove Member */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Remove Member</span>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{memberToDelete.name}</strong> from this room? Their schedule and votes will be cleared.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Member (No starting location requirement) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Group Member (Admin)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a teammate with their preferred commute mode and travel limits.
            </p>

            <form onSubmit={handleCreateParticipant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Department</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Frontend Architect"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commute Mode</label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as CommuteMode)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="transit">Public Transit</option>
                    <option value="car">Personal Car</option>
                    <option value="bike">Bicycle</option>
                    <option value="walk">Walking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Travel Time (mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={newMaxTime}
                    onChange={(e) => setNewMaxTime(parseInt(e.target.value) || 25)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newRequiresParking}
                    onChange={(e) => setNewRequiresParking(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  Requires Parking (Driving)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dietary / Accessibility Notes (optional)
                </label>
                <input
                  type="text"
                  value={newDietary}
                  onChange={(e) => setNewDietary(e.target.value)}
                  placeholder="e.g. Vegetarian, plant milk"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Add Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Active Member Preferences */}
      {showEditModal && activeParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Edit Preferences: {activeParticipant.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update travel limits, commute modality, and venue preferences for this member.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowEditModal(false);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commute Mode</label>
                  <select
                    value={activeParticipant.commuteMode}
                    onChange={(e) =>
                      onUpdateParticipant({
                        ...activeParticipant,
                        commuteMode: e.target.value as CommuteMode,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="transit">Public Transit</option>
                    <option value="car">Personal Car</option>
                    <option value="bike">Bicycle</option>
                    <option value="walk">Walking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Max Travel Time (mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={activeParticipant.maxTravelTime}
                    onChange={(e) =>
                      onUpdateParticipant({
                        ...activeParticipant,
                        maxTravelTime: parseInt(e.target.value) || 25,
                      })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={activeParticipant.requiresParking}
                    onChange={(e) =>
                      onUpdateParticipant({
                        ...activeParticipant,
                        requiresParking: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  Requires Parking (Driving)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dietary / Accommodation Note
                </label>
                <input
                  type="text"
                  value={activeParticipant.dietaryNeeds}
                  onChange={(e) =>
                    onUpdateParticipant({
                      ...activeParticipant,
                      dietaryNeeds: e.target.value,
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
