import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import "../index.css";
import {
  MdSearch,
  MdFilterList,
  MdChevronRight,
  MdHourglassEmpty,
  MdEvent,
  MdCheckCircleOutline,
  MdCancel
} from 'react-icons/md';

interface Referral {
  name: string;
  full_name: string;
  email: string;
  date: string;
  status: string;
  for_designation: string;
}

const statuses = ['Pending', 'Interview Scheduled', 'In Process', 'Rejected'];

const ReferralList: React.FC = () => {
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [designationOptions, setDesignationOptions] = useState<{ label: string; value: string }[]>([]);

  // Temp filter states
  const [tempStatuses, setTempStatuses] = useState<string[]>([]);
  const [tempDesignation, setTempDesignation] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempDate, setTempDate] = useState('');

  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { icon: <MdHourglassEmpty />, color: 'text-yellow-500' };
      case 'interview scheduled':
        return { icon: <MdEvent />, color: 'text-blue-500' };
      case 'accepted':
        return { icon: <MdCheckCircleOutline />, color: 'text-green-500' };
      case 'rejected':
        return { icon: <MdCancel />, color: 'text-red-500' };
      default:
        return { icon: <MdHourglassEmpty />, color: 'text-gray-500' };
    }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/method/recruitment.api.employee_referral.get_my_referrals');
      const referrals = res.data.message.referrals || [];
      setAllReferrals(referrals);
      setFilteredReferrals(referrals);
    } catch (err) {
      console.error("Error fetching referrals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const res = await fetch("/api/resource/Designation?fields=[\"name\"]");
        const result = await res.json();
        const options = result.data.map((designation: { name: string }) => ({
          label: designation.name,
          value: designation.name,
        }));
        setDesignationOptions(options);
      } catch (err) {
        console.error("Error fetching designations:", err);
      }
    };

    fetchDesignations();
  }, []);

  useEffect(() => {
    let filtered = [...allReferrals];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ref =>
        ref.full_name.toLowerCase().includes(query) ||
        ref.email.toLowerCase().includes(query) ||
        ref.status.toLowerCase().includes(query) ||
        ref.for_designation.toLowerCase().includes(query)
      );
    }

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(ref => selectedStatuses.includes(ref.status));
    }

    if (selectedDesignation) {
      filtered = filtered.filter(ref => ref.for_designation === selectedDesignation);
    }

    if (emailFilter.trim()) {
      filtered = filtered.filter(ref =>
        ref.email.toLowerCase().includes(emailFilter.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(ref => ref.date === dateFilter);
    }

    setFilteredReferrals(filtered);
  }, [searchQuery, selectedStatuses, selectedDesignation, emailFilter, dateFilter, allReferrals]);

  useEffect(() => {
    if (filterOpen) {
      setTempStatuses(selectedStatuses);
      setTempDesignation(selectedDesignation);
      setTempEmail(emailFilter);
      setTempDate(dateFilter);
    }
  }, [filterOpen]);

  const handleClick = (referralId: string) => {
    navigate(`/webapp/recruitment-app/referral-details/${referralId}`);
  };

  return (
    <main className="px-2 pt-6 pb-20">
      <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight mb-4">Referrals</h2>
      <div className="mb-4 flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 w-full border border-gray-300 bg-white rounded-lg px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
            <MdSearch className="text-gray-400 text-lg" />
            <input
              className="flex-grow bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
              placeholder="Search requisitions..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Button */}
        <div className="shrink-0">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition whitespace-nowrap"
          >
            <MdFilterList className="text-gray-500" />
            <span className="text-gray-700">Filters</span>
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t border-gray-200 rounded-t-2xl shadow-2xl p-3 max-h-[50vh] transition-transform duration-300">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-semibold text-gray-800">Filter Referrals</h3>
            <button
              onClick={() => setFilterOpen(false)}
              className="text-gray-600 hover:text-red-500 text-lg font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            {/* STATUS CHECKBOXES */}
            <div>
              <p className="font-medium mb-1 text-gray-800">Status</p>
              <div className="flex gap-3 flex-wrap">
                {statuses.map((status) => (
                  <label key={status} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempStatuses.includes(status)}
                      onChange={() =>
                        setTempStatuses((prev) =>
                          prev.includes(status)
                            ? prev.filter((s) => s !== status)
                            : [...prev, status]
                        )
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* DESIGNATION */}
            <div>
              <label className="font-medium block mb-1 text-gray-800">Designation</label>
              <Select
                isClearable
                placeholder="Select designation"
                className="text-sm"
                options={designationOptions}
                value={tempDesignation ? { label: tempDesignation, value: tempDesignation } : null}
                onChange={(option) => setTempDesignation(option ? option.value : '')}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="font-medium block mb-1 text-gray-800">Email</label>
              <input
                type="email"
                placeholder="Filter by email"
                className="w-full rounded border border-gray-300 bg-gray-50 py-1 px-2 text-gray-800 text-sm"
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
              />
            </div>

            {/* DATE */}
            <div>
              <label className="font-medium block mb-1 text-gray-800">Date</label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 bg-gray-50 py-1 px-2 text-gray-800 text-sm"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={() => {
                  setTempStatuses([]);
                  setTempDesignation('');
                  setTempEmail('');
                  setTempDate('');
                  setSelectedStatuses([]);
                  setSelectedDesignation('');
                  setEmailFilter('');
                  setDateFilter('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-red-500"
              >
                Clear All
              </button>

              <button
                onClick={() => {
                  setSelectedStatuses(tempStatuses);
                  setSelectedDesignation(tempDesignation);
                  setEmailFilter(tempEmail);
                  setDateFilter(tempDate);
                  setFilterOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFERRAL LIST */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : filteredReferrals.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">No referrals found.</p>
        ) : (
          filteredReferrals.map((referral, index) => {
            const { icon, color } = getStatusIcon(referral.status);
            return (
              <div
                key={index}
                onClick={() => handleClick(referral.name)}
                className="flex items-center gap-3 bg-[var(--background-light)] p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow border hover:border-[var(--border-light)] cursor-pointer"
              >
                <div className="flex-grow min-w-0">
                  <p className="text-[var(--text-primary)] text-base font-medium leading-tight line-clamp-1">
                    {referral.full_name}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Email: {referral.email}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Designation: {referral.for_designation}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Submitted: {referral.date}</p>
                  <div className="flex items-center text-xs text-[var(--text-secondary)] mt-1">
                    <span className={`text-sm mr-1 ${color}`}>{icon}</span>
                    <span>Status: {referral.status}</span>
                  </div>
                </div>
                <MdChevronRight className="text-[var(--text-secondary)]" />
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};

export default ReferralList;
