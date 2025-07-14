import FrappeListView from "../ListView";
import type { JobOpening } from "../../types/jobOpening";
import { useNavigate } from "react-router";

const JobOpeningsUI: React.FC = () => {
  const navigate = useNavigate();
  
  const handleGoToJobOpening = (item: JobOpening) => {
    const JobOpeningId = encodeURIComponent(item.name);
    navigate(`/webapp/recruitment-app/job-opening/${JobOpeningId}`);
  };
  return (
    <FrappeListView
      doctype="Job Opening"
      ItemComponent={JobOpeningItem}
      onItemClick={(item: JobOpening) => {
        handleGoToJobOpening(item);
      }}
      isSearch={true}
      pageSize={10}
      defaultFields={[
        "job_title",
        "name",
        "designation",
        "closes_on",
        "publish_applications_received",
        "status",
      ]}
      searchFields={["job_title", "status"]}
      infiniteScroll={true}
    />
  );
};

const JobOpeningItem: React.FC<{
  item: JobOpening;
  index?: number;
  doctype: string;
}> = ({ item }) => {
  const navigate = useNavigate();
  
  const handleViewApplicants = () => {
    const filterDesignation = encodeURIComponent(item.designation);
    const jobTitle = encodeURIComponent(item.job_title);
    navigate(
      `/webapp/recruitment-app/referral-details?designation=${filterDesignation}&job_title=${jobTitle}`
    );
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
    
    switch (normalizedStatus) {
      case 'open':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-200'
        };
      case 'in-progress':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-200'
        };
      case 'closed':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-200'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          border: 'border-gray-200'
        };
    }
  };

  const statusColors = getStatusColor(item.status);

  return (
    <div className="rounded-2xl bg-white p-4 border">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{item.job_title}</h3>
          <p className="text-sm text-gray-500">{item.designation}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
            {item.status}
          </span>
          <button className="text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <span>{item.publish_applications_received} applicants</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{item.closes_on}</span>
        </div>
      </div>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleViewApplicants}
          className="flex-1 rounded-full bg-gray-100 py-2 text-sm font-medium text-gray-900"
        >
          View Applicants
        </button>
        <button className="rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white">
          Edit
        </button>
      </div>
    </div>
  );
};

export default JobOpeningsUI;