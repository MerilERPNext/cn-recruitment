import React from "react";
import { SquarePen, XIcon } from "lucide-react";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import {
  ApprovalStage,
  Expense,
  ExpenseClaim,
  Participant,
} from "../../../types/expenseAdvance";
import Badge from "../../shared/Badge";
import ApprovalStagesProgress from "./ApprovalStagesProgress";
import { useNavigate } from "react-router-dom";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";

interface ExpenseClaimModalProps {
  id: string | null;
  onClose: () => void;
  getStatusBadgeClasses?: (status: string) => string;
  selectedStages: ApprovalStage[];
  selectedSendBackUser?: string | null;
}

const ExpenseClaimDetailsModal: React.FC<ExpenseClaimModalProps> = ({
  id,
  onClose,
  getStatusBadgeClasses,
  selectedStages,
  selectedSendBackUser,
}) => {
  const raw = useFrappeDocument("Expense Claim", id as string);
  const navigate = useNavigate();
  const data = raw.data as ExpenseClaim | undefined;
  const isLoading = raw.isLoading;
  const error = raw.error;
  const { data: currentUser } = useCurrentUser();

  const isSendedBack = currentUser?.name === selectedSendBackUser;

  const formatINR = (value?: number | null) =>
    typeof value === "number"
      ? new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
        }).format(value)
      : "—";

  const badgeFor = (status?: string) =>
    getStatusBadgeClasses
      ? getStatusBadgeClasses(status || "")
      : "bg-gray-100 text-gray-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-xl rounded-lg bg-white p-6 shadow-lg">
        <div className="flex justify-between items-center mb-5 pb-4 border-b">
          <h3 className="text-lg font-semibold">Expense Claim: {id}</h3>
          <button
            onClick={onClose}
            className="text-sm p-2 rounded-full hover:bg-gray-200"
          >
            <XIcon size={18} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-gray-500 text-sm">Loading details...</p>
        ) : error ? (
          <p className="text-red-600 text-sm">
            Failed to load expense details.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              <p className="text-sm text-gray-700">
                <strong>Expense Category:</strong>{" "}
                {data?.custom_expense_category ?? "—"}
              </p>

              <p className="text-sm text-gray-700 flex gap-4 items-center">
                <strong>Status:</strong>{" "}
                <Badge
                  label={
                    data?.approval_status === "Draft"
                      ? "Pending"
                      : data?.approval_status || "—"
                  }
                  backgroundColor={
                    badgeFor(data?.approval_status).split(" ")[0]
                  }
                  textColor={badgeFor(data?.approval_status).split(" ")[1]}
                  size="sm"
                />
              </p>
              <p className="text-sm text-gray-700">
                <strong>Claimed Amount:</strong>{" "}
                {formatINR(data?.total_claimed_amount)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Sanctioned Amount:</strong>{" "}
                {formatINR(data?.total_sanctioned_amount)}
              </p>

              <p className="text-sm text-gray-700">
                <strong>Claimed Date:</strong>{" "}
                {data?.creation
                  ? new Date(data.creation).toLocaleString("en-IN", {
                      dateStyle: "medium",
                    })
                  : "—"}
              </p>

              <div className="hidden md:block"></div>
            </div>

            {Array.isArray(selectedStages) && selectedStages.length > 0 && (
              <div className="mb-4 pt-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Approval Stages
                </h4>
                <ApprovalStagesProgress stages={selectedStages} />
              </div>
            )}

            {Array.isArray(data?.custom_participants) &&
              data.custom_participants.length > 0 && (
                <div className="mt-2 mb-4">
                  <h4 className="text-md font-semibold mb-2">Participants</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 text-sm text-left">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="px-4 py-2 border-b">Employee Type</th>
                          <th className="px-4 py-2 border-b">Employee Name</th>
                          <th className="px-4 py-2 border-b text-right">
                            Percentage
                          </th>
                          <th className="px-4 py-2 border-b text-right">
                            Allocated Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {data.custom_participants.map((p: Participant) => {
                          const name =
                            p?.employee_name ||
                            p?.guest_name ||
                            p?.employee ||
                            "—";
                          return (
                            <tr
                              key={p?.name}
                              className="even:bg-white odd:bg-gray-50 hover:bg-gray-100"
                            >
                              <td className="px-4 py-2 border-b align-top">
                                {p?.employee_type ?? "—"}
                              </td>
                              <td className="px-4 py-2 border-b align-top">
                                {name}
                              </td>
                              <td className="px-4 py-2 border-b text-right align-top">
                                {typeof p?.percentage === "number"
                                  ? `${p?.percentage}%`
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 border-b text-right align-top">
                                {formatINR(p?.allocated_amount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">
                Expense Claim Items
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-2 border">Expense Claim Type</th>
                      <th className="px-4 py-2 border ">Expense Date</th>
                      <th className="px-4 py-2 border">Approval Status</th>
                      <th className="px-4 py-2 border text-right">
                        Claimed Amount
                      </th>
                      <th className="px-4 py-2 border text-right">
                        Sanctioned Amount
                      </th>
                      <th className="px-4 py-2 border text-center">
                        Attachment
                      </th>
                      {isSendedBack && (
                        <th className="px-4 py-2 border-b text-center">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {Array.isArray(data?.expenses) &&
                    data.expenses.length > 0 ? (
                      data.expenses.map((item: Expense) => {
                        const rowStatus =
                          item.custom_approval_staus?.trim() ||
                          data?.approval_status ||
                          "";
                        const badgeClass = badgeFor(rowStatus);
                        const badgeBg = badgeClass.split(" ")[0];
                        const badgeText = badgeClass.split(" ")[1];

                        return (
                          <tr
                            key={item.name}
                            className="even:bg-white odd:bg-gray-50 hover:bg-gray-100"
                          >
                            <td className="px-4 py-2 border-b align-top">
                              {item.expense_type ?? "—"}
                            </td>
                            <td className="px-4 py-2 border-b align-top">
                              {/* {formatDateString(item.expense_date) ?? "—"} */}
                              {item.expense_date
                                ? new Date(item.expense_date).toLocaleString(
                                    "en-IN",
                                    {
                                      dateStyle: "medium",
                                    }
                                  )
                                : "—"}
                            </td>

                            <td className="px-4 py-2 border-b align-top">
                              <Badge
                                label={
                                  item.custom_approval_staus === ""
                                    ? "Pending"
                                    : item.custom_approval_staus || "—"
                                }
                                backgroundColor={badgeBg}
                                textColor={badgeText}
                                size="sm"
                              />
                            </td>

                            <td className="px-4 py-2 border-b text-right align-top">
                              {formatINR(item.amount)}
                            </td>

                            <td className="px-4 py-2 border-b text-right align-top">
                              {formatINR(item.sanctioned_amount)}
                            </td>
                            <td className="px-4 py-2 border-b text-center align-top">
                              {item.custom_attach_receipt ? (
                                <a
                                  href={item.custom_attach_receipt}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 underline text-sm"
                                >
                                  View File
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  No File
                                </span>
                              )}
                            </td>
                            {isSendedBack && (
                              <td className="flex justify-center">
                                <button
                                  onClick={() => {
                                    const navigationState =
                                      buildExpenseNavigationState(data, item);
                                    navigate(
                                      "/webapp/expenses-app/add-expense",
                                      {
                                        state: navigationState,
                                      }
                                    );
                                  }}
                                  className="text-gray-500 hover:text-blue-600"
                                >
                                  <SquarePen size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={4}
                        >
                          No expense items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseClaimDetailsModal;
