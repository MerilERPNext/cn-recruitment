import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import "../index.css";
import {
  MdDelete,
  MdMoreVert,
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

const ReferralList: React.FC = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await axios.get('/api/method/recruitment.api.employee_referral.get_my_referrals');
        setReferrals(res.data.message.referrals || []);
      } catch (err) {
        console.error("Error fetching referrals", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, []);

  const handleClick = (referralId: string) => {
    navigate(`/webapp/recruitment-app/referral-details/${referralId}`);
  };

  return (
    <main className="px-2 pt-6 pb-20">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[var(--text-primary)] text-lg font-semibold leading-tight">Referrals</h2>
        <div className="flex items-center gap-2">
          <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
            <MdDelete />
          </button>
          <button className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors">
            <MdMoreVert />
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-grow">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] py-2.5 pl-10 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)]"
            placeholder="Search referrals..."
            type="text"
          />
        </div>
        <button className="flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--background-light)] px-3 text-[var(--text-secondary)] hover:bg-[var(--background-medium)] transition-colors">
          <MdFilterList />
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : referrals.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">No referrals found.</p>
        ) : (
          referrals.map((referral, index) => {
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
