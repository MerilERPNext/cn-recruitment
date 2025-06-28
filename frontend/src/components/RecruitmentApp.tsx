import React, { JSX, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InterviewPage from './interview';
import { FaHome } from 'react-icons/fa';
import { MdBadge, MdWork, MdNotifications, MdSearch } from 'react-icons/md';
import { IoIosArrowBack } from 'react-icons/io';
import JobRequisition from './JobRequisition';
import ReferralList from './RafarralList';



interface NavItem {
  name: string;
  icon: JSX.Element;
  route: string;
  active?: boolean;
}

type TabName = 'Referrals' | 'Interviews' | 'Requirements' | 'Requisitions';

const RecruitmentApp: React.FC = () => {
  const navigate = useNavigate();
  const storedTab = sessionStorage.getItem('activeTab') as TabName | null;
  const [activeTab, setActiveTab] = useState<TabName>(storedTab || 'Referrals');



  const tabs: TabName[] = ['Referrals', 'Interviews', 'Requirements', 'Requisitions'];
  const navItems: (NavItem & { route?: string })[] = [
    { name: 'Home', icon: <FaHome />, route: '/' },
    { name: 'IDs', icon: <MdBadge />, route: '/id-card' },
    { name: 'Recruitment', icon: <MdWork />, active: true, route: '/recruitment' },
    { name: 'Alerts', icon: <MdNotifications />, route: '/alerts' },
    { name: 'Search', icon: <MdSearch />, route: '/search' },
  ];


  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
  };

  const handleAddNew = () => {
    navigate('/webapp/recruitment-app/add-new-referral'); // change this based on your route
  };

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
          .scrollbar-hidden {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
        }

       .scrollbar-hidden::-webkit-scrollbar {
       display: none; /* Chrome, Safari, Opera */
       }
      `}</style>

      {/* Header */}
      <header className="sticky z-50 top-0 bg-white shadow-sm">
        <div className="flex items-center p-1 justify-between">
          <button onClick={() => navigate('/')} className="text-[var(--text-primary)] rounded-full hover:bg-gray-100 p-2">
            <span className="text-xl font-semibold justify-center px-4 pb-3  text-slate-90"><IoIosArrowBack /></span>
          </button>
          <h1 className="text-xl font-semibold justify-center px-4  text-slate-900 text-center">{activeTab}</h1>
          <div className="w-8"></div>
        </div>

        {/* Tabs */}
        <nav className="border-b border-[var(--border-light)] px-2 flex overflow-x-auto scrollbar-hidden">

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
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        {(() => {
          switch (activeTab) {
            case 'Interviews':
              return <InterviewPage />;

            case 'Referrals':
              return <ReferralList />

            case 'Requirements':
              return <div className="text-center text-gray-500">Requirements content coming soon...</div>;

            case 'Requisitions':
              return <JobRequisition />;

            default:
              return null;
          }
        })()}
      </main>
      <button
        onClick={handleAddNew}
        className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-full hover:bg-blue-700 fixed bottom-20 right-4 z-50"
      >
        +
      </button>

      {/* Footer */}
      <footer className="bg-white border-t sticky bottom-0 z-50 flex justify-around py-2">
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