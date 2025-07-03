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
      filtered = filtered.filter(ref =>
        ref.full_name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleClick = (referralId: string) => {
    navigate(`/webapp/recruitment-app/referral-details/${referralId}`);
  };

  return (
    <main className="px-2 pt-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight">Referrals</h2>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-1 border border-[var(--border-light)] rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--background-medium)] transition"
        >
          <MdFilterList />
          Filter
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-grow">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)]"
            placeholder="Search referrals..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filterOpen && (
        <div className="mb-6 p-4 bg-[var(--background-light)] rounded-lg border border-[var(--border-light)] space-y-4">
          <div>
            <p className="font-semibold mb-2 text-[var(--text-primary)]">Status</p>
            <div className="flex gap-4 flex-wrap">
              {statuses.map((status) => (
                <label key={status} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => toggleStatus(status)}
                  />
                  <span className="text-[var(--text-primary)]">{status}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1 text-[var(--text-primary)]">
              Designation
            </label>
            <Select
              isClearable
              placeholder="Select designation"
              className="text-sm"
              options={designationOptions}
              value={selectedDesignation ? { label: selectedDesignation, value: selectedDesignation } : null}
              onChange={(option) => setSelectedDesignation(option ? option.value : '')}
              styles={{
                control: (base) => ({
                  ...base,
                  backgroundColor: 'var(--background-light)',
                  borderColor: 'var(--border-light)',
                  color: 'var(--text-primary)',
                }),
                singleValue: (base) => ({
                  ...base,
                  color: 'var(--text-primary)',
                }),
                placeholder: (base) => ({
                  ...base,
                  color: 'var(--text-secondary)',
                }),
              }}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-[var(--text-primary)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Filter by email"
              className="w-full rounded border border-[var(--border-light)] bg-[var(--background-light)] py-2 px-3 text-[var(--text-primary)]"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold block mb-1 text-[var(--text-primary)]" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="w-full rounded border border-[var(--border-light)] bg-[var(--background-light)] py-2 px-3 text-[var(--text-primary)]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
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
