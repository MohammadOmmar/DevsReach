import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { AlertOctagon } from 'lucide-react';

export const SchoolDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
      setAlerts(res.data.alerts || []);
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.error('Error fetching school dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);

      socket.on('alert:new', () => fetchDashboardData());
      socket.on('complaint:new', () => fetchDashboardData());
      socket.on('trip:started', () => fetchDashboardData());
      socket.on('trip:ended', () => fetchDashboardData());
      socket.on('location:update', () => fetchDashboardData());
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  const handleResolveAlert = async (id: string, status: string) => {
    try {
      await api.patch(`/alerts/${id}`, { status });
      fetchDashboardData();
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const handleResolveComplaint = async (id: string) => {
    try {
      await api.patch(`/complaints/${id}`, { status: 'resolved' });
      fetchDashboardData();
    } catch (err) {
      console.error('Error resolving complaint:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const vehicles = data?.vehicles || [];
  const checklist = data?.checklist || [];

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3 text-red-800">
          <div className="flex items-center gap-2.5">
            <AlertOctagon size={16} className="text-red-600 shrink-0" />
            <div>
              <span className="text-xs font-bold">{alerts.length} Active Safety Signals Need Review</span>
              <p className="text-[10px] text-red-700">Overspeeding, route deviations, and compliance warnings.</p>
            </div>
          </div>
          <button
            onClick={() => document.getElementById('safety-queue')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-[10px] transition-all shrink-0"
          >
            Review
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicles</span>
          <strong className="text-xl font-black text-slate-800 block mt-0.5">{stats.registeredVehicles || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">{stats.activeTrips || 0} on trips</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 border-t-[3px] border-t-red-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alerts</span>
          <strong className="text-xl font-black text-red-600 block mt-0.5">{stats.activeAlerts || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Active signals</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 border-t-[3px] border-t-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reports</span>
          <strong className="text-xl font-black text-amber-600 block mt-0.5">{stats.unresolvedComplaints || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Parent tickets</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Checklist</span>
          <strong className="text-xl font-black text-slate-800 block mt-0.5">{stats.checklistReminders || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Pending checks</span>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Fleet Monitor</h3>
          <span className="text-[9px] text-slate-400 font-bold uppercase">Pine Valley</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">Vehicle & Crew</th>
                <th className="py-2.5 px-4">Trip</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Safety</th>
                <th className="py-2.5 px-4">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {vehicles.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <strong className="text-slate-800 font-bold block text-xs">{v.registration}</strong>
                    <span className="text-[10px] text-slate-400">Driver: {v.driver?.name || 'Unassigned'}</span>
                  </td>
                  <td className="py-3 px-4 text-xs">{v.activeTrip ? 'Active Route' : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      v.activeTrip ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {v.activeTrip ? 'Active' : 'Idle'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      v.checklist?.attendant && v.checklist?.firstAid && v.checklist?.speedGovernor && v.checklist?.documents
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {v.checklist?.attendant && v.checklist?.firstAid && v.checklist?.speedGovernor && v.checklist?.documents ? 'Clear' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${v.complianceScore >= 80 ? 'bg-teal-500' : v.complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${v.complianceScore}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 text-[10px]">{v.complianceScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Queue & Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div id="safety-queue" className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-800">Safety Queue</h3>
            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{alerts.length} Open</span>
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${alert.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                      {alert.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{alert.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {new Date(alert.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button onClick={() => handleResolveAlert(alert.id, 'under_review')}
                      className="bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded text-[9px] transition-all">
                      Hold
                    </button>
                    <button onClick={() => handleResolveAlert(alert.id, 'resolved')}
                      className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-2 py-0.5 rounded text-[9px] transition-all">
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-xs py-10">No active alerts.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-sm font-bold text-slate-800">Parent Tickets</h3>
              <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{complaints.length} Open</span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {complaints.length > 0 ? (
                complaints.map((c: any) => (
                  <div key={c.id} className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div>
                      <strong className="text-[9px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">{c.type}</strong>
                      <p className="text-[10px] text-slate-600 mt-1">{c.description}</p>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button onClick={() => handleResolveComplaint(c.id)}
                      className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-2 py-1 rounded text-[9px] transition-all shrink-0 ml-3">
                      Resolve
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 text-xs py-8">No open tickets.</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 mb-3">Pre-Trip Compliance</h3>
            <div className="grid grid-cols-2 gap-2">
              {checklist.map((c: any) => (
                <div key={c.vehicleId} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <strong className="text-xs text-slate-800 font-bold block">{c.registration}</strong>
                  <div className="mt-1 space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Attendant:</span>
                      <strong className={c.checklist?.attendant ? 'text-teal-600' : 'text-red-500'}>{c.checklist?.attendant ? 'OK' : 'NO'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>First Aid:</span>
                      <strong className={c.checklist?.firstAid ? 'text-teal-600' : 'text-red-500'}>{c.checklist?.firstAid ? 'OK' : 'NO'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Governor:</span>
                      <strong className={c.checklist?.speedGovernor ? 'text-teal-600' : 'text-red-500'}>{c.checklist?.speedGovernor ? 'OK' : 'NO'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Documents:</span>
                      <strong className={c.checklist?.documents ? 'text-teal-600' : 'text-red-500'}>{c.checklist?.documents ? 'OK' : 'NO'}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};