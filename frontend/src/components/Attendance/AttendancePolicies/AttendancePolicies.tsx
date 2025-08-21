import { useLocation } from "react-router";
import { useAttendancePolicies } from "../../../hooks/useAttendance";
import LayoutHeader from "../../shared/LayoutHeader";

const AttendancePolicies = () => {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const policyParam = query.get("policy");
  const { data, isLoading } = useAttendancePolicies({
    attendance_policy: policyParam,
    policy_question: "Attendance Policy",
  });

  return isLoading ? (
    <span className="mt-14 animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5"></span>
  ) : (
    <div>
      <LayoutHeader tab="Attendance Policies" />

      <div className="mt-14 bg-white">
        <div className="overflow-x-auto border border-gray-300">
          <table className="min-w-full text-sm text-left text-gray-800 border-collapse">
            <thead className="bg-gray-100 text-gray-700 text-xs uppercase border-b border-gray-300">
              <tr>
                <th className="px-4 py-3 border-r border-gray-300 text-center whitespace-nowrap min-w-[40px]">
                  No.
                </th>
                <th className="px-4 py-3 border-r border-gray-300 whitespace-wrap min-w-[260px]">
                  Question Name
                </th>
                <th className="px-4 py-3 border-r border-gray-300 whitespace-nowrap min-w-[120px]">
                  Status
                </th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[240px]">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.questions.map((q, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-4 py-3 border-r border-gray-200 text-center whitespace-nowrap">
                    {q.idx}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 whitespace-wrap">
                    {q.question_name}
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded 
                    ${
                      q.status === "----"
                        ? "bg-yellow-100 text-yellow-700"
                        : q.status.toLowerCase() === "yes"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {q.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicies;
