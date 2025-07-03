/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { IoIosArrowForward } from "react-icons/io";
import { useNavigate } from "react-router-dom";

interface Interview {
  name: string;
  from_time: string;
  to_time: string;
  candidate_name: string;
  interviewers: string[];
}

const InterviewPage = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]); // ✅ fixed initialization
const handleGoToInterview = (interviewId: string) => {
  navigate(`/webapp/recruitment-app/interview-details/${interviewId}`);
};

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const res = await fetch(
          `/api/method/recruitment.api_interview.interview.get_custom_interviews`
        );
        const json = await res.json();
        const interviewList = json.message.data;

        console.log(interviewList, "goyyyy to ")

        const mappedInterviews: Interview[] = interviewList.map((item: any) => {
          const interviewers =
            item.interviewer?.map((int: any) => int.custom_full_name) || [];
          const candidateName = interviewers[0] || "Unnamed";

          return {
            name: item.name,
            from_time: item.from_time,
            to_time: item.to_time,
            candidate_name: candidateName,
            interviewers,
          };
        });

        setInterviews(mappedInterviews);
        console.log("Mapped Interviews:", mappedInterviews);
      } catch (error) {
        console.error("Error fetching interview data", error);
      }
    };

    fetchInterviews();
  }, []);

  const formatTime = (time: string) => {
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="bg-[var(--neutral-bg)] min-h-screen font-sans"
      style={{ fontFamily: "Inter, Noto Sans, sans-serif" }}
    >
      <div className="flex flex-col min-h-screen">
        <main className="space-y-6 flex-grow">
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[var(--secondary-color)] text-lg font-semibold">
                Upcoming Interviews
              </h2>
            </div>

            {interviews.length === 0 && (
              <p className="text-sm text-gray-500">No upcoming interviews found.</p>
            )}

            {interviews.map((interview, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white p-3 mt-1 rounded-xl border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div onClick={() => handleGoToInterview(interview.name)} className="flex-grow">
                  <p className="text-[var(--secondary-color)] text-base font-medium">
                    {interview.candidate_name}
                  </p>
                  <p className="text-[var(--secondary-color)] text-sm">
                    {formatTime(interview.from_time)} - {formatTime(interview.to_time)}
                  </p>
                  <p className="text-xs font-medium text-blue-500">
                    Interviewer{interview.interviewers.length > 1 ? "s" : ""}:{" "}
                    {interview.interviewers.join(", ")}
                  </p>
                </div>
                <button className="text-xs font-medium text-[var(--secondary-color)]">
                  <IoIosArrowForward />
                </button>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};

export default InterviewPage;