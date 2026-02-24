import { SquarePen, X } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  ApprovalStage,
  Expense,
  ExpenseClaim,
  Participant,
} from "../../../types/expenseAdvance";
import formatToIndianDate from "../../../utils/formatToIndianDate";
import Button from "../../shared/atoms/Button";
import StatusBadge from "../../shared/atoms/statusBadge";
import { Typography } from "../../shared/atoms/Typography";
import Badge from "../../shared/Badge";
import ApprovalStagesProgress from "./ApprovalStagesProgress";
import { buildExpenseNavigationState } from "./expenseNavigationHelper";

interface ExpenseClaimModalProps {
  id: string | null;
  onClose: () => void;
  getStatusBadgeClasses?: (status: string) => string;
  selectedStages: ApprovalStage[];
  selectedSendBackUser?: string | null;
  canEdit?: boolean;
}

const ExpenseClaimDetailsModal: React.FC<ExpenseClaimModalProps> = ({
  id,
  onClose,
  getStatusBadgeClasses,
  selectedStages,
  selectedSendBackUser,
  canEdit: canEditProp = false,
}) => {
  const raw = useFrappeDocument("Expense Claim", id as string);
  const navigate = useNavigate();
  const data = raw.data as ExpenseClaim | undefined;
  const isLoading = raw.isLoading;
  const error = raw.error;
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();

  const isSendedBack =
    currentUser?.name === selectedSendBackUser && canEditProp;

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

  if (!id) return null;

  // Desktop table for participants
  const DesktopParticipants = (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 border-b">Employee Type</th>
            <th className="px-4 py-2 border-b">Employee Name</th>
            <th className="px-4 py-2 border-b text-right">Percentage</th>
            <th className="px-4 py-2 border-b text-right">Allocated Amount</th>
          </tr>
        </thead>

        <tbody>
          {data?.custom_participants?.map((p: Participant) => {
            const name =
              p?.employee_name || p?.guest_name || p?.employee || "—";
            return (
              <tr
                key={p?.name}
                className="even:bg-white odd:bg-gray-50 hover:bg-gray-100"
              >
                <td className="px-4 py-2 border-b align-top">
                  {p?.employee_type ?? "—"}
                </td>
                <td className="px-4 py-2 border-b align-top">{name}</td>
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
  );

  // Mobile cards for participants
  const MobileParticipants = (
    <div className="grid grid-cols-1 gap-4">
      {data?.custom_participants?.map((p: Participant, idx: number) => {
        const name = p?.employee_name || p?.guest_name || p?.employee || "—";
        return (
          <div
            key={p?.name}
            className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
          >
            <div className="mb-3">
              <Typography variant="label" className="card-title">
                Participant {idx + 1}
              </Typography>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Employee Type
                </Typography>
                <Typography variant="mobileCardValue">
                  {p?.employee_type ?? "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Employee Name
                </Typography>
                <Typography variant="mobileCardValue">{name}</Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Percentage
                </Typography>
                <Typography variant="mobileCardValue">
                  {typeof p?.percentage === "number"
                    ? `${p?.percentage}%`
                    : "—"}
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Allocated Amount
                </Typography>
                <Typography variant="mobileCardValue">
                  {formatINR(p?.allocated_amount)}
                </Typography>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Desktop table for expense items
  const DesktopExpenseItems = (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 border">Expense Claim Type</th>
            <th className="px-4 py-2 border ">Expense Date</th>
            <th className="px-4 py-2 border">Approval Status</th>
            <th className="px-4 py-2 border text-right">Claimed Amount</th>
            <th className="px-4 py-2 border text-right">Sanctioned Amount</th>
            <th className="px-4 py-2 border text-center">Attachment</th>
            {isSendedBack && (
              <th className="px-4 py-2 border-b text-center">Actions</th>
            )}
          </tr>
        </thead>

        <tbody>
          {Array.isArray(data?.expenses) && data.expenses.length > 0 ? (
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
                    {formatToIndianDate(item.expense_date)}
                  </td>

                  <td className="px-4 py-2 border-b align-top">
                    <Badge
                      label={
                        item.custom_approval_staus === "Draft"
                          ? "Pending"
                          : item.custom_approval_staus || ""
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
                      <span className="text-gray-400 text-sm">No File</span>
                    )}
                  </td>
                  {isSendedBack && (
                    <td className="flex justify-center">
                      <button
                        onClick={() => {
                          const navigationState = buildExpenseNavigationState(
                            data,
                            item,
                          );
                          navigate("/webapp/expenses-app/add-expense", {
                            state: navigationState,
                          });
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
              <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                No expense items found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // Mobile cards for expense items
  const MobileExpenseItems = (
    <div className="grid grid-cols-1 gap-4">
      {Array.isArray(data?.expenses) && data.expenses.length > 0 ? (
        data.expenses.map((item: Expense, idx: number) => {
          const rowStatus =
            item.custom_approval_staus?.trim() || data?.approval_status || "";
          const badgeClass = badgeFor(rowStatus);
          const badgeBg = badgeClass.split(" ")[0];
          const badgeText = badgeClass.split(" ")[1];

          return (
            <div
              key={item.name}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <Typography variant="label" className="card-title">
                  Expense Item {idx + 1}
                </Typography>
                <Badge
                  label={
                    item.custom_approval_staus === "Draft"
                      ? "Pending"
                      : item.custom_approval_staus || ""
                  }
                  backgroundColor={badgeBg}
                  textColor={badgeText}
                  size="sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Expense Type
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {item.expense_type ?? "—"}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Expense Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(item.expense_date)}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Claimed Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatINR(item.amount)}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Sanctioned Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatINR(item.sanctioned_amount)}
                  </Typography>
                </div>
              </div>

              {/* Attachment */}
              <div className="mt-3">
                <Typography variant="mobileCardLabel" className="block">
                  Attachment
                </Typography>
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
                  <span className="text-gray-400 text-sm">No File</span>
                )}
              </div>

              {/* Edit button for sent-back claims */}
              {isSendedBack && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      const navigationState = buildExpenseNavigationState(
                        data,
                        item,
                      );
                      navigate("/webapp/expenses-app/add-expense", {
                        state: navigationState,
                      });
                    }}
                    className="text-gray-500 hover:text-blue-600"
                  >
                    <SquarePen size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <Typography
          variant="mobileCardValue"
          className="text-center text-gray-500 py-4"
        >
          No expense items found.
        </Typography>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={onClose}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography
            variant="bodyMedium"
            className="font-semibold text-gray-900 leading-tight"
          >
            Expense Claim: {id}
          </Typography>

          <Button
            variant="subtle"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <p className="text-gray-500 text-sm">Loading details...</p>
          ) : error ? (
            <p className="text-red-600 text-sm">
              Failed to load expense details.
            </p>
          ) : (
            <>
              {/* Category + Status */}
              <div className="flex gap-2 justify-between p-1">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel">
                    Expense Category
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {data?.custom_expense_category ?? "—"}
                  </Typography>
                </div>
                <div>
                  <StatusBadge status={data?.approval_status} />
                </div>
              </div>

              {/* Paired data rows */}
              <div className="flex flex-col items-start justify-between mt-2 rounded-md p-1 gap-4">
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel" className="block">
                      Claimed Amount
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatINR(data?.total_claimed_amount)}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Sanctioned Amount
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatINR(data?.total_sanctioned_amount)}
                    </Typography>
                  </div>
                </div>
                <div className="flex justify-between w-full">
                  <div className="flex flex-col gap-2">
                    <Typography variant="mobileCardLabel" className="block">
                      Expense Date
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(data?.creation || "")}
                    </Typography>
                  </div>
                  <div className="flex flex-col gap-2 text-right">
                    <Typography variant="mobileCardLabel" className="block">
                      Claimed Date
                    </Typography>
                    <Typography variant="mobileCardValue">
                      {formatToIndianDate(
                        data?.expenses?.[0]?.expense_date || "",
                      )}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Approval Stages */}
              {Array.isArray(selectedStages) && selectedStages.length > 0 && (
                <div className="mb-4 pt-2">
                  <Typography
                    variant="bodySmall"
                    className="base-title mb-1 font-bold block"
                  >
                    Approval Stages
                  </Typography>
                  <ApprovalStagesProgress stages={selectedStages} />
                </div>
              )}

              {/* Participants */}
              <div className="mt-2 mb-4">
                <Typography
                  variant="bodySmall"
                  className="base-title mb-1 font-bold block"
                >
                  Participants
                </Typography>
                {Array.isArray(data?.custom_participants) &&
                data.custom_participants.length > 0 ? (
                  isDesktop ? (
                    DesktopParticipants
                  ) : (
                    MobileParticipants
                  )
                ) : (
                  <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50 mt-2">
                    <Typography
                      variant="mobileCardValue"
                      className="text-gray-500"
                    >
                      No participants found.
                    </Typography>
                  </div>
                )}
              </div>

              {/* Expense Claim Items */}
              <div className="mt-4">
                <Typography
                  variant="bodySmall"
                  className="base-title mb-1 font-bold block"
                >
                  Expense Claim Items
                </Typography>
                {isDesktop ? DesktopExpenseItems : MobileExpenseItems}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseClaimDetailsModal;
