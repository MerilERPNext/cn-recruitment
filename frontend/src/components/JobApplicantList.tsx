// frontend/src/components/JobApplicantList.tsx
import { useLocation, useNavigate } from "react-router";
import FrappeListView from "./ListView";
// import { ChevronRight } from "lucide-react"; // No longer directly used here
// import { formatDistanceToNow } from "date-fns"; // No longer directly used here
import type { JobApplicant } from "../types/jobApplicant";
import ApplicantCard from './shared/ApplicantCard'; // Import the shared component
// import Avatar from './shared/Avatar'; // No longer needed here as it's used inside ApplicantCard

// Removed Avatar and ApplicantCard definitions from here

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

  const defaultFilters: Record<string, string> = {};
  if (filterDesignation) {
    defaultFilters.designation = filterDesignation;
  }
  if (filterJobTitle) {
    defaultFilters.job_title = filterJobTitle;
  }

  return (
    <div className="flex-grow h-full w-full bg-white overflow-y-auto">
      <FrappeListView
        doctype="Job Applicant"
        ItemComponent={(props: { item: JobApplicant }) => {
          return (
            <ApplicantCard item={props.item} onClick={handleApplicantClick} />
          );
        }}
        onItemClick={handleApplicantClick}
        infiniteScroll={true}
        isSearch={true}
        isFilter={false}
        defaultFilters={defaultFilters}
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
