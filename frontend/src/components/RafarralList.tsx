import React from 'react';
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
  id: number;
  refereeName: string;
  source: string;
  submitted: string;
  status: string;
  statusIcon: React.ReactNode;
  statusColor: string;
  imageUrl: string;
}

const referrals: Referral[] = [
  {
    id: 1,
    refereeName: 'Arjun Sharma',
    source: 'LinkedIn',
    submitted: '2023-10-26',
    status: 'Pending',
    statusIcon: <MdHourglassEmpty />,
    statusColor: 'text-yellow-500',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAt-FELbIBS5TVSC3TTO57mgqbRaprRIvMJA_ApPyXsxrKThPhD1CtHhmjBsC-LeP5U6APs_mtgkbDyqAIJRtz030j-mIucU9hDMYCMPl2-_sa1WWDnfu2OBtu8bEGnZTKTpHekmZ60ntESo_fEc9iRgTCMz6sDfgFkbFng7kq-pFEueonDMvgzUdJj1fQSEHJTpeqb0a7AmMTU5QTkdx9gVdSA7TmEeZ3U9tyQCp8K81AFu7RO_Q89t-yrM0dl_s_xBFNkGdotO9Gq',
  },
  {
    id: 2,
    refereeName: 'Priya Patel',
    source: 'Employee Referral',
    submitted: '2023-10-25',
    status: 'Interview Scheduled',
    statusIcon: <MdEvent />,
    statusColor: 'text-blue-500',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARlg8-IucoXnEsIYIeyN9EHMTNXweoRf5ETsXg-Xm4-9odowTzfa1Rd-2OBpiuLyK6aka_1sgccNF6fC0jYXN9nLiIQ6p8Tzxn7S2bw5988z8FIrsK6ZV_B1fRyAO7zkXrt05wmmWgGp__6TziNqMRIGnfeQ1vfBqmqxF6oIiOit8ce6EhxXRNJGn6vcyomPWB9TXPAhkqnRcv3Bl9X4uKJ27LsoY0CjuHrx73CjWV7lWbNTNZ4xSYL91jEynbDMe-NHmP6w3g_9N3',
  },
  {
    id: 3,
    refereeName: 'Rajesh Kumar',
    source: 'Company Website',
    submitted: '2023-10-24',
    status: 'Accepted',
    statusIcon: <MdCheckCircleOutline />,
    statusColor: 'text-green-500',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFWtQeInXYsky7NDsIIpeMhXAzcxYHT-2hkvgFObNXz_lprM3ZF2M5id6hPTVc22i5y631iL5QG8ZjZk-PzpzFDWYUkBglsLRIahrwrIMupyua-6zswy4dPTHGI95GKroufXdLqzpHiPTFjr-aIbL1DSj04oYg85Iwr3FsVl4fK-ZRkY8k7-1h7u8i6HnHccH4iBmUA4PwqKWJcPGnTvnDZvZqclW5wGy7cXQVCRJJ6djXWN6zopJzB_tzq2TgLH3W86fdHf5hjL5D',
  },
  {
    id: 4,
    refereeName: 'Sneha Gupta',
    source: 'Job Board',
    submitted: '2023-10-23',
    status: 'Rejected',
    statusIcon: <MdCancel />,
    statusColor: 'text-red-500',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_xeSUO1ugCDjr_plPCzzg1Y-ISj9j7_foaFpRejFZS2LNaKoWvTg0nd-vhTOSlmVCXkkSXWDs65xc5R44TIkbljYCp2qTJSlFEwIli6LgNfOm_jNfBECNhxGbIUAIiV1xe18hB-I9GLi4VW9SkvGOjH-v_qG_E-bWgHidiDrdMH2VqqOiDkJ_QIhgJiu0aCVcxW7XfXWqy8niIEqkVO1da3syzTJZ7NFYg3rrrm2GKPQjDel6FNIEyhGoMSdwH5Z14iLJitG2tu81',
  },
];

const ReferralList: React.FC = () => {
  const navigate = useNavigate();
  const handleGoToInterview = () => {
    navigate('/webapp/recruitment-app/referral-details');
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
        {referrals.map((referral) => (
          <div
            key={referral.id}
            onClick={handleGoToInterview}
            className="flex items-center gap-3 bg-[var(--background-light)] p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow border hover:border-[var(--border-light)] cursor-pointer "
          >
            {/* <input
              type="checkbox"
              className="checkbox-custom size-4 rounded border-[var(--border-light)] text-[var(--primary-color)] focus:ring-[var(--primary-color)] appearance-none shrink-0"
              onClick={(e) => e.stopPropagation()} // Prevents checkbox click from triggering navigation
            /> */}
            
            <div className="flex-grow min-w-0">
              <p className="text-[var(--text-primary)] text-base font-medium leading-tight line-clamp-1">
                {referral.refereeName}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Source: {referral.source}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Submitted: {referral.submitted}</p>
              <div className="flex items-center text-xs text-[var(--text-secondary)] mt-1">
                <span className={`text-sm mr-1 ${referral.statusColor}`}>{referral.statusIcon}</span>
                <span>Status: {referral.status}</span>
              </div>
            </div>
            <MdChevronRight className="text-[var(--text-secondary)]" />
          </div>
        ))}
      </div>
    </main>
  );
};

export default ReferralList;