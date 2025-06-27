import React, { JSX, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InterviewPage from './interview';
import { FaHome } from 'react-icons/fa';
import { MdBadge, MdWork, MdNotifications, MdSearch } from 'react-icons/md';
import { IoIosArrowBack } from 'react-icons/io';

// Types and Interfaces
interface Referral {
  id: number;
  title: string;
  source: string;
  submitted: string;
  status: string;
  statusIcon: string;
  statusColor: string;
  avatar: string;
}

interface NavItem {
  name: string;
  icon: JSX.Element;
  route: string;
  active?: boolean;
}

type TabName = 'Referrals' | 'Interviews' | 'Requirements' | 'Requisitions';

const RecruitmentApp: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedReferrals, setSelectedReferrals] = useState<Set<number>>(new Set());
  const storedTab = sessionStorage.getItem('activeTab') as TabName | null;
  const [activeTab, setActiveTab] = useState<TabName>(storedTab || 'Referrals');

  const referrals: Referral[] = [
    {
      id: 1,
      title: "Referral for Software Engineer",
      source: "LinkedIn",
      submitted: "2023-10-26",
      status: "Pending",
      statusIcon: "hourglass_empty",
      statusColor: "text-yellow-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAt-FELbIBS5TVSC3TTO57mgqbRaprRIvMJA_ApPyXsxrKThPhD1CtHhmjBsC-LeP5U6APs_mtgkbDyqAIJRtz030j-mIucU9hDMYCMPl2-_sa1WWDnfu2OBtu8bEGnZTKTpHekmZ60ntESo_fEc9iRgTCMz6sDfgFkbFng7kq-pFEueonDMvgzUdJj1fQSEHJTpeqb0a7AmMTU5QTkdx9gVdSA7TmEeZ3U9tyQCp8K81AFu7RO_Q89t-yrM0dl_s_xBFNkGdotO9Gq"
    },
    {
      id: 2,
      title: "Referral for Product Manager",
      source: "Employee Referral",
      submitted: "2023-10-25",
      status: "Interview Scheduled",
      statusIcon: "event",
      statusColor: "text-blue-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuARlg8-IucoXnEsIYIeyN9EHMTNXweoRf5ETsXg-Xm4-9odowTzfa1Rd-2OBpiuLyK6aka_1sgccNF6fC0jYXN9nLiIQ6p8Tzxn7S2bw5988z8FIrsK6ZV_B1fRyAO7zkXrt05wmmWgGp__6TziNqMRIGnfeQ1vfBqmqxF6oIiOit8ce6EhxXRNJGn6vcyomPWB9TXPAhkqnRcv3Bl9X4uKJ27LsoY0CjuHrx73CjWV7lWbNTNZ4xSYL91jEynbDMe-NHmP6w3g_9N3"
    },
    {
      id: 3,
      title: "Referral for Data Analyst",
      source: "Company Website",
      submitted: "2023-10-24",
      status: "Accepted",
      statusIcon: "check_circle_outline",
      statusColor: "text-green-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFWtQeInXYsky7NDsIIpeMhXAzcxYHT-2hkvgFObNXz_lprM3ZF2M5id6hPTVc22i5y631iL5QG8ZjZk-PzpzFDWYUkBglsLRIahrwrIMupyua-6zswy4dPTHGI95GKroufXdLqzpHiPTFjr-aIbL1DSj04oYg85Iwr3FsVl4fK-ZRkY8k7-1h7u8i6HnHccH4iBmUA4PwqKWJcPGnTvnDZvZqclW5wGy7cXQVCRJJ6djXWN6zopJzB_tzq2TgLH3W86fdHf5hjL5D"
    },
    {
      id: 4,
      title: "Referral for UX Designer",
      source: "Job Board",
      submitted: "2023-10-23",
      status: "Rejected",
      statusIcon: "cancel_outline",
      statusColor: "text-red-500",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuC_xeSUO1ugCDjr_plPCzzg1Y-ISj9j7_foaFpRejFZS2LNaKoWvTg0nd-vhTOSlmVCXkkSXWDs65xc5R44TIkbljYCp2qTJSlFEwIli6LgNfOm_jNfBECNhxGbIUAIiV1xe18hB-I9GLi4VW9SkvGOjH-v_qG_E-bWgHidiDrdMH2VqqOiDkJ_QIhgJiu0aCVcxW7XfXWqy8niIEqkVO1da3syzTJZ7NFYg3rrrm2GKPQjDel6FNIEyhGoMSdwH5Z14iLJitG2tu81"
    }
  ];

  const tabs: TabName[] = ['Referrals', 'Interviews', 'Requirements', 'Requisitions'];
  const navItems: (NavItem & { route?: string })[] = [
    { name: 'Home', icon: <FaHome />, route: '/' },
    { name: 'IDs', icon: <MdBadge />, route: '/id-card' },
    { name: 'Recruitment', icon: <MdWork />, active: true, route: '/recruitment' },
    { name: 'Alerts', icon: <MdNotifications />, route: '/alerts' },
    { name: 'Search', icon: <MdSearch />, route: '/search' },
  ];


  const handleCheckboxChange = (id: number): void => {
    const newSelected = new Set(selectedReferrals);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedReferrals(newSelected);
  };
  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
  };

  const filteredReferrals = referrals.filter((referral) =>
    referral.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    referral.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <style>{`
        :root {
          --primary-color: #0c7ff2;
          --secondary-color: #60758a;
          --text-primary: #111418;
          --text-secondary: #60758a;
          --background-light: #ffffff;
          --background-medium: #f0f2f5;
          --border-light: #dbe0e6;
        }
        .checkbox-custom:checked {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
        }
        .checkbox-custom:checked::before {
          content: "✔";
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 10px;
        }
        .material-icons {
          font-family: 'Material Icons';
          font-size: 24px;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm">
        <div className="flex items-center p-1 justify-between">
          <button onClick={() => navigate('/')} className="text-[var(--text-primary)] rounded-full hover:bg-gray-100 p-2">
            <span className="text-xl font-semibold justify-center px-4 pb-3  text-slate-90"><IoIosArrowBack /></span>
          </button>
          <h1 className="text-xl font-semibold justify-center px-4  text-slate-900 text-center">{activeTab}</h1>
          <div className="w-8"></div>
        </div>

        {/* Tabs */}
        <nav className="border-b border-[var(--border-light)] px-2 flex overflow-x-auto">
          {tabs.map((tab) => (
            <a
              key={tab}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleTabChange(tab);
              }}
              className={`px-4 py-3 border-b-2 text-sm font-medium ${activeTab === tab
                  ? 'border-[var(--primary-color)] text-[var(--primary-color)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:border-[var(--primary-color)]'
                }`}
            >
              {tab}
            </a>
          ))}
        </nav>

      </header>

      {/* Main Content */}
      <main className="p-4 flex-grow">
        {(() => {
          switch (activeTab) {
            case 'Interviews':
              return <InterviewPage />;

            case 'Referrals':
              return (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Referrals</h2>
                    <div className="flex gap-2">
                      <button className="text-gray-500 hover:text-blue-500">
                        <span className="material-icons">delete</span>
                      </button>
                      <button className="text-gray-500 hover:text-blue-500">
                        <span className="material-icons">more_vert</span>
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 flex gap-2">
                    <div className="relative flex-grow">
                      <span className="material-icons absolute left-3 top-2.5 text-gray-400">search</span>
                      <input
                        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                        placeholder="Search referrals..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <button className="border px-3 rounded-lg text-gray-500 hover:bg-gray-100">
                      <span className="material-icons">filter_list</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {filteredReferrals.map((referral) => (
                      <div key={referral.id} className="flex gap-3 p-3 border rounded-lg hover:shadow">
                        <input
                          type="checkbox"
                          className="checkbox-custom h-4 w-4"
                          checked={selectedReferrals.has(referral.id)}
                          onChange={() => handleCheckboxChange(referral.id)}
                        />
                        <div
                          className="w-12 h-12 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${referral.avatar})` }}
                        ></div>
                        <div className="flex-grow">
                          <p className="font-medium">{referral.title}</p>
                          <p className="text-xs text-gray-500">Source: {referral.source}</p>
                          <p className="text-xs text-gray-500">Submitted: {referral.submitted}</p>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <span className={`material-icons ${referral.statusColor}`}>{referral.statusIcon}</span>
                            {referral.status}
                          </div>
                        </div>
                        <span className="material-icons text-gray-400">chevron_right</span>
                      </div>
                    ))}
                  </div>
                </>
              );

            case 'Requirements':
              return <div className="text-center text-gray-500">Requirements content coming soon...</div>;

            case 'Requisitions':
              return <div className="text-center text-gray-500">Requisitions content coming soon...</div>;

            default:
              return null;
          }
        })()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t sticky bottom-0 flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => item.route && navigate(item.route)}
            className={`flex flex-col items-center text-sm ${item.active
                ? 'text-[var(--primary-color)]'
                : 'text-gray-500 hover:text-[var(--primary-color)]'
              }`}
          >
            <span className="material-icons">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </footer>



    </div>
  );
};

export default RecruitmentApp;