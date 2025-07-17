
// frontend/src/components/jobApplicantFilterList.tsx
import { useLocation, useNavigate } from "react-router";
import FrappeListView from "./ListView";
import { ArrowLeft } from "lucide-react"; // Only ArrowLeft needed here
// import { formatDistanceToNow } from "date-fns"; // No longer needed
import type { JobApplicant } from '../types/jobApplicant';
import ApplicantCard from './shared/ApplicantCard'; // Import the shared component

// Removed Avatar and ApplicantCard definitions from here

export default function JobApplicantFilterList() {
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

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex-grow h-full w-full bg-white overflow-y-auto p-4">
      <div className="py-4 flex justify-between items-center bg-white">
        <button
             onClick={handleGoBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

        <h1 className="text-lg font-semibold text-gray-900">
          Job Applicants
        </h1>

        <div className="w-12" />
      </div>

      <FrappeListView
        doctype="Job Applicant"
        ItemComponent={(props: { item: JobApplicant }) => {
          const { item } = props;

          const matchesDesignation = filterDesignation
            ? item.designation?.toLowerCase() ===
              filterDesignation.toLowerCase()
            : false;

          const matchesJobTitle = filterJobTitle
            ? item.job_title?.toLowerCase() === filterJobTitle.toLowerCase()
            : false;

          // Only render ApplicantCard if it matches filters
          if (matchesDesignation || matchesJobTitle) {
            return (
              <ApplicantCard item={item} onClick={handleApplicantClick} />
            );
          }

          return null; // Return null if item doesn't match filter criteria
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