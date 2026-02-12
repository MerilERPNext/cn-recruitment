/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import LTACards from "./LtaBreakUp";
import { FiX } from "react-icons/fi";
import { useDeleteDocument } from "../../../../hooks/payroll/UseDeleteDocuemt";
import { useFileUpload } from "../../../../hooks/useEmployee";
import { formatCurrency } from "../../../../utils/currency";

export interface LTAItem {
  exemption_sub_category: string;
  component_type: string;
  description: string | null;
  editable: number;
  amount: number | null;
  max_amount: number;
  proof_file?: string;
  file_id?: string;
}

export interface LTACategory {
  category_name: string;
  items: LTAItem[];
}

export interface LTAData {
  items: LTACategory[];
}

export interface HRAData {
  owner_name: string;
  attach_reqd: number;
  monthly_hra: number;
  rented_in_metro_city: number;
  annual_hra_exemption: number;
  monthly_hra_exemption: number;
  start_date: string;
  end_date: string;
  pan: string;
  owner_pan: string;
  address_line1: string;
  address_line2: string;
  lta?: LTAData;
}

interface HRAFormProps {
  hraData: HRAData;
  LATABreakup: any;
  onChange: (field: keyof HRAData | "lta", value: any) => void;
}

const HRAForm: React.FC<HRAFormProps> = ({
  hraData,
  onChange,
  LATABreakup,
}) => {
  const [showLTAModal, setShowLTAModal] = useState(false);
  const uploadMutation = useFileUpload();
  const { mutateAsync: deleteDoc } = useDeleteDocument();

  const LTAData = (hraData as unknown as any[])?.[1];

  // ✅ PAN mandatory condition
  const isPanMandatory = Number(hraData.monthly_hra) > 8333;

  // ✅ Auto-mark attachment required when PAN mandatory
  useEffect(() => {
    if (isPanMandatory && hraData.attach_reqd === 0) {
      onChange("attach_reqd", 1);
    }
  }, [isPanMandatory, hraData.attach_reqd, onChange]);

  const handleLTAFileUpload = (
    catIdx: number,
    itemIdx: number,
    file: File | null,
  ) => {
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess(data) {
        const updatedItems = [...LTAData.items];

        updatedItems[catIdx].items[itemIdx] = {
          ...updatedItems[catIdx].items[itemIdx],
          proof_file: data?.file_url,
          file_id: data.name,
        };

        onChange("lta", { items: updatedItems });
      },
      onError(err) {
        console.error("LTA proof upload failed", err);
        alert("File upload failed");
      },
    });
  };
  const handleLTARemoveProof = async (
    catIdx: number,
    itemIdx: number,
    fileId?: string,
  ) => {
    if (!fileId) {
      alert("File id missing");
      return;
    }

    if (!window.confirm("Delete this file?")) return;

    try {
      await deleteDoc({
        doctype: "File",
        name: fileId, // ✅ ONLY THIS WORKS
      });

      const updated = [...LTAData.items];
      updated[catIdx].items[itemIdx] = {
        ...updated[catIdx].items[itemIdx],
        proof_file: undefined,
        file_id: undefined,
      };

      onChange("lta", { items: updated });
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="mt-4">
      <div className="border rounded-lg p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700 uppercase">
            House Rent Allowance (Exempt u/s 10(13A))
          </h3>
        </div>

        {/* ✅ Show warning only when rent > 8333 */}
        {isPanMandatory && (
          <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-2 rounded">
            If rent is more than {formatCurrency(8333)}/month or{" "}
            {formatCurrency(100000)}/year, PAN is mandatory.
          </div>
        )}

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500">Address</label>
            <input
              value={hraData.address_line1}
              onChange={(e) => onChange("address_line1", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Is Metro</label>
            <select
              value={hraData.rented_in_metro_city}
              onChange={(e) =>
                onChange("rented_in_metro_city", Number(e.target.value))
              }
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value={0}>Non-Metro</option>
              <option value={1}>Metro</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={hraData.start_date}
              onChange={(e) => onChange("start_date", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              value={hraData.end_date}
              onChange={(e) => onChange("end_date", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {/* ✅ Monthly Rental */}
          <div>
            <label className="text-xs text-gray-500">Monthly Rental</label>
            <input
              type="number"
              value={hraData.monthly_hra}
              onChange={(e) => onChange("monthly_hra", Number(e.target.value))}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Owner name</label>
            <input
              value={hraData.owner_name}
              onChange={(e) => onChange("owner_name", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>

          {/* ✅ PAN field – mandatory when rent > 8333 */}
          <div>
            <label className="text-xs text-gray-500">
              PAN {isPanMandatory && <span className="text-red-500">*</span>}
            </label>
            <input
              value={hraData.pan}
              onChange={(e) => onChange("pan", e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${isPanMandatory && !hraData.pan ? "border-red-500" : ""
                }`}
              placeholder={isPanMandatory ? "PAN is mandatory" : "Enter PAN"}
            />
            {isPanMandatory && !hraData.pan && (
              <p className="text-xs text-red-500 mt-1">
                PAN is required when rent exceeds
                {formatCurrency(8333)}/month.
              </p>
            )}
          </div>

          {/* ✅ Attachment */}
          {hraData.attach_reqd !== 0 && (
            <div className="col-span-2 flex items-end">
              <label
                className="flex items-center gap-2 px-3 py-2 border border-gray-100 rounded-md 
               text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition"
              >
                📎
                <span>Attach file</span>
                <input type="file" className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ================= LTA Section ================= */}
      {LTAData?.items && (
        <div className="border rounded p-4 mt-4">
          <Typography
            variant="bodySmall"
            color="body1"
            className="font-semibold"
          >
            LTA Details
          </Typography>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowLTAModal(true)}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Use LTA Breakup
            </button>
          </div>

          {showLTAModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
              <div className="bg-white rounded-lg w-[60%] mt-2 max-w-3xl p-4 relative">
                <div className="flex justify-between items-center mb-3">
                  <Typography
                    variant="bodySmall"
                    color="body1"
                    className="font-semibold"
                  >
                    LTA Breakup (View Only)
                  </Typography>
                  <button
                    onClick={() => setShowLTAModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-auto">
                  <LTACards LTAData={LATABreakup} />
                </div>
              </div>
            </div>
          )}

          {LTAData.items.map((category: any, catIdx: number) => (
            <div key={catIdx} className="mb-4">
              <Typography variant="bodySmall" color="body2" className="mb-2">
                {category.category_name}
              </Typography>

              {category.items.map((item: any, idx: number) => (
                <div
                  key={item.exemption_sub_category}
                  className=" gap-4 mb-4 border-b pb-4"
                >
                  <div className="col-span-2 flex justify-between items-center">
                    <Typography
                      variant="bodySmall"
                      color="body2"
                      className="font-medium"
                    >
                      {item.exemption_sub_category}
                    </Typography>
                  </div>

                  <div className="flex gap-4 w-full justify-between">
                    <div className=" w-full flex flex-col gap-2">
                      <label className="text-sm text-gray-500">Amount</label>
                      <input
                        type="text"
                        value={item.amount ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numericValue =
                            value === "" ? null : Number(value);

                          const updatedItems = [...LTAData.items];
                          updatedItems[catIdx].items[idx].amount = numericValue;

                          onChange("lta", { items: updatedItems });
                        }}
                        className={`max-w-[500px] border rounded px-3 py-1 ${item.editable === 0
                            ? "bg-gray-200 cursor-not-allowed w-full"
                            : ""
                          }`}
                      />
                    </div>
                    <div className=" flex flex-col gap-2 ">
                      <label className="text-xs text-gray-600">
                        Attachment
                      </label>

                      <div className="flex flex-row items-center gap-2">
                        <input
                          type="file"
                          onChange={(e) =>
                            handleLTAFileUpload(
                              catIdx,
                              idx,
                              e.target.files?.[0] || null,
                            )
                          }
                          className="border rounded pr-3 text-xs
      file:text-xs file:border-0
      file:bg-primary file:text-white
      file:px-3 file:py-1"
                        />

                        {item.proof_file && (
                          <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
                            <span className="text-xs text-gray-700 truncate">
                              {item.proof_file}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleLTARemoveProof(
                                  catIdx,
                                  idx,
                                  item.proof_file,
                                )
                              }
                              className="text-gray-500 hover:text-red-600"
                              title="Remove file"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HRAForm;
