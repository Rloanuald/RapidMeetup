import React, { useState } from 'react';
import { Venue, Participant } from '../types';
import { MapPin, Train, Car, Volume2, Plus, Star, Navigation, Trash2 } from 'lucide-react';

interface VenueDirectoryProps {
  venues: Venue[];
  participants: Participant[];
  onAddVenue: (venue: Venue) => void;
  onDeleteVenue?: (venueId: string) => void;
  onSelectVenueForSuggestions?: (venueId: string) => void;
}

export const VenueDirectory: React.FC<VenueDirectoryProps> = ({
  venues,
  participants,
  onAddVenue,
  onDeleteVenue,
  onSelectVenueForSuggestions,
}) => {
  const [filterNoise, setFilterNoise] = useState<'all' | 'Quiet' | 'Moderate'>('all');
  const [filterParking, setFilterParking] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New venue state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newTransit, setNewTransit] = useState('');
  const [newParking, setNewParking] = useState('');
  const [newHasDedicatedParking, setNewHasDedicatedParking] = useState(false);
  const [newNoise, setNewNoise] = useState<'Quiet' | 'Moderate' | 'Lively'>('Quiet');

  const filteredVenues = venues.filter((v) => {
    if (filterNoise !== 'all' && v.noiseLevel !== filterNoise) return false;
    if (filterParking && !v.hasDedicatedParking) return false;
    return true;
  });

  const handleCreateVenue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    const newVenue: Venue = {
      id: `venue_${Date.now()}`,
      name: newName.trim(),
      category: newCategory.trim() || 'Meeting Space & Cafe',
      address: newAddress.trim(),
      neighborhood: 'Central District',
      transitAccess: newTransit.trim() || 'Subway & Bus Accessible',
      parkingInfo: newParking.trim() || (newHasDedicatedParking ? 'Dedicated on-site parking' : 'Street parking'),
      hasDedicatedParking: newHasDedicatedParking,
      noiseLevel: newNoise,
      vibeTags: ['Quiet & Focused', 'Power Outlets', 'Natural Light'],
      priceLevel: '$$',
      rating: 4.8,
      amenities: ['Power Outlets', 'High-Speed Wi-Fi', 'Coffee & Tea'],
      avgCommuteEstimateByMode: {
        transit: 16,
        car: 20,
        bike: 16,
        walk: 15,
      },
      mapAccentColor: 'emerald',
    };

    onAddVenue(newVenue);
    setShowAddModal(false);
    setNewName('');
    setNewAddress('');
    setNewTransit('');
    setNewParking('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>Meetup Locations & Accessibility</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Curated Venues & Travel Breakdown
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Venues are evaluated based on transit access, parking convenience, and workspace amenities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter */}
          {venues.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                onClick={() => setFilterNoise('all')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filterNoise === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Noise
              </button>
              <button
                onClick={() => setFilterNoise('Quiet')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filterNoise === 'Quiet' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quiet
              </button>
            </div>
          )}

          {venues.length > 0 && (
            <button
              onClick={() => setFilterParking(!filterParking)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                filterParking
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Has Dedicated Parking
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Nominate Venue
          </button>
        </div>
      </div>

      {/* Zero Venues Notice & Empty State */}
      {venues.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              No Meetup Venues Nominated Yet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Preset venues have been removed so your group can coordinate real locations. Please suggest a convenient coffee shop, coworking commons, library, or office space for the team.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nominate First Venue</span>
            </button>
          </div>
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-xs text-slate-500">
          No venues match the selected filters.
          <button
            onClick={() => {
              setFilterNoise('all');
              setFilterParking(false);
            }}
            className="block mx-auto mt-2 text-slate-900 font-semibold underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Venues Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVenues.map((venue) => {
            let totalTravel = 0;
            participants.forEach((p) => {
              totalTravel += venue.avgCommuteEstimateByMode?.[p.commuteMode] ?? 18;
            });
            const avgTravel = participants.length > 0 ? Math.round((totalTravel / participants.length) * 10) / 10 : 18;

            return (
              <div
                key={venue.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                {/* Visual Venue Banner */}
                <div className="relative h-32 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex flex-col justify-between text-white overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:16px_16px]"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-300 uppercase tracking-wider">
                        {venue.category}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                        {venue.name}
                      </h3>
                    </div>

                    <div className="flex items-start gap-2 text-right">
                      <div>
                        <div className="text-xs font-bold text-emerald-400 font-mono tabular-nums">
                          ~{avgTravel}m avg
                        </div>
                        <div className="text-[10px] text-slate-300">travel time</div>
                      </div>
                      {onDeleteVenue && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove venue "${venue.name}"?`)) {
                              onDeleteVenue(venue.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors ml-1"
                          title="Remove venue nomination"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{venue.address}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-white font-mono tabular-nums">{venue.rating}</span>
                      <span>({venue.priceLevel})</span>
                    </div>
                  </div>
                </div>

                {/* Venue Details */}
                <div className="p-4 space-y-4">
                  {/* Transit & Parking Badges */}
                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">
                    <div className="flex items-start gap-2">
                      <Train className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800">Transit:</strong> {venue.transitAccess}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Car className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-800">Parking:</strong> {venue.parkingInfo}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Noise Level: <strong className="text-slate-800">{venue.noiseLevel}</strong></span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span>Dedicated Parking: <strong className={venue.hasDedicatedParking ? 'text-emerald-700' : 'text-slate-500'}>
                        {venue.hasDedicatedParking ? 'Yes' : 'No (Street/Garage)'}
                      </strong></span>
                    </div>
                  </div>

                  {/* Individual Commute Travel Times for Each Member */}
                  {participants.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                        <span>Travel Duration by Participant:</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Target limit shown
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {participants.map((p) => {
                          const mins = venue.avgCommuteEstimateByMode?.[p.commuteMode] ?? 18;
                          const exceeds = mins > p.maxTravelTime;
                          const parkingConflict = p.requiresParking && !venue.hasDedicatedParking;

                          return (
                            <div
                              key={p.id}
                              className={`p-2 rounded text-xs border ${
                                exceeds || parkingConflict
                                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="font-semibold truncate">{p.name}</div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                <span className="capitalize">{p.commuteMode}</span>
                                <span className={`font-mono tabular-nums font-bold ${exceeds ? 'text-red-700' : 'text-slate-900'}`}>
                                  {mins}m
                                </span>
                              </div>
                              {parkingConflict && (
                                <div className="text-[10px] text-amber-800 mt-0.5">
                                  Needs parking!
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Amenities Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {venue.amenities.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-4 pt-0">
                <button
                  onClick={() => onSelectVenueForSuggestions?.(venue.id)}
                  className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  View Slot Combinations with this Venue
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal: Nominate New Venue */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Nominate Meetup Venue</h3>
            <p className="text-xs text-slate-500 mb-4">
              Suggest an accessible coffee shop, coworking commons, or bistro for the team.
            </p>

            <form onSubmit={handleCreateVenue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Atlas Roastery & Boardroom"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category / Vibe</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Specialty Cafe & Cowork Lounge"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Noise Level</label>
                <select
                  value={newNoise}
                  onChange={(e) => setNewNoise(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="Quiet">Quiet</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Lively">Lively</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 350 Hudson St"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transit Access Notes</label>
                <input
                  type="text"
                  value={newTransit}
                  onChange={(e) => setNewTransit(e.target.value)}
                  placeholder="e.g. 1 Train at Houston St (2 min walk)"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newHasDedicatedParking}
                    onChange={(e) => setNewHasDedicatedParking(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  Has Dedicated / Free Parking On-Site
                </label>
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
                  Add Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
