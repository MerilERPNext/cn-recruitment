import { useNavigate } from 'react-router-dom';
import FrappeListView from './ListView';

const ChevronRightIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="m181.66,133.66-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
  </svg>
);

// Member Avatar Component
const MemberAvatar = ({ src, alt, size = "h-12 w-12" }: any) => (
  <img
    alt={alt}
    className={`aspect-square rounded-full ${size} object-cover`}
    src={src}
  />
);

// Member Card Component
const MemberCard = ({ item, onClick }: any) => {
  const member = item;
  return (
    <div
      className="flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
      onClick={() => onClick(member)}
    >
      <MemberAvatar
        src={member.avatar}
        alt={member.name}
      />
      <div className="flex-grow">
        <p className="text-gray-800 text-base font-medium leading-normal">{member.name}</p>
        <p className="text-gray-600 text-sm font-normal leading-normal">{member.role}</p>
      </div>
      <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
        <ChevronRightIcon />
      </button>
    </div>
  );
};

// Results Section Component

// Main App Component
const SearchMembersApp = () => {
  const navigate = useNavigate();

  const handleMemberClick = (member: any) => {
    navigate(`/webapp/id-card/${member.name}`);
    // Handle member selection/navigation
  };

  return (
    <div className="flex-grow h-full w-full bg-white overflow-y-auto p-4">

      <FrappeListView
        doctype="Employee"
        ItemComponent={MemberCard}
        onItemClick={handleMemberClick}
        infiniteScroll={true}
        isSearch={true}
        isFilter={true}
        defaultFields={['name', "first_name", "last_name", "department", "designation", "status"]}
        searchFields={['name', "first_name", "last_name", "department", "designation", "status"]}
      />
    </div>
  );
};

export default SearchMembersApp;