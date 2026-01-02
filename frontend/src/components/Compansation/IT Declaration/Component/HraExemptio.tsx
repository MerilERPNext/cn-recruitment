"use client"

import type React from "react"

export interface HRAData {
  monthly_hra: number
  rented_in_metro_city: number
  annual_hra_exemption: number
  monthly_hra_exemption: number
  start_date: string
  end_date: string
  pan: string
  address_line1: string
  address_line2: string
}

interface HRAFormProps {
  hraData: HRAData
  onChange: (field: keyof HRAData, value: string | number) => void
}

const HRAForm: React.FC<HRAFormProps> = ({ hraData, onChange }) => {
  console.log("API RESPONSE STATE ", hraData)
  return (
    <div className="grid grid-cols-2 gap-4 rounded border border-gray-300 p-4 mt-4">
      {/* Monthly HRA - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">Monthly HRA</label>
        <input
          type="number"
          value={hraData.monthly_hra}
          onChange={(e) => onChange("monthly_hra", Number(e.target.value))}
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* Rented in Metro City - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">Rented in Metro City</label>
        <select
          value={hraData.rented_in_metro_city}
          onChange={(e) => onChange("rented_in_metro_city", Number(e.target.value))}
          className="w-full border rounded px-3 py-1"
        >
          <option value={0}>No</option>
          <option value={1}>Yes</option>
        </select>
      </div>

      {/* Annual HRA Exemption - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">Annual HRA Exemption</label>
        <input
          type="number"
          value={hraData.annual_hra_exemption}
          readOnly
          onChange={(e) => onChange("annual_hra_exemption", Number(e.target.value))}
          className="w-full border rounded px-3 py-1 bg-gray-300"
        />
      </div>

      {/* Monthly HRA Exemption - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">Monthly HRA Exemption</label>
        <input
          type="number"
          value={hraData.monthly_hra_exemption}
          readOnly
          onChange={(e) => onChange("monthly_hra_exemption", Number(e.target.value))}
          className="w-full border rounded px-3 py-1 bg-gray-300"
        />
      </div>

      {/* Start Date - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">Start Date</label>
        <input
          type="date"
          value={hraData.start_date}
          onChange={(e) => onChange("start_date", e.target.value)}
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* End Date - EDITABLE */}
      <div>
        <label className="text-sm text-gray-500">End Date</label>
        <input
          type="date"
          value={hraData.end_date}
          onChange={(e) => onChange("end_date", e.target.value)}
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* PAN - EDITABLE */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">PAN</label>
        <input
          type="text"
          value={hraData.pan}
          onChange={(e) => onChange("pan", e.target.value)}
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* Address Line 1 - EDITABLE */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">Address Line 1</label>
        <input
          type="text"
          value={hraData.address_line1}
          onChange={(e) => onChange("address_line1", e.target.value)}
          className="w-full border rounded px-3 py-1"
        />
      </div>

      {/* Address Line 2 - EDITABLE */}
      <div className="col-span-2">
        <label className="text-sm text-gray-500">Address Line 2</label>
        <input
          type="text"
          value={hraData.address_line2}
          onChange={(e) => onChange("address_line2", e.target.value)}
          className="w-full border rounded px-3 py-1"
        />
      </div>
    </div>
  )
}

export default HRAForm
