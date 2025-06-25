import { useState } from 'react';

// Icon Components using SVGs
const BackIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
  </svg>
);

const ErrorIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"></path>
  </svg>
);

const CampaignIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,120v16a40,40,0,0,1-40,40H164a20,20,0,0,1-20,20H112a20,20,0,0,1-20-20H72a40,40,0,0,1-40-40V120a40,40,0,0,1,40-40H92a20,20,0,0,1,20-20h32a20,20,0,0,1,20,20h20A40,40,0,0,1,224,120ZM72,96a24,24,0,0,0-24,24v16a24,24,0,0,0,24,24H208V120a24,24,0,0,0-24-24Z"></path>
  </svg>
);

const WorkIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72H216ZM40,130.84A200.19,200.19,0,0,0,128,152a200.19,200.19,0,0,0,88-21.16V200H40Z"></path>
  </svg>
);

const BadgeIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM40,56H216V88H40ZM40,200V104H216v96Z"></path>
  </svg>
);

const EventIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-96-88v64a8,8,0,0,1-16,0V132.94l-4.42,2.22a8,8,0,0,1-7.16-14.32l16-8A8,8,0,0,1,112,120Zm59.16,30.45L152,176h16a8,8,0,0,1,0,16H136a8,8,0,0,1-6.4-12.8l28.78-38.37A8,8,0,1,0,145.07,132a8,8,0,1,1-13.85-8A24,24,0,0,1,176,136,23.76,23.76,0,0,1,171.16,150.45Z"></path>
  </svg>
);

const SearchIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M230.92,212l-54.32-54.32a88.21,88.21,0,1,0-18.84,18.84L212,230.92a12,12,0,1,0,18.92-15Zm-203.15-100a64,64,0,1,1,64,64A64.07,64.07,0,0,1,27.77,112Z"></path>
  </svg>
);

// Header Component
const Header = ({ title, onBackClick }: any) => (
  <header className="bg-white shadow-sm sticky top-0 z-10">
    <div className="flex items-center p-4 pb-3 justify-between">
      <button
        className="text-gray-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        onClick={onBackClick}
      >
        <BackIcon />
      </button>
      <h1 className="text-gray-800 text-xl font-semibold leading-tight flex-1 text-center pr-10">
        {title}
      </h1>
    </div>
  </header>
);

// Navigation Tab Component
const NavTab = ({ label, isActive, hasNotification, onClick }: any) => (
  <a
    className={`flex flex-col items-center justify-center border-b-[3px] pb-3 pt-3 flex-1 relative cursor-pointer ${
      isActive
        ? 'border-b-blue-500 text-blue-500'
        : 'border-b-transparent text-gray-600 hover:text-gray-800'
    }`}
    onClick={onClick}
  >
    <p className="text-sm font-semibold">{label}</p>
    {hasNotification && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
    )}
  </a>
);

// Navigation Component
const Navigation = ({ activeTab, onTabChange }: any) => (
  <nav className="pb-0">
    <div className="flex border-b border-gray-200 px-4 gap-4">
      <NavTab
        label="All"
        isActive={activeTab === 'all'}
        onClick={() => onTabChange('all')}
      />
      <NavTab
        label="Unread"
        isActive={activeTab === 'unread'}
        hasNotification={true}
        onClick={() => onTabChange('unread')}
      />
      <NavTab
        label="Archived"
        isActive={activeTab === 'archived'}
        onClick={() => onTabChange('archived')}
      />
    </div>
  </nav>
);

// Unread Indicator Component
const UnreadIndicator = ({ color = 'bg-blue-500' }) => (
  <div className={`absolute top-2 right-2 w-3 h-3 ${color} rounded-full`} title="Unread notification" />
);

// Notice Icon Component
const NoticeIcon = ({ icon: Icon, color, bgColor }: any) => (
  <div className={`${color} flex items-center justify-center rounded-full ${bgColor} shrink-0 size-10`}>
    <Icon />
  </div>
);

