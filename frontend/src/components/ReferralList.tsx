import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeDocuments } from '../hooks/useFrappeQuery';
import {
  Search,
  User,
  Mail,
  Briefcase,
  Calendar,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Award,
  Sparkles,
  Inbox,
  ArrowRight,
  TrendingUp,
  MapPin
} from 'lucide-react';
import "../index.css";

export interface Referral {
  name: string;
  full_name: string;
  email: string;
  date: string;
  status: string;
  for_designation: string;
}

const ReferralList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'pending' | 'interview scheduled' | 'accepted' | 'rejected'>('All');
  const [selectedDesignation, setSelectedDesignation] = useState<string>('All');

  // Query referrals from the Employee Referral doctype
  const { data: referralListRes, isLoading, error, refetch, isFetching } = useFrappeDocuments({
    doctype: 'Employee Referral',
    fields: ['name', 'full_name', 'email', 'date', 'status', 'for_designation'],
    pageSize: 100, // Fetch up to 100 items for a fast local search/filter experience
    orderBy: 'date desc',
    searchFields: ['full_name', 'email', 'for_designation', 'status'],
  } as any);

  const rawReferrals = useMemo(() => {
    return (referralListRes?.data as unknown as Referral[]) || [];
  }, [referralListRes]);

  // Compute live real-time statistics
  const stats = useMemo(() => {
    const total = rawReferrals.length;
    const accepted = rawReferrals.filter(r => r.status?.toLowerCase() === 'accepted').length;
    const pending = rawReferrals.filter(r => r.status?.toLowerCase() === 'pending').length;
    const interview = rawReferrals.filter(r => r.status?.toLowerCase() === 'interview scheduled').length;
    const rejected = rawReferrals.filter(r => r.status?.toLowerCase() === 'rejected').length;

    return { total, accepted, pending, interview, rejected };
  }, [rawReferrals]);

  // Dynamically extract unique designations present in the fetched referrals
  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    rawReferrals.forEach(r => {
      if (r.for_designation) set.add(r.for_designation);
    });
    return ['All', ...Array.from(set)];
  }, [rawReferrals]);

  // Locally filter results for high performance, smooth UX & immediate updates
  const filteredReferrals = useMemo(() => {
    let result = [...rawReferrals];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        (r.for_designation || '').toLowerCase().includes(q)
      );
    }

    if (selectedStatus !== 'All') {
      result = result.filter(r => (r.status || '').toLowerCase() === selectedStatus.toLowerCase());
    }

    if (selectedDesignation !== 'All') {
      result = result.filter(r => r.for_designation === selectedDesignation);
    }

    return result;
  }, [rawReferrals, searchTerm, selectedStatus, selectedDesignation]);

  const handleCardClick = (referralId: string) => {
    navigate(`/webapp/recruitment-app/referrals/${referralId}`);
  };

  const handleAddNew = () => {
    navigate('/webapp/recruitment-app/referrals/add-new-referral');
  };

  // Helper: Generates beautiful premium candidate initials avatar gradients
  const getInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'accepted':
        return 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-emerald-600 shadow-emerald-100';
      case 'rejected':
        return 'bg-gradient-to-tr from-rose-400 via-red-500 to-rose-600 shadow-rose-100';
      case 'interview scheduled':
        return 'bg-gradient-to-tr from-blue-400 via-indigo-500 to-indigo-600 shadow-indigo-100';
      case 'pending':
      default:
        return 'bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 shadow-amber-100';
    }
  };

  // Helper: Renders elegant modern status badges
  const renderStatusBadge = (status: string) => {
    const norm = (status || '').toLowerCase();
    switch (norm) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50/80 text-emerald-700 border border-emerald-100/70 shadow-sm shadow-emerald-50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Accepted
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50/80 text-rose-700 border border-rose-100/70 shadow-sm shadow-rose-50">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Rejected
          </span>
        );
      case 'interview scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/80 text-blue-700 border border-blue-100/70 shadow-sm shadow-blue-50">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Interview
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50/80 text-amber-700 border border-amber-100/70 shadow-sm shadow-amber-50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1 py-4">
      {/* 1️⃣ Top Dashboard Analytical Statistics Widgets */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Referrals',
            count: stats.total,
            bg: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700',
            textColor: 'text-white',
            subText: 'Overall submissions',
            icon: <Users className="w-5 h-5 text-indigo-100" />
          },
          {
            label: 'Pending Review',
            count: stats.pending,
            bg: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow',
            textColor: 'text-slate-900',
            subText: 'Awaiting decision',
            icon: <div className="p-1.5 rounded-lg bg-amber-50 text-amber-500"><Clock className="w-4 h-4" /></div>
          },
          {
            label: 'Interview Scheduled',
            count: stats.interview,
            bg: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow',
            textColor: 'text-slate-900',
            subText: 'Actively in progress',
            icon: <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500"><Calendar className="w-4 h-4" /></div>
          },
          {
            label: 'Accepted Status',
            count: stats.accepted,
            bg: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow',
            textColor: 'text-slate-900',
            subText: 'Hired or offer sent',
            icon: <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500"><CheckCircle className="w-4 h-4" /></div>
          },
          {
            label: 'Rejected Status',
            count: stats.rejected,
            bg: 'bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow',
            textColor: 'text-slate-900',
            subText: 'Unsuccessful referrals',
            icon: <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500"><XCircle className="w-4 h-4" /></div>
          }
        ].map((item, idx) => (
          <div
            key={`stat-widget-${idx}`}
            className={`p-5 rounded-2xl flex flex-col justify-between overflow-hidden relative group transition-all duration-300 ${item.bg}`}
          >
            {/* Subtle premium background glow on hover for white cards */}
            {item.textColor !== 'text-white' && (
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
            <div className="flex items-center justify-between relative z-10">
              <span className={`text-xs font-semibold tracking-wider uppercase ${item.textColor === 'text-white' ? 'text-indigo-100' : 'text-slate-400'}`}>
                {item.label}
              </span>
              {item.icon}
            </div>
            <div className="mt-4 relative z-10">
              <h3 className={`text-3xl font-extrabold ${item.textColor}`}>
                {isLoading ? (
                  <span className="inline-block w-8 h-8 rounded bg-slate-200/50 animate-pulse" />
                ) : (
                  item.count
                )}
              </h3>
              <p className={`text-xs mt-1 ${item.textColor === 'text-white' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {item.subText}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 2️⃣ Search, Designation Chips and Status Pills Layout */}
      <section className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Box */}
          <div className="relative flex-grow max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by candidate name, email, or designation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all duration-300"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-slate-600 bg-slate-200/60 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="inline-flex items-center justify-center p-3 rounded-2xl border border-slate-200/80 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 hover:border-indigo-100 transition-all duration-300 disabled:opacity-50"
              title="Refresh dataset"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              Add Referral
            </button>
          </div>
        </div>

        {/* Horizontal Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hidden">
          {(['All', 'pending', 'interview scheduled', 'accepted', 'rejected'] as const).map((status) => {
            const isActive = selectedStatus === status;
            return (
              <button
                key={`status-pill-${status}`}
                onClick={() => setSelectedStatus(status)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-300 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                }`}
              >
                {status === 'interview scheduled' ? 'Interview' : status === 'pending' ? 'Pending' : status}
              </button>
            );
          })}
        </div>

        {/* Unique Designation Filter Pills */}
        {uniqueDesignations.length > 2 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100/60">
            <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" /> Filter Role:
            </span>
            {uniqueDesignations.map((designation) => {
              const isActive = selectedDesignation === designation;
              return (
                <button
                  key={`desig-pill-${designation}`}
                  onClick={() => setSelectedDesignation(designation)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    isActive
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {designation}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3️⃣ Custom Skeletons (Loading state) */}
      {isLoading ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="space-y-2 flex-grow">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="border-t border-slate-50 pt-4 space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/6" />
              </div>
            </div>
          ))}
        </section>
      ) : error ? (
        // 4️⃣ Error Handling UI
        <section className="bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center max-w-xl mx-auto">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Error Loading Referrals</h3>
          <p className="text-slate-600 text-sm mb-6">
            {(error as Error)?.message || 'An unexpected error occurred while fetching referred candidates.'}
          </p>
          <button
            onClick={() => refetch()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-colors"
          >
            Try Again
          </button>
        </section>
      ) : filteredReferrals.length === 0 ? (
        // 5️⃣ Empty State UI
        <section className="bg-white border border-slate-100 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-sm">
          <div className="p-4 bg-indigo-50 text-indigo-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-5">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No Referrals Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            {searchTerm.trim() || selectedStatus !== 'All' || selectedDesignation !== 'All'
              ? 'Try adjusting your search query, status filters, or role specifications to locate candidates.'
              : 'Add your first referred candidate to start tracking their application progress!'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {(searchTerm.trim() || selectedStatus !== 'All' || selectedDesignation !== 'All') ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('All');
                  setSelectedDesignation('All');
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={handleAddNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-colors"
              >
                Refer a Candidate
              </button>
            )}
          </div>
        </section>
      ) : (
        // 6️⃣ Main Grid List of Referral Cards
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filteredReferrals.map((referral) => (
            <div
              key={referral.name}
              onClick={() => handleCardClick(referral.name)}
              className="group relative overflow-hidden bg-white hover:bg-slate-50/50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 rounded-3xl p-6 transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between"
            >
              {/* Subtle hover neon top-right glow */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div>
                {/* Header: Avatar initials, candidate name, status badge */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-md shrink-0 ${getAvatarGradient(referral.status)}`}>
                    {getInitials(referral.full_name)}
                  </div>
                  <div className="min-w-0 flex-grow pt-0.5">
                    <h4 className="text-slate-900 font-extrabold text-base leading-tight truncate group-hover:text-indigo-600 transition-colors">
                      {referral.full_name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {referral.email}
                    </p>
                  </div>
                </div>

                {/* Body Details: Role Designation */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Briefcase className="w-3.5 h-3.5" /> Designation
                    </span>
                    <span className="font-semibold text-slate-800 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                      {referral.for_designation || 'General Profile'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> Date Submitted
                    </span>
                    <span className="font-semibold text-slate-800">
                      {referral.date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Status Badge, CTA Action Link */}
              <div className="border-t border-slate-100/70 mt-5 pt-4 flex items-center justify-between">
                {renderStatusBadge(referral.status)}
                
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 transition-all duration-300">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default ReferralList;