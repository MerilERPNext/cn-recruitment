/* eslint-disable @typescript-eslint/no-explicit-any */
import { SquarePen, X } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { useFrappeDocument } from "../../../hooks/useFrappeQuery";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  useGetExpenseAttachments,
  useGetExpenseReferenceDoc,
} from "../../../hooks/useExpense";
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
import WrapperHoverCard from "../../shared/WrapperHoverCard";

interface ExpenseClaimModalProps {
  id: string | null;
  onClose: () => void;
  getStatusBadgeClasses?: (status: string) => string;
  selectedStages: ApprovalStage[];
  selectedSendBackUser?: string | null;
  canEdit?: boolean;
  todoStatus?: string | null;
  status?: string;
  isDraft?: boolean;
}

const ExpenseClaimDetailsModal: React.FC<ExpenseClaimModalProps> = ({
  id,
  onClose,
  selectedStages,
  selectedSendBackUser,
  canEdit: canEditProp = false,
  todoStatus = null,
  status,
  isDraft = false,
}) => {
  const raw = useFrappeDocument("Expense Claim", isDraft ? "" : (id as string));
  const draftRaw = useGetExpenseReferenceDoc(
    isDraft ? (id || undefined) : undefined,
    "Expense Claim",
  );
  const navigate = useNavigate();
  const data = (
    isDraft
      ? ((draftRaw.data as any)?.reference_document ?? draftRaw.data)
      : raw.data
  ) as ExpenseClaim | undefined;
  const isLoading = isDraft ? draftRaw.isLoading : raw.isLoading;
  const error = isDraft ? draftRaw.error : raw.error;
  const { data: currentUser } = useCurrentUser();
  const { isDesktop } = useScreenSize();
  const { data: claimAttachments } = useGetExpenseAttachments(id || undefined);

  const finalStatus = status || data?.approval_status;

  const isSendedBack =
    currentUser?.name === selectedSendBackUser && canEditProp && todoStatus !== "Closed";

  const getAttachmentsForItem = (item?: Expense) => {
    if (!claimAttachments) return [];

    const customUrls = new Set<string>();
    data?.expenses?.forEach((item: Expense) => {
      if (item.custom_form_data) {
        try {
          const parsed =
            typeof item.custom_form_data === "string"
              ? JSON.parse(item.custom_form_data)
              : item.custom_form_data;

          Object.values(parsed).forEach((value: any) => {
            const files = Array.isArray(value) ? value : [value];
            files.forEach((file) => {
              if (file && typeof file === "object") {
                const url = getCustomFileUrl(file);
                if (url) customUrls.add(url);
              }
            });
          });
        } catch (e) {
          console.error("Error parsing custom_form_data for filtering", e);
        }
      }
    });

    const standardFileNames = new Set(
      ((item as any)?.attachments || item?.custom_attach_receipt || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
    );

    return claimAttachments.filter((file: any) => {
      if (standardFileNames.has(file.file_name)) return true;
      return !customUrls.has(file.file_url);
    });
  };

  const formatINR = (value?: number | null) =>
    typeof value === "number"
      ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(value)
      : "—";

  const getCustomFileUrl = (file: any) => file.data?.message?.file_url || file.file_url || file.url || "";
  const getCustomFileName = (file: any) => file.originalName || file.name || file.file_name || undefined;

  const renderAdditionalDetailsCard = (customFormData: string | null | undefined, keyPrefix: string) => {
    if (!customFormData) return null;
    let parsed: Record<string, any> = {};
    try {
      parsed = typeof customFormData === 'string' ? JSON.parse(customFormData) : customFormData;
    } catch {
      return null;
    }

    const keysToSkip = [
      "uid", "name", "expenseCategory", "categoryType", "expenseType",
      "custom_attach_receipt", "start_datetime", "end_datetime", "location"
    ];

    const isFileObject = (obj: any) => obj && typeof obj === 'object' && ('url' in obj || 'originalName' in obj || obj.data?.message?.file_url);
    const isFileArray = (arr: any) => Array.isArray(arr) && arr.length > 0 && isFileObject(arr[0]);

    const entries = Object.entries(parsed).filter(
      ([key, value]) => !keysToSkip.includes(key) && value !== null && value !== "" && value !== undefined && !(Array.isArray(value) && value.length === 0)
    );

    if (entries.length === 0) return null;

    const formatKey = (key: string) => {
      let formatted = key.replace(/_/g, " ");
      formatted = formatted.replace(/([A-Z])/g, " $1").trim();
      return formatted.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    return (
      <div key={keyPrefix} className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <Typography variant="label" className="card-title mb-4 block">
          Additional Details
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {entries.map(([key, value]) => {
            if (isFileArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-2 col-span-full mt-2">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                  <div className="flex flex-wrap gap-2">
                    {value.map((file: any, idx: number) => {
                      const fileUrl = getCustomFileUrl(file);
                      const fileName = getCustomFileName(file);
                      return fileUrl ? (
                        <div key={idx} className="min-w-[260px] max-w-[360px] flex-1">
                          <AttachmentCard fileUrl={fileUrl} fileName={fileName} />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                <span className="text-sm text-gray-800 break-words">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAdditionalDetailsMobile = (customFormData: string | null | undefined) => {
    if (!customFormData) return null;
    let parsed: Record<string, any> = {};
    try {
      parsed = typeof customFormData === 'string' ? JSON.parse(customFormData) : customFormData;
    } catch {
      return null;
    }

    const keysToSkip = [
      "uid", "name", "expenseCategory", "categoryType", "expenseType",
      "custom_attach_receipt", "start_datetime", "end_datetime", "location"
    ];

    const isFileObject = (obj: any) => obj && typeof obj === 'object' && ('url' in obj || 'originalName' in obj || obj.data?.message?.file_url);
    const isFileArray = (arr: any) => Array.isArray(arr) && arr.length > 0 && isFileObject(arr[0]);

    const entries = Object.entries(parsed).filter(
      ([key, value]) => !keysToSkip.includes(key) && value !== null && value !== "" && value !== undefined && !(Array.isArray(value) && value.length === 0)
    );

    if (entries.length === 0) return null;

    const formatKey = (key: string) => {
      let formatted = key.replace(/_/g, " ");
      formatted = formatted.replace(/([A-Z])/g, " $1").trim();
      return formatted.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    return (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Typography variant="mobileCardLabel" className="block mb-3 font-semibold text-gray-700">
          Additional Details
        </Typography>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          {entries.map(([key, value]) => {
            if (isFileArray(value)) {
              return (
                <div key={key} className="flex flex-col gap-2 col-span-2 mt-1">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                  <div className="flex flex-col gap-2">
                    {value.map((file: any, idx: number) => {
                      const fileUrl = getCustomFileUrl(file);
                      const fileName = getCustomFileName(file);
                      return fileUrl ? <AttachmentCard key={idx} fileUrl={fileUrl} fileName={fileName} /> : null;
                    })}
                  </div>
                </div>
              );
            }

            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{formatKey(key)}</span>
                <span className="text-sm text-gray-800 break-words">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!id) return null;

  // Desktop table for participants
  const DesktopParticipants = (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-center">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">
              Employee ID
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
                <td className="px-4 py-3 text-gray-800 hover:text-primary cursor-pointer">
                  <WrapperHoverCard employeeId={p?.employee}>
                    {p?.employee ?? "—"}
                  </WrapperHoverCard>
                </td>
                <td className="px-4 py-3 text-gray-800 cursor-pointer hover:text-primary">
                  <WrapperHoverCard employeeId={p?.employee}>
                    {name}
                  </WrapperHoverCard>
                </td>
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
                  Employee ID
                </Typography>
                <Typography variant="mobileCardValue" className="hover:text-primary cursor-pointer">
                  <WrapperHoverCard employeeId={p?.employee}>
                    {p?.employee ?? "—"}
                  </WrapperHoverCard>
                </Typography>
              </div>
              <div className="flex flex-col gap-1">
                <Typography variant="mobileCardLabel" className="block">
                  Employee Name
                </Typography>
                <Typography variant="mobileCardValue" className="hover:text-primary cursor-pointer">
                  <WrapperHoverCard employeeId={p?.employee}>{name}</WrapperHoverCard>
                </Typography>
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
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full text-sm text-center">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Expense Category</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Expense Type</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Expense Date</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Claimed Amt</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Claimed Date</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Sanctioned Amt</th>
              <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Attachment</th>
              {isSendedBack && (
                <th className="px-4 py-3 font-semibold text-gray-600 uppercase tracking-wider text-xs">Actions</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {Array.isArray(data?.expenses) && data.expenses.length > 0 ? (
              data.expenses.map((item: Expense) => (
                <tr
                  key={item.name || item.uid || Math.random()}
                  className="bg-white hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-4 py-3 text-gray-800 truncate">{data?.custom_expense_category_name}</td>
                  <td className="px-4 py-3 text-gray-800 truncate">{item?.custom_claim_type_name}</td>
                  <td className="px-4 py-3 text-gray-800">{formatToIndianDate(item.expense_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <StatusBadge status={finalStatus} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{formatINR(item.amount)}</td>
                  <td className="px-4 py-3 text-gray-800">{formatToIndianDate(item.creation)}</td>
                  <td className="px-4 py-3 text-gray-800">
                    {finalStatus === "Approved" ? formatINR(item.sanctioned_amount) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      {getAttachmentsForItem(item).map((file: { file_url: string }, i: number) => (
                        <AttachmentCard key={i} fileUrl={file.file_url} compact />
                      ))}
                      {getAttachmentsForItem(item).length === 0 && (
                        <span className="text-xs text-gray-400 italic">No file</span>
                      )}
                    </div>
                  </td>
                  {isSendedBack && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const navigationState = buildExpenseNavigationState(data, item, isSendedBack);
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
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-8 text-center text-gray-400 italic"
                  colSpan={isSendedBack ? 9 : 8}
                >
                  No expense items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {Array.isArray(data?.expenses) &&
        data.expenses.map((item: Expense, index: number) =>
          renderAdditionalDetailsCard(item.custom_form_data, `${item.name || item.uid || index}-additional-details`),
        )}
    </div>
  );

  // Mobile cards for expense items
  const MobileExpenseItems = (
    <div className="grid grid-cols-1 gap-4">
      {Array.isArray(data?.expenses) && data.expenses.length > 0 ? (
        data.expenses.map((item: Expense) => {
          return (
            <div
              key={item.name}
              className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <div className="flex justify-between items-center mb-3">
                <Typography variant="label" className="card-title">
                  Expense Item
                </Typography>
                <StatusBadge status={finalStatus} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Expense Category
                  </Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {data?.custom_expense_category_name}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Expense Type
                  </Typography>
                  <Typography variant="mobileCardValue" className="truncate">
                    {item?.custom_claim_type_name}
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
                    Claimed Date
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {formatToIndianDate(item.creation)}
                  </Typography>
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="mobileCardLabel" className="block">
                    Sanctioned Amount
                  </Typography>
                  <Typography variant="mobileCardValue">
                    {finalStatus === "Approved" ? formatINR(item.sanctioned_amount) : "—"}
                  </Typography>
                </div>
              </div>

              {/* Attachment */}
              <div className="mt-3">
                <Typography variant="mobileCardLabel" className="block">
                  Attachments
                </Typography>
                <div className="flex flex-col gap-2 mt-2">
                  {getAttachmentsForItem(item).map((file: { file_url: string }, i: number) => (
                    <AttachmentCard key={i} fileUrl={file.file_url} />
                  ))}
                  {getAttachmentsForItem(item).length === 0 && (
                    <span className="text-gray-400 text-sm">No File</span>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {renderAdditionalDetailsMobile(item.custom_form_data)}

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
