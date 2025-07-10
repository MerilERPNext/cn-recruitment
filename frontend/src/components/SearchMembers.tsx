import { useNavigate } from 'react-router-dom';
import FrappeListView from './ListView';

const ChevronRightIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="m181.66,133.66-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
  </svg>
);
interface MemberAvatarProps {
  src?: string;
  alt?: string;
  size?: string; // e.g., "h-14 w-14"
  fallback?: React.ReactNode; // Could be a fallback icon, initials, etc.
}
// Member Avatar Component
const MemberAvatar = ({ src, alt, size = "h-14 w-14", fallback }: MemberAvatarProps) => {
  if (src) {
    return (
      <img
        alt={alt}
        className={`aspect-square rounded-full ${size} object-cover border border-gray-200 bg-white`}
        src={src}
      />
    );
  }
  // Fallback: initials
  return (
    <div className={`flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase ${size}`}
      style={{ minWidth: '3.5rem', minHeight: '3.5rem' }}
    >
      {fallback}
    </div>
  );
};

// Member Card Component
const MemberCard = ({ item, onClick }: any) => {
  const member = item;
  // Prefer full name, fallback to first+last or name
  const fullName = member.employee_name || [member.first_name, member.last_name].filter(Boolean).join(' ') || member.name;
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const designation = member.designation || '';
  const department = member.department || '';
  const status = member.status || '';
  const phone = member.cell_number || '';
  const email = member.company_email || member.personal_email || '';
  // Status color
  const statusColor = status === 'Active' ? 'bg-green-100 text-green-700' :
    status === 'Inactive' ? 'bg-gray-100 text-gray-500' :
    status === 'Suspended' ? 'bg-yellow-100 text-yellow-700' :
    status === 'Left' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500';

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
      onClick={() => onClick(member)}
    >
      <MemberAvatar
        src={member.image}
        alt={fullName}
        fallback={initials}
      />
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-gray-900 text-base font-semibold truncate">{fullName}</p>
          {status && (
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{status}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
          {designation && <span>{designation}</span>}
          {designation && department && <span className="mx-1">·</span>}
          {department && <span>{department}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          {phone && <span>📞 {phone}</span>}
          {email && <span>✉️ {email}</span>}
        </div>
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
        // isFilter={true}
        defaultFields={['name', "first_name", "last_name", "department", "designation", "status", "image"]}
        searchFields={['name', "first_name", "last_name", "department", "designation", "status"]}
      />
    </div>
  );
};

export default SearchMembersApp;