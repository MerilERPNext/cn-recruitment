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
  proof_file?: string;
  file_id?: string;
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
  const [address1, setAddress1] = useState("");
  const [isMetro, setIsMetro] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyHra, setMonthlyHra] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pan, setPan] = useState("");

  const LTAData = (hraData as unknown as any[])?.[1];
  const hraDetails = (hraData as unknown as any[])?.[0];

  useEffect(() => {
    const addr =
      hraData.address_line1 ??
      hraDetails?.address_line1 ??
      "";

    const metro =
      hraData.rented_in_metro_city ??
      hraDetails?.rented_in_metro_city ??
      0;

    const sDate =
      hraData.start_date ??
      hraDetails?.start_date ??
      "";

    const eDate =
      hraData.end_date ??
      hraDetails?.end_date ??
      "";

    const mHra =
      hraData.monthly_hra ??
      hraDetails?.monthly_hra ??
      "";

    const owner =
      hraData.owner_name ??
      hraDetails?.owner_name ??
      "";

    const p =
      hraData.pan ??
      hraDetails?.pan ??
      "";

    setAddress1(addr);
    setIsMetro(metro);
    setStartDate(sDate);
    setEndDate(eDate);
    setMonthlyHra(String(mHra));
    setOwnerName(owner);
    setPan(p);

    // 🔥 IMPORTANT: sync to parent also
    onChange("address_line1", addr);
    onChange("rented_in_metro_city", metro);
    onChange("start_date", sDate);
    onChange("end_date", eDate);
    onChange("monthly_hra", Number(mHra || 0));
    onChange("owner_name", owner);
    onChange("pan", p);
  }, []);

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
  const handleHRAFileUpload = (file: File | null) => {
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess(data) {
        onChange("proof_file", data?.file_url);
        onChange("file_id", data?.name);
      },
      onError(err) {
        console.error(err);
        alert("File upload failed");
      },
    });
  };

  const handleHRARemoveProof = async () => {
    if (!hraData.file_id) return;

    if (!window.confirm("Delete this file?")) return;

    await deleteDoc({
      doctype: "File",
      name: hraData.file_id,
    });

    onChange("proof_file", undefined);
    onChange("file_id", undefined);
  };

  const handleLTARemoveProof = async (
    catIdx: number,
    itemIdx: number,
    fileId?: string,
  ) => {
    if (!fileId) return;

    if (!window.confirm("Delete this file?")) return;

    try {
      await deleteDoc({
        doctype: "File",
        name: fileId,
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
      <div className="border rounded-lg p-3 md:p-6 space-y-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="sm:col-span-2 md:col-span-1">
            <label className="text-xs text-gray-700 font-medium">Address</label>
            <input
              value={address1}
              onChange={(e) => {
                setAddress1(e.target.value);
                onChange("address_line1", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-700 font-medium">Is Metro</label>
            <select
              value={isMetro}
              onChange={(e) => {
                const v = Number(e.target.value);
                setIsMetro(v);
                onChange("rented_in_metro_city", v);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all appearance-none bg-white"
            >
              <option value={0}>Non-Metro</option>
              <option value={1}>Metro</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-700 font-medium">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                onChange("start_date", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-700 font-medium">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                onChange("end_date", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* ✅ Monthly Rental */}
          <div>
            <label className="text-xs text-gray-700 font-medium">Monthly Rental</label>
            <input
              type="number"
              value={monthlyHra}
              onChange={(e) => {
                setMonthlyHra(e.target.value);
                onChange("monthly_hra", Number(e.target.value));
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs text-gray-700 font-medium">Owner name</label>
            <input
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value);
                onChange("owner_name", e.target.value);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            />
          </div>

          {/* ✅ PAN field – mandatory when rent > 8333 */}
          <div>
            <label className="text-xs text-gray-700 font-medium">
              PAN {isPanMandatory && <span className="text-red-500">*</span>}
            </label>
            <input
              value={pan}
              onChange={(e) => {
                setPan(e.target.value);
                onChange("pan", e.target.value);
              }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${isPanMandatory && !hraData.pan ? "border-red-500" : "border-gray-300"
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
            <div className="sm:col-span-2 md:col-span-3 flex flex-col gap-2">
              <label className="text-xs text-gray-700 font-medium">
                Attachment
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">

                <input
                  type="file"
                  onChange={(e) =>
                    handleHRAFileUpload(
                      e.target.files?.[0] || null
                    )
                  }
                  className="border rounded pr-3 text-xs
          file:text-xs file:border-0
          file:bg-primary file:text-white
          file:px-3 file:py-1"
                />

                {(hraData?.proof_file ?? hraDetails?.attach_proof) && (
                  <div className="flex items-center gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">

                    <span className="text-xs truncate">
                      {hraData?.proof_file ??
                        hraDetails?.attach_proof}
                    </span>

                    <button
                      type="button"
                      onClick={handleHRARemoveProof}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <FiX size={14} />
                    </button>

                  </div>
                )}

              </div>
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
              <div className="bg-white rounded-lg w-[90%] md:w-[60%] mt-2 max-w-3xl p-4 relative">
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

                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-between">
                    <div className=" w-full flex flex-col gap-2">
                      <label className="text-xs text-gray-700 font-medium">Amount</label>
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
                        className={`max-w-[500px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${item.editable === 0
                          ? "bg-gray-200 cursor-not-allowed w-full"
                          : "w-full"
                          }`}
                      />
                    </div>
                    <div className=" flex flex-col gap-2 ">
                      <label className="text-xs text-gray-700 font-medium">
                        Attachment
                      </label>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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

                        {(item?.proof_file ?? item?.attach_reqd === 1) && (
                          <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
                            <span className="text-xs text-gray-700 truncate">
                              {item?.proof_file ?? item?.attach_proof}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                handleLTARemoveProof(catIdx, idx, item.proof_file)
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
