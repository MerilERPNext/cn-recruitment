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
import { AttachmentCard } from "../../shared/molecules/AttachmentCard";
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

  if (!id) return null;

  // Desktop table for participants
  const DesktopParticipants = (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Employee Type
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Employee Name
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Percentage
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Allocated Amount
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data?.custom_participants?.map((p: Participant) => {
            const name =
              p?.employee_name || p?.guest_name || p?.employee || "—";
            return (
              <tr
                key={p?.name}
                className="bg-white hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="px-4 py-3 text-gray-800">
                  {p?.employee_type ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-800">{name}</td>
                <td className="px-4 py-3 text-gray-800">
                  {typeof p?.percentage === "number"
                    ? `${p?.percentage}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-800">
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Expense Type
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Expense Date
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Status
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Claimed Amt
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Sanctioned Amt
            </th>
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Attachment
            </th>
            {isSendedBack && (
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                Actions
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {Array.isArray(data?.expenses) && data.expenses.length > 0 ? (
            data.expenses.map((item: Expense) => {
              return (
                <tr
                  key={item.name}
                  className="bg-white hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-gray-800 truncate">
                    {item?.custom_claim_type_name} ({item.expense_type ?? "—"})
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {formatToIndianDate(item.expense_date)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <StatusBadge status={item?.custom_approval_staus} />
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    {formatINR(item.amount)}
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    {formatINR(item.sanctioned_amount)}
                  </td>
                  <td className="px-4 py-3 flex justify-center">
                    {item.custom_attach_receipt ? (
                      <AttachmentCard
                        fileUrl={item.custom_attach_receipt}
                        compact
                      />
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No file
                      </span>
                    )}
                  </td>
                  {isSendedBack && (
                    <td className="px-4 py-3">
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
                        className="text-gray-500 hover:text-blue-600 transition-colors"
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
                className="px-4 py-8 text-center text-gray-400 italic"
                colSpan={isSendedBack ? 7 : 6}
              >
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
          return (
            <div
              key={item.name}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <Typography variant="label" className="card-title">
                  Expense Item {idx + 1}
                </Typography>
                <StatusBadge status={item.custom_approval_staus} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Expense Type
                  </Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item?.custom_claim_type_name} ({item.expense_type ?? "—"})
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
                  <AttachmentCard fileUrl={item.custom_attach_receipt} />
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
                    {data?.custom_expense_category_name} ({data?.custom_expense_category ?? "—"})
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
