import { useLocation } from "react-router";
import { useAttendancePolicies } from "../../../hooks/useAttendance";
import LayoutHeader from "../../shared/LayoutHeader";

const AttendancePolicies = ({ doctype_name }: { doctype_name: string }) => {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const policyParam = query.get("policy");

  const { data, isLoading, isError, error } = useAttendancePolicies({
    target_doctype: policyParam,
    doctype_name: doctype_name,
  });

  const renderSkeletonRows = (count = 5) => {
    return [...Array(count)].map((_, index) => (
      <tr key={index} className="border-b border-gray-100 animate-pulse">
        <td className="px-4 py-3 border-r border-gray-100 whitespace-nowrap">
          <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
        </td>
        <td className="px-2 py-3 border-r border-gray-100 text-center">
          <div className="h-4 w-10 bg-gray-300 rounded mx-auto"></div>
        </td>
        <td className="px-4 py-3">
          <div className="h-4 w-full bg-gray-300 rounded"></div>
        </td>
      </tr>
    ));
  };

  const renderTableRows = () => {
    if (!data?.questions || data.questions.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
            No attendance policy questions found.
          </td>
        </tr>
      );
    }

    return data.questions.map((q) => (
      <tr key={q?.idx} className="border-b border-gray-100">
        <td className="px-4 py-3 border-r border-gray-100 whitespace-wrap">
          {q.question_name}
        </td>
        <td className="px-2 py-3 border-r border-gray-100 text-center">
          <div
            className={`px-2 py-1 text-xs font-semibold rounded w-fit inline-block
              ${q.status === "----"
                ? "bg-yellow-100 text-yellow-700"
                : q.status.toLowerCase() === "yes"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-red-100 text-red-700"
              }`}
          >
            {q.status}
          </div>
        </td>
        <td className="px-4 py-3 text-gray-600  whitespace-wrap">
          {q.description}
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <LayoutHeader tab="Attendance Policies" />

      <div className="bg-white">
        {/* Responsive scroll wrapper */}
        <div className="w-full overflow-x-auto">
          <table className="table-auto w-full text-sm text-left text-gray-800 border-collapse">
            <thead className="bg-gray-100 text-gray-700 text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 border-r border-gray-100 whitespace-nowrap ">
                  Question Name
                </th>
                <th className="px-2 py-3 border-r border-gray-100 text-center whitespace-wrap">
                  Status
                </th>
                <th className="px-4 py-3 whitespace-nowrap">Description</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                renderSkeletonRows(15)
              ) : isError ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-red-600"
                  >
                    {error?.message || "An error occurred while fetching data."}
                  </td>
                </tr>
              ) : (
                renderTableRows()
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicies;
