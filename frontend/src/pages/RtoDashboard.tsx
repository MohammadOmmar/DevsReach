import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socketService';
import { Shield, BarChart3 } from 'lucide-react';

export const RtoDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRtoDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching RTO dashboard: ', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRtoDashboard();

    const token = localStorage.getItem('token');
    if (token) {
      const socket = connectSocket(token);
      socket.on('alert:summary', () => fetchRtoDashboard());
      socket.on('trip:started', () => fetchRtoDashboard());
      socket.on('trip:ended', () => fetchRtoDashboard());
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const highRiskVehicles = data?.highRiskVehicles || [];
  const vehicles = data?.vehicles || [];
  const trend = data?.complaintTrend || {};

  return (
    <div className="space-y-4">
      {/* Privacy disclaimer */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 text-slate-700 text-xs">
        <Shield size={16} className="shrink-0 text-slate-500" />
        <span>Summary and compliance access only — no live maps or child-level data. Designed for risk-based inspection review.</span>
      </div>

      {/* RTO statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet</span>
          <strong className="text-xl font-black text-slate-800 block mt-0.5">{stats.registeredFleet || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">{stats.pilotSchools || 0} schools</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 border-t-[3px] border-t-teal-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance</span>
          <strong className="text-xl font-black text-teal-600 block mt-0.5">{stats.averageCompliance || 0}%</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Fleet readiness</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 border-t-[3px] border-t-red-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspections</span>
          <strong className="text-xl font-black text-red-600 block mt-0.5">{stats.inspectionDue || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Due for review</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 border-t-[3px] border-t-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documents</span>
          <strong className="text-xl font-black text-amber-600 block mt-0.5">{stats.pendingDocuments || 0}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">Expired/pending</span>
        </div>
      </div>

      {/* Risk Queue & Complaint Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Queue */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-800">High-Risk Vehicles</h3>
            <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{highRiskVehicles.length} Flagged</span>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {highRiskVehicles.length > 0 ? (
              highRiskVehicles.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      {v.registration}
                      <span className="bg-slate-200 text-slate-500 text-[8px] px-1.5 py-0.5 rounded font-bold">P{v.priority}</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{v.school}</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {v.repeatSignals?.map((sig: string) => (
                        <span key={sig} className="text-[8px] font-bold uppercase bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded">
                          {sig.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200 uppercase shrink-0">
                    Audit
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-xs py-10">No high-risk vehicles.</div>
            )}
          </div>
        </div>

        {/* Complaint Trends */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart3 size={14} className="text-teal-600" />
              Weekly Trends
            </h3>
            <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-500 rounded-sm"></span> Received</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-sm"></span> Resolved</span>
            </div>
          </div>

          <div className="flex items-end justify-between h-28 px-2 border-b border-slate-200 pb-1">
            {[['M', 35, 20], ['T', 55, 35], ['W', 42, 42], ['T', 70, 48], ['F', 52, 60], ['S', 18, 22], ['S', 30, 32]].map(([day, rec, res]) => (
              <div key={String(day)} className="flex flex-col items-center gap-1 w-7">
                <div className="w-2 bg-teal-500 rounded-t-sm" style={{ height: `${rec}px` }}></div>
                <div className="w-2 bg-slate-300 rounded-t-sm" style={{ height: `${res}px` }}></div>
                <span className="text-[9px] text-slate-400 font-bold">{String(day)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 text-center">
            <div>
              <strong className="text-base font-black text-slate-800 block">{trend.received || 0}</strong>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Received</span>
            </div>
            <div>
              <strong className="text-base font-black text-slate-800 block">{trend.resolved || 0}</strong>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Resolved</span>
            </div>
            <div>
              <strong className="text-base font-black text-slate-800 block">{trend.open || 0}</strong>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Open</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Fleet Compliance Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-4">School / Vehicle</th>
                <th className="py-2.5 px-4">Score</th>
                <th className="py-2.5 px-4">Documents</th>
                <th className="py-2.5 px-4">Flags</th>
                <th className="py-2.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
              {vehicles.map((v: any) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <strong className="text-slate-800 font-bold block text-xs">{v.school}</strong>
                    <span className="text-[10px] text-slate-400">{v.registration}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-14 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${v.complianceScore >= 80 ? 'bg-teal-500' : v.complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${v.complianceScore}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 text-[10px]">{v.complianceScore}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      v.documentsStatus === 'current' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                      v.documentsStatus === 'expiring' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {v.documentsStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px]">
                    {v.repeatSignals?.length > 0 ? (
                      <span className="text-slate-500">{v.repeatSignals.join(' · ')}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      v.priority >= 45 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {v.priority >= 45 ? 'Audit' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};