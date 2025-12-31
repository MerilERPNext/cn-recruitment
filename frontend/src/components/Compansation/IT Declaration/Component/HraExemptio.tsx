"use client";

import React from "react";

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
}

interface HRAFormProps {
  hraData: HRAData;
  onChange: (
    field: "rented_in_metro_city" | "monthly_hra",
    value: number
  ) => void;
}

const HRAForm: React.FC<HRAFormProps> = ({ hraData, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4 rounded border border-gray-300 p-4 mt-4">

      {/* Monthly HRA (Readonly) */}
      <div>
        <label className="text-sm text-gray-500">Monthly HRA</label>
        <input
          type="number"
          value={hraData.monthly_hra}
          onChange={(e) =>
            onChange("monthly_hra", Number(e.target.value))
          }
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* Rented in Metro City (Editable) */}
      <div>
        <label className="text-sm text-gray-500">Rented in Metro City</label>
        <select
          value={hraData.rented_in_metro_city}
          onChange={(e) =>
            onChange("rented_in_metro_city", Number(e.target.value))
          }
          className="w-full border rounded px-3 py-1"
        >
          <option value={0}>No</option>
          <option value={1}>Yes</option>
        </select>
      </div>

      {/* Annual HRA Exemption (Readonly) */}
      <div>
        <label className="text-sm text-gray-500">
          Annual HRA Exemption
        </label>
        <input
          type="number"
          value={hraData.annual_hra_exemption}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* Monthly HRA Exemption (Editable) */}
      <div>
        <label className="text-sm text-gray-500">
          Monthly HRA Exemption
        </label>
        <input
          type="number"
          value={hraData.monthly_hra_exemption}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* Start Date (Readonly) */}
      <div>
        <label className="text-sm text-gray-500">Start Date</label>
        <input
          type="date"
          value={hraData.start_date}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* End Date (Readonly) */}
      <div>
        <label className="text-sm text-gray-500">End Date</label>
        <input
          type="date"
          value={hraData.end_date}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* PAN (Readonly) */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">PAN</label>
        <input
          type="text"
          value={hraData.pan}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* Address Line 1 */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">Address Line 1</label>
        <input
          type="text"
          value={hraData.address_line1}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>

      {/* Address Line 2 */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">Address Line 2</label>
        <input
          type="text"
          value={hraData.address_line2}
          readOnly
          className="w-full border rounded px-3 py-1 bg-gray-100"
        />
      </div>
    </div>
  );
};

export default HRAForm;
