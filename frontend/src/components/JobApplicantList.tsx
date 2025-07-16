import { useLocation, useNavigate } from "react-router";
import FrappeListView from "./ListView";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface JobApplicant {
  name: string;
  applicant_name: string;
  email_id?: string;
  phone_number?: string;
  job_title?: string;
  designation?: string;
  status?: string;
  country?: string;
  source?: string;
  applicant_rating?: number;
  resume_attachment?: string;
  resume_link?: string;
  notes?: string;
  creation: string;
  profile_image?: string;
}

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: string; // e.g., "h-14 w-14"
  fallback?: React.ReactNode; // Could be a fallback icon, initials, etc.
}
const Avatar = ({ src, alt, size = "h-14 w-14", fallback }: AvatarProps) => {
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

const ApplicantCard = ({
  item,
  onClick,
}: {
  item: JobApplicant;
  onClick: (item: JobApplicant) => void;
}) => {
  const fullName = item.applicant_name ;
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
   return (
  <div
    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
    onClick={() => onClick(item)}
  >
    <Avatar
        src={item.profile_image}
        alt={item.applicant_name}
        fallback={initials}
      />
    <div className="flex-grow min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-gray-900 text-base font-semibold truncate">
          {item.applicant_name}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
        {item.designation && <span>{item.designation}</span>}
        {item.designation && item.creation && <span className="mx-1">|</span>}
        {item.creation && (
          <span>
            Applied{" "}
            {formatDistanceToNow(new Date(item.creation), {
              addSuffix: true,
            }).replace("about ", "")}
          </span>
        )}
      </div>
    </div>
    <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
      <ChevronRight />
    </button>
  </div>
)}

export default function JobApplicantList() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const filterParam = queryParams.get("filter");

  let filterDesignation: string | null = null;
  let filterJobTitle: string | null = null;

  if (filterParam) {
    try {
      const parsedFilter = JSON.parse(decodeURIComponent(filterParam));
      filterDesignation = parsedFilter.designation || null;
      filterJobTitle = parsedFilter.job_title || null;
    } catch (error) {
      console.error("Failed to parse filter param:", error);
    }
  }

  const handleApplicantClick = (item: JobApplicant) => {
    navigate(`/webapp/recruitment-app/job-applicant-detail/${item.name}`);
  };


  return (
    <div className="flex-grow h-full w-full bg-white overflow-y-auto">
      <FrappeListView
        doctype="Job Applicant"
        ItemComponent={(props: { item: JobApplicant }) => {
          const { item } = props;

          const matchesDesignation = filterDesignation
            ? item.designation?.toLowerCase() ===
              filterDesignation.toLowerCase()
            : true; // ← agar filterDesignation nahi hai, to sab match honge

          const matchesJobTitle = filterJobTitle
            ? item.job_title?.toLowerCase() === filterJobTitle.toLowerCase()
            : true; // ← agar filterJobTitle nahi hai, to sab match honge

          if (matchesDesignation && matchesJobTitle) {
            return <ApplicantCard item={item} onClick={handleApplicantClick} />;
          }

          return null;
        }}
        onItemClick={handleApplicantClick}
        infiniteScroll={true}
        isSearch={true}
        isFilter={false}
        defaultFields={[
          "name",
          "applicant_name",
          "email_id",
          "phone_number",
          "job_title",
          "designation",
          "status",
          "country",
          "source",
          "applicant_rating",
          "resume_attachment",
          "resume_link",
          "notes",
          "creation",
        ]}
        searchFields={[
          "applicant_name",
          "email_id",
          "phone_number",
          "job_title",
          "designation",
          "status",
          "source",
        ]}
      />
    </div>
  );
}


