/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { Typography } from "../../../shared/atoms/Typography";
import LTACards from "./LtaBreakUp";
import { FiX } from "react-icons/fi";
import { useDeleteDocument } from "../../../../hooks/payroll/UseDeleteDocuemt";
import { useFileUpload } from "../../../../hooks/useEmployee";
import HraFormioSchema from "./HraFormio.json";

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
  attachments?: any[];
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
  const formInstanceRef = useRef<any>(null);

  const LTAData = (hraData as unknown as any[])?.[1];
  const hraDetails = (hraData as unknown as any[])?.[0];

  useEffect(() => {
    if (!formInstanceRef.current) return;

    // Sync data into Formio using hraData passed as props.
    // Ensure data exists first to avoid overriding user input
    // and infinite render loops down the line.
    const mappedData = {
      address_line1: hraData.address_line1 ?? hraDetails?.address_line1 ?? "",
      rented_in_metro_city: hraData.rented_in_metro_city ?? hraDetails?.rented_in_metro_city ?? 0,
      start_date: hraData.start_date ?? hraDetails?.start_date ?? "",
      end_date: hraData.end_date ?? hraDetails?.end_date ?? "",
      monthly_hra: hraData.monthly_hra ?? hraDetails?.monthly_hra ?? "",
      owner_name: hraData.owner_name ?? hraDetails?.owner_name ?? "",
      pan: hraData.pan ?? hraDetails?.pan ?? "",
    };

    formInstanceRef.current.setSubmission({ data: mappedData });

  }, [
    hraData.address_line1,
    hraData.end_date,
    hraData.monthly_hra,
    hraData.owner_name,
    hraData.pan,
    hraData.rented_in_metro_city,
    hraData.start_date,
    hraDetails?.address_line1,
    hraDetails?.end_date,
    hraDetails?.monthly_hra,
    hraDetails?.owner_name,
    hraDetails?.pan,
    hraDetails?.rented_in_metro_city,
    hraDetails?.start_date,
  ]);

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
    console.log(file)
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
    console.log(file);
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
      {/* ================= HRA Section Formio ================= */}
      <Form
        form={HraFormioSchema}
        onFormReady={(instance: any) => {
          formInstanceRef.current = instance;
        }}
        onChange={(submission: any) => {
          // Capture changes and push them back up via the generic onChange prop
          if (submission.changed) {
            const field = submission.changed.component.key;
            const value = submission.data[field];

            if (field === 'attachments') {
              handleHRAFileUpload(submission.data.attachments[0]?.file);
            } else {
              onChange(field, value);
            }
          }
        }}
        options={{ submitButton: false, noAlerts: true }}
      />

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
