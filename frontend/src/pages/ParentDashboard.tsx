import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { InteractiveMap } from '../components/InteractiveMap';
import { Shield, MapPin, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [complaintType, setComplaintType] = useState('Unsafe driving');
  const [complaintText, setComplaintText] = useState('');
  const [complaintResult, setComplaintResult] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
      setAlerts(res.data.alerts || []);
      if (res.data.trip && res.data.trip.lastLocation) {
        setCurrentLocation(res.data.trip.lastLocation);
      } else {
        setCurrentLocation(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard: ', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);

      socket.on('location:update', (payload: any) => {
        if (data?.vehicle && payload.vehicleId === data.vehicle.id) {
          setCurrentLocation(payload.location);
        }
      });

      socket.on('alert:new', (payload: any) => {
        if (data?.vehicle && payload.vehicleId === data.vehicle.id) {
          setAlerts((prev: any[]) => [payload, ...prev]);
        }
      });

      socket.on('trip:started', (payload: any) => {
        if (data?.vehicle && payload.vehicleId === data.vehicle.id) {
          fetchDashboard();
        }
      });

      socket.on('trip:ended', (payload: any) => {
        if (data?.vehicle && payload.vehicleId === data.vehicle.id) {
          fetchDashboard();
        }
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [data?.vehicle?.id]);

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.vehicle) return;
    setSubmittingComplaint(true);
    setComplaintResult('');

    try {
      await api.post('/complaints', {
        vehicleId: data.vehicle.id,
        type: complaintType,
        description: complaintText
      });
      setComplaintResult('Report submitted privately to the school transport team.');
      setComplaintText('');
      setData((prev: any) => ({ ...prev, complaintCount: (prev.complaintCount || 0) + 1 }));
    } catch (err: any) {
      setComplaintResult(err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const vehicle = data?.vehicle;
  const trip = data?.trip;
  const isTripActive = trip && trip.status === 'active';
  const hasDeviation = alerts.some((a) => a.type === 'route_deviation' && a.status === 'open');

  return (
    <div className="space-y-4">
      {/* Privacy notice */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-teal-800 text-xs">
        <Shield size={16} className="shrink-0 text-teal-600" />
        <span>Private assigned-bus access — you see only your child's bus during active trips.</span>
      </div>

      {vehicle ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Map */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Bus</span>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    {vehicle.registration}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isTripActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isTripActive ? 'On Route' : 'Idle'}
                    </span>
                  </h2>
                </div>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded font-semibold">Srinagar</span>
              </div>

              {isTripActive && trip.route ? (
                <InteractiveMap
                  stops={trip.route.stops || []}
                  path={trip.route.path || []}
                  currentLocation={currentLocation}
                  deviationAlert={hasDeviation}
                />
              ) : (
                <div className="w-full h-[220px] bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                  <MapPin size={32} className="mb-1.5 text-slate-300" />
                  <span className="font-bold text-xs text-slate-600">No Active Trip</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Location sharing is off when bus is not on a trip.</p>
                </div>
              )}
            </div>

            {/* Status card */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white flex flex-col">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Live Status</span>
              <h3 className="text-sm font-bold mt-0.5">
                {isTripActive ? 'Arriving at School' : 'Trip Not Started'}
              </h3>
              <div className="mt-4 mb-3">
                <span className="text-[10px] text-slate-400">Speed</span>
                <strong className="text-2xl font-black block mt-0.5">
                  {isTripActive && currentLocation ? `${Math.round(currentLocation.speedKmh)} km/h` : '—'}
                </strong>
              </div>
              <div className="space-y-2.5 border-t border-slate-800 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Route</span>
                  <strong className={hasDeviation ? 'text-red-400' : isTripActive ? 'text-teal-400' : 'text-slate-400'}>
                    {hasDeviation ? 'Deviation' : isTripActive ? 'On Route' : '—'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GPS</span>
                  <strong className={isTripActive ? 'text-teal-400' : 'text-slate-400'}>
                    {isTripActive ? 'Active' : 'Off'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Attendant</span>
                  <strong className="text-slate-200">{vehicle.attendant}</strong>
                </div>
              </div>
              <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isTripActive ? 'bg-teal-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  {isTripActive ? 'Live' : 'Off'}
                </span>
                <span>Updated just now</span>
              </div>
            </div>
          </div>

          {/* Alerts & Complaints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <h3 className="text-sm font-bold text-slate-800">Safety Updates</h3>
                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {alerts.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                        <AlertTriangle size={12} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{alert.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{alert.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 text-xs py-8">No safety alerts.</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">
                Report a Concern
              </h3>
              {complaintResult && (
                <div className="bg-teal-50 border border-teal-200 text-teal-700 p-2.5 rounded-lg text-[10px] font-medium flex items-center gap-2 mb-3">
                  <CheckCircle2 size={14} className="text-teal-600 shrink-0" />
                  {complaintResult}
                </div>
              )}
              <form onSubmit={handleComplaintSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={complaintType}
                    onChange={(e) => setComplaintType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-teal-500"
                  >
                    <option>Unsafe driving</option>
                    <option>Route concern</option>
                    <option>Delay</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                  <textarea
                    value={complaintText}
                    onChange={(e) => setComplaintText(e.target.value)}
                    required
                    maxLength={240}
                    placeholder="Describe your concern..."
                    className="w-full h-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 outline-none focus:border-teal-500 resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Linked to {vehicle?.registration}</span>
                  <button
                    type="submit"
                    disabled={submittingComplaint}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1.5 px-3 rounded text-[10px] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Send size={11} />
                    {submittingComplaint ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-sm">
          No vehicle assigned to this account. Contact school transport administrator.
        </div>
      )}
    </div>
  );
};