import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Play, Square, AlertOctagon, RefreshCw, CheckCircle2 } from 'lucide-react';

const DEMO_LOCATIONS = [
  { lat: 34.0923, lng: 74.8485, speedKmh: 25, label: "Home Stop (Departed)" },
  { lat: 34.0935, lng: 74.8502, speedKmh: 31, label: "Cruising towards Hazratbal" },
  { lat: 34.0943, lng: 74.8516, speedKmh: 46, label: "Overspeeding Alert Test (46 km/h)" }, // Exceeds 40 speed limit
  { lat: 34.0960, lng: 74.8540, speedKmh: 28, label: "Nearing Hazratbal Stop" },
  { lat: 34.0978, lng: 74.8564, speedKmh: 0, label: "Unexpected Stop Alert Test (Stopped)" }, // Stopped
  { lat: 34.0900, lng: 74.8350, speedKmh: 35, label: "Route Deviation Alert Test (Far Away)" }, // Far from route path
  { lat: 34.0995, lng: 74.8580, speedKmh: 25, label: "Returning to Route path" },
  { lat: 34.1012, lng: 74.8602, speedKmh: 12, label: "Arrived at School" }
];

export const DriverApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [checklist, setChecklist] = useState({
    attendant: true,
    firstAid: true,
    speedGovernor: true,
    documents: true
  });
  const [simIndex, setSimIndex] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDriverDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
      if (res.data.trip) {
        setActiveTrip(res.data.trip);
      } else {
        setActiveTrip(null);
      }
    } catch (err) {
      console.error('Error fetching driver dashboard: ', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  const handleCheckboxChange = (name: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleStartTrip = async () => {
    if (!checklist.attendant || !checklist.firstAid || !checklist.speedGovernor || !checklist.documents) {
      setResultMessage('Complete all vehicle safety checks before starting.');
      return;
    }

    setSubmitting(true);
    setResultMessage('');

    try {
      // Find a route for this school (in our seed it's route-1 for Srinagar Pine Valley)
      const routesRes = await api.get('/routes');
      const routes = routesRes.data;
      if (!routes || routes.length === 0) {
        setResultMessage('No routes registered for this school.');
        return;
      }

      const res = await api.post('/trips/start', {
        routeId: routes[0].id,
        checklist: checklist
      });

      setResultMessage('Official trip started successfully. Live location is now sharing.');
      setActiveTrip(res.data.trip);
      setSimIndex(0);
      fetchDriverDashboard();
    } catch (err: any) {
      setResultMessage(err.response?.data?.error || 'Failed to start trip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndTrip = async () => {
    if (!activeTrip) return;
    setSubmitting(true);
    setResultMessage('');

    try {
      await api.post(`/trips/${activeTrip.id}/end`);
      setResultMessage('Official school trip ended. Location sharing is now disabled.');
      setActiveTrip(null);
      fetchDriverDashboard();
    } catch (err: any) {
      setResultMessage(err.response?.data?.error || 'Failed to end trip.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendLocation = async () => {
    if (!activeTrip) return;

    const loc = DEMO_LOCATIONS[simIndex];
    setResultMessage(`Sending coordinate index ${simIndex + 1}: ${loc.label}...`);

    try {
      await api.post(`/trips/${activeTrip.id}/locations`, {
        lat: loc.lat,
        lng: loc.lng,
        speedKmh: loc.speedKmh,
        accuracy: 10
      });
      setResultMessage(`Sent GPS: ${loc.label}. Alerts calculated on backend.`);
      setSimIndex((prev) => (prev + 1) % DEMO_LOCATIONS.length);
    } catch (err: any) {
      setResultMessage(err.response?.data?.error || 'Failed to send location.');
    }
  };

  const handleSOS = async () => {
    if (!activeTrip) return;
    setResultMessage('Sending emergency alert...');

    try {
      await api.post(`/trips/${activeTrip.id}/sos`);
      setResultMessage('SOS / Emergency warning sent to school and transport authorities.');
    } catch (err: any) {
      setResultMessage(err.response?.data?.error || 'Failed to trigger SOS.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const vehicle = data?.vehicle;
  const isTripActive = !!activeTrip;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero card */}
      <div className="bg-gradient-to-r from-slate-800 to-cyan-900 border border-slate-700 rounded-2xl p-6 text-white shadow-xl flex justify-between items-start">
        <div className="space-y-2">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
            {vehicle?.registration || 'JK01 AB 2411'} · Morning Route A
          </span>
          <h2 className="text-2xl font-black">
            {isTripActive ? 'Official School Trip Active' : 'Trip Not Active'}
          </h2>
          <p className="text-slate-300 text-sm max-w-md">
            Your GPS coordinate updates and compliance status are shared with parents and schools only during active trips.
          </p>
        </div>
        <span className={`text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider ${
          isTripActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
        }`}>
          {isTripActive ? 'GPS Sharing On' : 'Offline'}
        </span>
      </div>

      {/* Driver Safeguard Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <AlertOctagon className="shrink-0 text-amber-600 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-sm">Safety First: Do Not Interact While Driving</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Mount the driver phone securely. Mark checks and start before movement, end after completion, and use the SOS button only in emergencies.
          </p>
        </div>
      </div>

      {/* Main Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3">
            Trip Dashboard Control
          </h3>

          {resultMessage && (
            <div className="bg-slate-50 border border-slate-200 text-slate-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
              {resultMessage}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleStartTrip}
              disabled={isTripActive || submitting}
              className="flex-1 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 border border-transparent text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Start Trip
            </button>

            <button
              onClick={handleEndTrip}
              disabled={!isTripActive || submitting}
              className="flex-1 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Square size={16} />
              End Trip
            </button>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleSendLocation}
              disabled={!isTripActive}
              className="w-full bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={14} />
              Send Test GPS Update (Index {simIndex + 1}/{DEMO_LOCATIONS.length})
            </button>

            <button
              onClick={handleSOS}
              disabled={!isTripActive}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 rounded-xl text-xs transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm disabled:opacity-40"
            >
              <span className="font-extrabold text-sm uppercase tracking-wide">Trigger SOS</span>
              <span className="text-[10px] text-red-400 font-normal">Broadcasting emergency alert to school transport team</span>
            </button>
          </div>
        </div>

        {/* Pre-Trip Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-800">
              Pre-Trip Safety Checklist
            </h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              Object.values(checklist).every(Boolean) ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {Object.values(checklist).every(Boolean) ? 'Ready' : 'Pending Checks'}
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.attendant}
                disabled={isTripActive}
                onChange={() => handleCheckboxChange('attendant')}
                className="mt-1 w-5 h-5 accent-teal-600 cursor-pointer disabled:opacity-60"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Crew Assigned</span>
                <span className="text-xs text-slate-400 block">Attendant listed on duty is present</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.firstAid}
                disabled={isTripActive}
                onChange={() => handleCheckboxChange('firstAid')}
                className="mt-1 w-5 h-5 accent-teal-600 cursor-pointer disabled:opacity-60"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">First-Aid Kit</span>
                <span className="text-xs text-slate-400 block">Available on board with correct contents</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.speedGovernor}
                disabled={isTripActive}
                onChange={() => handleCheckboxChange('speedGovernor')}
                className="mt-1 w-5 h-5 accent-teal-600 cursor-pointer disabled:opacity-60"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Speed Governor</span>
                <span className="text-xs text-slate-400 block">Governor functional and set to 40 km/h max</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={checklist.documents}
                disabled={isTripActive}
                onChange={() => handleCheckboxChange('documents')}
                className="mt-1 w-5 h-5 accent-teal-600 cursor-pointer disabled:opacity-60"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Vehicle Documents</span>
                <span className="text-xs text-slate-400 block">Fitness, insurance, and road taxes are current</span>
              </div>
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Completion of this checklist is logged on database. It contributes to school safety scores and compliance logs.
          </p>
        </div>
      </div>
    </div>
  );
};