// Action Button Component
const ActionButton = ({ children, onClick, variant = 'primary', className = '' }: any) => {
  const baseClasses = "text-xs font-medium py-1.5 px-3 rounded-md transition-colors";
  const variantClasses: any = {
    primary: "bg-blue-500 text-white hover:bg-blue-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300"
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

// Notice Card Component
const NoticeCard = ({ notice, onActionClick }: any) => {
  const getIconComponent = () => {
    const iconMap: any = {
      error: { icon: ErrorIcon, color: 'text-red-500', bgColor: 'bg-red-100' },
      campaign: { icon: CampaignIcon, color: 'text-blue-500', bgColor: 'bg-blue-50' },
      work: { icon: WorkIcon, color: 'text-green-500', bgColor: 'bg-green-100' },
      badge: { icon: BadgeIcon, color: 'text-purple-500', bgColor: 'bg-purple-100' },
      event: { icon: EventIcon, color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
      search: { icon: SearchIcon, color: 'text-teal-500', bgColor: 'bg-teal-100' }
    };
    return iconMap[notice.iconType] || iconMap.campaign;
  };

  const iconConfig = getIconComponent();
  const borderColor = notice.priority === 'high' ? 'border-red-200' : 'border-gray-200';
  const unreadColor = notice.priority === 'high' ? 'bg-red-500' : 'bg-blue-500';

  return (
    <div className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border ${borderColor} relative`}>
      {notice.isUnread && <UnreadIndicator color={unreadColor} />}
      
      <NoticeIcon
        icon={iconConfig.icon}
        color={iconConfig.color}
        bgColor={iconConfig.bgColor}
      />
      
      <div className="flex-grow">
        <div className="flex justify-between items-start mb-1">
          <p className="text-gray-800 text-base font-semibold leading-tight">{notice.title}</p>
          <p className="text-gray-600 text-xs font-normal">{notice.time}</p>
        </div>
        <p className="text-gray-600 text-sm font-normal leading-relaxed line-clamp-2 mb-2">
          {notice.message}
        </p>
        {notice.action && (
          <ActionButton
            variant={notice.action.variant}
            onClick={() => onActionClick(notice.id, notice.action.type)}
          >
            {notice.action.label}
          </ActionButton>
        )}
      </div>
    </div>
  );
};

// Notices List Component
const NoticesList = ({ notices, onActionClick }: any) => (
  <main className="p-4 space-y-3">
    {notices.map((notice: any) => (
      <NoticeCard
        key={notice.id}
        notice={notice}
        onActionClick={onActionClick}
      />
    ))}
  </main>
);

// Main App Component
const NoticesApp = () => {
  const [activeTab, setActiveTab] = useState('all');

  // Sample notices data
  const allNotices = [
    {
      id: 1,
      title: "Action Required: Overdue Task",
      message: "Your assigned task \"Finalize Q3 Budget\" is overdue by 2 days.",
      time: "Now",
      iconType: "error",
      isUnread: true,
      priority: "high",
      action: { label: "View Task", type: "view_task", variant: "danger" }
    },
    {
      id: 2,
      title: "Company Announcement",
      message: "Join us for the all-hands meeting next Monday at 10 AM PST.",
      time: "1h ago",
      iconType: "campaign",
      isUnread: true,
      priority: "medium",
      action: { label: "Add to Calendar", type: "add_calendar", variant: "primary" }
    },
    {
      id: 3,
      title: "Recruitment Update",
      message: "New candidate applications received for the Software Engineer role.",
      time: "2d ago",
      iconType: "work",
      isUnread: false,
      priority: "low"
    },
    {
      id: 4,
      title: "Employee IDs Ready",
      message: "New employee ID cards are printed and ready for distribution.",
      time: "1w ago",
      iconType: "badge",
      isUnread: false,
      priority: "low"
    },
    {
      id: 5,
      title: "Meeting Reminder",
      message: "Reminder: Upcoming team meeting scheduled for tomorrow at 2 PM.",
      time: "3w ago",
      iconType: "event",
      isUnread: false,
      priority: "low",
      action: { label: "Dismiss", type: "dismiss", variant: "secondary" }
    },
    {
      id: 6,
      title: "Member Search Results",
      message: "The search results for \"John Doe\" are now available.",
      time: "1m ago",
      iconType: "search",
      isUnread: false,
      priority: "low"
    }
  ];

  // Filter notices based on active tab
  const getFilteredNotices = () => {
    switch (activeTab) {
      case 'unread':
        return allNotices.filter(notice => notice.isUnread);
      case 'archived':
        return []; // No archived notices in this example
      default:
        return allNotices;
    }
  };

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    // Handle navigation back
  };

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    console.log(`Tab changed to: ${tab}`);
  };

  const handleActionClick = (noticeId: any, actionType: any) => {
    console.log(`Action clicked: ${actionType} for notice ${noticeId}`);
    // Handle specific actions based on actionType
    switch (actionType) {
      case 'view_task':
        // Navigate to task view
        break;
      case 'add_calendar':
        // Add event to calendar
        break;
      case 'dismiss':
        // Dismiss notice
        break;
      default:
        break;
    }
  };

  return (
    <div 
      className="relative flex size-full min-h-screen flex-col justify-between bg-gray-50 overflow-x-hidden"
      style={{ 
        fontFamily: 'Inter, "Noto Sans", sans-serif',
        minHeight: 'max(884px, 100dvh)'
      }}
    >
      <div className="flex-grow">
        <Header 
          title="Notices"
          onBackClick={handleBackClick}
        />
        
        <Navigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        
        <NoticesList 
          notices={getFilteredNotices()}
          onActionClick={handleActionClick}
        />
      </div>
    </div>
  );
};

export default NoticesApp;