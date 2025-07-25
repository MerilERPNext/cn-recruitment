import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import FrappeListView from "./ListView";

interface Interview {
  name: string;
  from_time: string;
  to_time: string;
  job_applicant: string;
  status: string;
}

const InterviewPage = () => {
  const navigate = useNavigate();

  const handleGoToInterview = (interviewId: string) => {
    navigate(`/webapp/recruitment-app/interviews/${interviewId}`);
  };

  // TODO: Add custom API integration here if needed

  return (
    <FrappeListView
      doctype="Interview"
      ItemComponent={InterViewItem}
      onItemClick={(item: Interview) => {
        handleGoToInterview(item.name);
      }}
      isSearch={true}
      pageSize={10}
      defaultFields={["name", "from_time", "to_time", "job_applicant", "status"]}
      searchFields={["job_applicant", "status"]}
      infiniteScroll={true}
    />
  );
};

const InterViewItem: React.FC<{ item: Interview; index?: number; doctype: string }> = ({ item }) => {
  const interview = item;

  const formatTime = (time: string) => {
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      key={item.name} // Use item.name for unique key
      className="flex justify-between items-center gap-3 bg-white p-3 mt-1 rounded-xl border cursor-pointer"
    >
      <div>
        <div className="flex flex-grow space-x-3">
          <p className="text-[var(--secondary-color)] text-base font-medium">
            {interview.job_applicant}
          </p>
          <span
            className={`flex items-center justify-center text-xs font-medium px-2 rounded-xl ${interview.status === "Cleared"
              ? "bg-green-100 text-green-800"
              : interview.status === "Rejected"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-ellow-800"
              }`}
          >
            {interview.status}
          </span>
        </div>
        <div>
          <p className="text-[var(--secondary-color)] text-sm">
            {formatTime(interview.from_time)} - {formatTime(interview.to_time)}
          </p>
          {/* TODO: Uncomment and update if interviewers field is added to Interview interface and defaultFields */}
          {/* <p className="text-xs font-medium text-blue-500">
            Interviewer{interview.interviewers.length > 1 ? "s" : ""}:{" "}
            {interview.interviewers.join(", ")}
          </p> */}
        </div>
      </div>
      <button className="text-xs font-medium text-[var(--secondary-color)]">
        <IoIosArrowForward />
      </button>
    </div>
  );
};

export default InterviewPage;