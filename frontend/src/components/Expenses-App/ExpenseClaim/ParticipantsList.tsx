/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { SquarePen, Trash2 } from "lucide-react";

interface ParticipantsListProps {
  participants: any[];
  isDesktop: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  isDesktop,
  onEdit,
  onRemove,
}) => {
  if (!participants || participants.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-md font-medium">Participants</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEdit}
            className="text-md flex items-center font-bold text-primary hover:underline"
          >
            <SquarePen className="mr-1 h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-md flex items-center font-bold text-red-600 hover:underline"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Remove share %
          </button>
        </div>
      </div>

      {isDesktop ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-md text-gray-600">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Employee Name</th>
                <th className="px-2 py-1">Percentage</th>
                <th className="px-2 py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-2 align-top">{idx + 1}</td>
                  <td className="px-2 py-2 align-top">
                    {p.employee_type ?? "-"}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {p.guest_name ||
                      p.employee_name ||
                      p.employee ||
                      p.name ||
                      "-"}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {p.percentage !== undefined && p.percentage !== null
                      ? `${p.percentage}%`
                      : "-"}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {(
                      p.amount ??
                      p.allocated_amount
                    ) !== undefined &&
                      (
                        p.amount ??
                        p.allocated_amount
                      ) !== null
                      ? `INR ${Number(p.amount ?? p.allocated_amount).toFixed(2)}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mt-2">
          {participants.map((p: any, idx: number) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-lg border bg-gray-50 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-gray-700">
                  Participant {idx + 1}
                </span>
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {p.employee_type ?? "-"}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium text-gray-900 text-right">
                    {p.guest_name ||
                      p.employee_name ||
                      p.employee ||
                      p.name ||
                      "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Percentage:</span>
                  <span className="font-medium text-gray-900">
                    {p.percentage !== undefined && p.percentage !== null
                      ? `${p.percentage}%`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-medium text-gray-900">
                    {(p.amount ?? p.allocated_amount) !== undefined &&
                      (p.amount ?? p.allocated_amount) !== null
                      ? `INR ${Number(p.amount ?? p.allocated_amount).toFixed(2)}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;
