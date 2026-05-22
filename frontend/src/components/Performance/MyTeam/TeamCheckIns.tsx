import React from 'react';
import { ArrowLeft, Clock, TrendingUp, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Button from '../../shared/atoms/Button';
import { useScreenSize } from '../../../hooks/useScreenSize';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const STATS = [
  {
    label: 'SUBMITTED THIS WEEK',
    value: '6 / 8',
    icon: <div className="w-2.5 h-2.5 bg-blue-500 transform rotate-45 rounded-sm" />,
    iconBg: 'bg-blue-50',
    sub: null
  },
  {
    label: 'AVG FEELING SCORE',
    value: '4.0',
    icon: <TrendingUp className="w-4 h-4 text-green-600" />,
    iconBg: 'bg-green-50',
    sub: <span className="text-gray-500">↓ 0.3 from last week</span>
  },
  {
    label: 'ACTIVE BLOCKERS',
    value: '4',
    icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
    iconBg: 'bg-orange-50',
    sub: <span className="text-gray-500">from 3 reportees</span>
  },
  {
    label: 'TEAM AVG HOURS',
    value: '40.8h',
    icon: <Clock className="w-4 h-4 text-purple-600" />,
    iconBg: 'bg-purple-50',
    sub: <span className="text-gray-500">Aman, Vikram missing</span>
  },
];

type CheckInStatus = 'Submitted' | 'Missing';

interface CheckIn {
  id: string;
  initials: string;
  name: string;
  status: CheckInStatus;
  feeling?: string;
  hours?: string;
  accomplished?: string;
  nextWeek?: string;
  blockers?: number;
  missingMessage?: string;
}

const CHECK_INS: CheckIn[] = [
  {
    id: '1', initials: 'PM', name: 'Pallavi Mahar', status: 'Submitted', feeling: '4/5', hours: '42h',
    accomplished: 'Shipped goals list + tree view. Calibration screen blocked on data model.',
    nextWeek: 'Unblock data model with Karthik: build calibrator session screen.',
    blockers: 1
  },
  {
    id: '2', initials: 'KI', name: 'Karthik Iyer', status: 'Submitted', feeling: '5/5', hours: '45h',
    accomplished: 'Auth v3 cutover successful — 0 incidents. Pair-programmed with Aman.',
    nextWeek: 'Start on token system refactor.',
    blockers: 0
  },
  {
    id: '3', initials: 'MS', name: 'Mohit Sinha', status: 'Submitted', feeling: '3/5', hours: '40h',
    accomplished: 'Recruitment redesign — 3 of 6 screens done. Blocked on PM availability.',
    nextWeek: 'Sync with Neha on remaining 3 screens.',
    blockers: 2
  },
  {
    id: '4', initials: 'RB', name: 'Riya Banerjee', status: 'Submitted', feeling: '5/5', hours: '38h',
    accomplished: 'Ran usability sessions with 8 students; v2 NPS at 72.',
    nextWeek: 'Synthesize findings; share with team.',
    blockers: 0
  },
  {
    id: '5', initials: 'AB', name: 'Aman Bhatt', status: 'Missing',
    missingMessage: 'No check-in submitted for week of 11 May · 4-day streak broken'
  },
  {
    id: '6', initials: 'SD', name: 'Shreya Das', status: 'Submitted', feeling: '4/5', hours: '41h',
    accomplished: 'Onboarding complete; first ticket merged.',
    nextWeek: 'Pair with Mohit on Recruitment v2.',
    blockers: 0
  },
  {
    id: '7', initials: 'VR', name: 'Vikram Rao', status: 'Missing',
    missingMessage: 'No check-in submitted for week of 11 May · 4-day streak broken'
  },
  {
    id: '8', initials: 'PM', name: 'Priya Menon', status: 'Submitted', feeling: '3/5', hours: '39h',
    accomplished: 'Q2 research plan signed off; recruiting blocked on agency contract.',
    nextWeek: 'Push procurement to close contract this week.',
    blockers: 1
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitialsBg = (initials: string) => {
  return 'bg-blue-50 text-blue-600'; // Mock has all blue avatars
};

const getFeelingColor = (feeling?: string) => {
  if (!feeling) return 'text-gray-900';
  if (feeling.startsWith('5') || feeling.startsWith('4')) return 'text-green-600';
  if (feeling.startsWith('3')) return 'text-orange-500';
  return 'text-red-600';
};

// ─── Component ────────────────────────────────────────────────────────────────

const TeamCheckIns: React.FC = () => {
  const { isMobile, isTablet } = useScreenSize();
  const isCompact = isMobile || isTablet;

  return (
    <main className={`min-h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans ${isMobile ? 'p-4' : 'p-8'}`}>
      <div className="mx-auto w-full max-w-screen space-y-5">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={`flex ${isCompact ? 'flex-col gap-4' : 'items-end justify-between'} mb-6`}>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Weekly Check-ins</h1>
            <Typography variant="bodySmall" className="text-gray-500 font-medium">
              Week of 11 May 2026 · 15-minute employee · 5-minute manager cadence
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev week
            </button>
            <button className="flex items-center px-4 py-1.5 border border-gray-200 rounded-md text-[11px] font-semibold text-gray-700 hover:bg-gray-50 bg-white transition-colors">
              This week
            </button>
          </div>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────── */}
        <div className={`grid ${isCompact ? 'grid-cols-2' : 'grid-cols-4'} gap-4 mb-4`}>
          {STATS.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px] block mb-0.5">
                  {stat.label}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-900 font-bold text-lg leading-tight">{stat.value}</span>
                </div>
                {stat.sub && (
                  <div className="text-[10px] mt-0.5">
                    {stat.sub}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Check-Ins List ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="divide-y divide-gray-100">
            {CHECK_INS.map((checkin) => (
              <div
                key={checkin.id}
                className={`flex ${isCompact ? 'flex-col gap-4' : 'items-start'} py-4 px-6 ${checkin.status === 'Missing' ? 'bg-red-50/40' : 'hover:bg-gray-50/50 transition-colors'}`}
              >

                {/* User Column */}
                <div className={`flex items-start gap-3 shrink-0 ${isCompact ? 'w-full' : 'w-[250px]'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${getInitialsBg(checkin.initials)}`}>
                    {checkin.initials}
                  </div>
                  <div className="flex flex-col gap-1 mt-0.5">
                    <span className="font-bold text-[13px] text-gray-900 leading-none">
                      {checkin.name}
                    </span>
                    {checkin.status === 'Submitted' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-red-600 bg-red-100 w-fit">
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                {checkin.status === 'Submitted' ? (
                  <>
                    {/* Feeling Column */}
                    <div className={`flex flex-col ${isCompact ? 'w-full' : 'w-[100px] shrink-0 mt-0.5'}`}>
                      <span className={`text-[15px] font-bold leading-tight ${getFeelingColor(checkin.feeling)}`}>
                        {checkin.feeling}
                      </span>
                      <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px]">
                        Feeling
                      </span>
                    </div>

                    {/* Hours Column */}
                    <div className={`flex flex-col ${isCompact ? 'w-full' : 'w-[120px] shrink-0 mt-0.5'}`}>
                      <span className="text-[15px] font-bold text-gray-900 leading-tight">
                        {checkin.hours}
                      </span>
                      <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px]">
                        Week Hours
                      </span>
                    </div>

                    {/* Accomplished Column */}
                    <div className={`flex flex-col gap-1 ${isCompact ? 'w-full' : 'flex-1 pr-8 mt-0.5 min-w-0'}`}>
                      <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px]">
                        Accomplished
                      </span>
                      <p className="text-[12px] text-gray-700 leading-snug">
                        {checkin.accomplished}
                      </p>
                    </div>

                    {/* Next Week Column */}
                    <div className={`flex flex-col gap-1 ${isCompact ? 'w-full' : 'flex-1 pr-8 mt-0.5 min-w-0'}`}>
                      <span className="text-gray-400 uppercase tracking-widest font-bold text-[9px] flex items-center gap-1.5">
                        Next Week
                        {checkin.blockers && checkin.blockers > 0 && (
                          <span className="text-red-500 font-bold lowercase tracking-normal flex items-center gap-1 text-[9px]">
                            - {checkin.blockers} blocker{checkin.blockers > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                      <p className="text-[12px] text-gray-700 leading-snug">
                        {checkin.nextWeek}
                      </p>
                    </div>

                    {/* Actions Column */}
                    <div className={`flex flex-col gap-2 shrink-0 ${isCompact ? 'w-full mt-4' : 'w-[100px]'}`}>
                      <button className="bg-[#1a73e8] hover:bg-blue-600 text-white w-full py-1.5 rounded-md text-[11px] font-semibold transition-colors">
                        Reply
                      </button>
                      <button className="border border-blue-200 text-[#1a73e8] bg-white hover:bg-blue-50 w-full py-1.5 rounded-md text-[11px] font-semibold transition-colors">
                        Add to 1:1
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Missing Content */}
                    <div className="flex-1 flex items-center gap-2 py-2 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-[12px] text-red-600 font-medium">
                        {checkin.missingMessage}
                      </span>
                    </div>

                    {/* Missing Actions */}
                    <div className={`flex flex-col justify-center shrink-0 ${isCompact ? 'w-full mt-4' : 'w-[100px]'}`}>
                      <button className="bg-[#1a73e8] hover:bg-blue-600 text-white w-full py-1.5 rounded-md text-[11px] font-semibold transition-colors">
                        Nudge
                      </button>
                    </div>
                  </>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
};

export default TeamCheckIns;
