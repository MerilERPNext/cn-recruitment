import { useNavigate } from "react-router";
import FrappeListView from "./ListView";
import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";


// Avatar helper (fallback to initials if no image)
const Avatar = ({ src, name }: { src?: string; name: string }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="aspect-square rounded-full h-12 w-12 object-cover border border-gray-200 bg-white"
      />
    );
  }
  // Fallback: initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-lg uppercase h-12 w-12">
      {initials}
    </div>
  );
};

// Card for each applicant
const ApplicantCard = ({ item, onClick }: any) => (
  <div
    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
    onClick={() => onClick(item)}
  >
    <Avatar src={item.profile_image} name={item.applicant_name} />
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
      Applied {formatDistanceToNow(new Date(item.creation), { addSuffix: true }).replace("about ", "")}
    </span>
  )}
</div>
    </div>
    <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
      <ChevronRight />
    </button>
  </div>
);

export default function JobApplicantList() {
  const navigate = useNavigate();

  const handleApplicantClick = (item: any) => {
    navigate(`/webapp/recruitment-app/job-applicant-detail/${item.name}`);
  };

  return (
    <div className="flex-grow h-full w-full bg-white overflow-y-auto p-4">
      <FrappeListView
        doctype="Job Applicant"
        ItemComponent={(props) => (
          <ApplicantCard {...props} onClick={handleApplicantClick} />
        )}
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
