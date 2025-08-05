import { useEffect } from "react";
import defaultProfile from "../../assets/user.png";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import { useExpensePolicies } from "../../hooks/useExpense";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import toast, { Toaster } from "react-hot-toast";

const ExpensesUserInfo = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: expensePolicies, isError } = useExpensePolicies(
    user?.employee || ""
  );

  useEffect(() => {
    if (isError) {
      toast.error("Failed to fetch expense policies. Please try again.");
    }
  }, [isError]);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center gap-3">
      <div className="flex-shrink-0 bg-gray-200 rounded-full">
        <img
          src={user?.image || defaultProfile}
          alt="User avatar"
          className="w-12 h-12 rounded-xl object-cover"
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">
          {user?.employee_name} {user?.employee && <>({user.employee})</>}
        </p>
        <p className="text-sm text-gray-600">
          {user?.department} | {expensePolicies?.[0]?.expense_travel_policy}
        </p>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default ExpensesUserInfo;
