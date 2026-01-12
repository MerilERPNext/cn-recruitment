/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";

// HRA fields
export interface HRAData {
  monthly_hra: number;
  rented_in_metro_city: number;
  annual_hra_exemption: number;
  monthly_hra_exemption: number;
  start_date: string;
  end_date: string;
  pan: string;
  address_line1: string;
  address_line2: string;
  // Add LTA inside HRAData
  lta?: LTAItem[];
}

// LTA item structure
export interface LTAItem {
  exemption_sub_category: string;
  component_type: string;
  description: string | null;
  editable: number; // 1 = editable
  amount: number;
  max_amount: number;
}

// Props now only need hraData and onChange
interface HRAFormProps {
  hraData: HRAData;
  onChange: (field: keyof HRAData | "lta", value: any) => void;
}

const HRAForm: React.FC<HRAFormProps> = ({ hraData, onChange }) => {
  const LTAData = hraData?.lta;
  console.log("LTAData in HRAForm:", LTAData);
  return (
    <div className="mt-4 ">
      {/* HRA Section */}
{/* HRA UI – Screenshot style */}
<div className="border rounded-lg p-6 space-y-5">

  {/* Title */}
  <div className="flex justify-between items-center">
    <h3 className="text-sm font-semibold text-gray-700 uppercase">
      House Rent Allowance (Exempt u/s 10(13A))
    </h3>
    <button className="text-xs text-primary underline">
      Download Rental Form
    </button>
  </div>

  {/* Info */}
  <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-2 rounded">
    If rent is more than ₹8,333/month or ₹1,00,000/year, PAN is mandatory.
  </div>

  {/* Fields */}
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
      <input type="date" value={hraData.start_date} onChange={(e) => onChange("start_date", e.target.value)} className="w-full border rounded px-3 py-1" />
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

    <div>
      <label className="text-xs text-gray-500">Monthly Rental</label>
      <input
        type="number"
        value={hraData.monthly_hra}
        onChange={(e) =>
          onChange("monthly_hra", Number(e.target.value))
        }
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div>
      <label className="text-xs text-gray-500">Owner Name</label>
      <input
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="Owner Name"
      />
    </div>

    <div>
      <label className="text-xs text-gray-500">Owner PAN</label>
      <input
        value={hraData.pan}
        onChange={(e) => onChange("pan", e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>

    <div className="flex items-end">
      <label className="text-sm text-gray-600 cursor-pointer flex gap-2">
        📎 Attach file
        <input type="file" hidden />
      </label>
    </div>
  </div>

</div>



      {/* LTA Section inside HRAData */}

      <div className="border rounded p-4 mt-4">
        <h3 className="text-lg font-semibold mb-4">LTA Details</h3>
        {LTAData?.map((item: any, idx: number) => (
          <div
            key={item.exemption_sub_category}
            className="grid grid-cols-2 gap-4 mb-4 border-b pb-4"
          >
            <div className="col-span-2 flex justify-between items-center">
              <span className="font-medium">{item.exemption_sub_category}</span>
              <span className="text-sm text-gray-500">Max: {item.max_amount}</span>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Amount</label>
              <input
                type="number"
                value={item.amount}
                readOnly={item.editable === 0}
                onChange={(e) => {
                  const updatedLta = [...hraData.lta!];
                  updatedLta[idx] = { ...item, amount: Number(e.target.value) };
                  onChange("lta", updatedLta);
                }}
                className={`w-full border rounded px-3 py-1 ${item.editable === 0 ? "bg-gray-300" : ""
                  }`}
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default HRAForm;
