/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Typography } from "../../../shared/atoms/Typography";
export interface LTAItem {
  exemption_sub_category: string;
  component_type: string;
  description: string | null;
  editable: number;
  amount: number;
  max_amount: number;
}

export interface LTACategory {
  category_name: string;
  items: LTAItem[];
}

export interface LTAData {
  items: LTACategory[];
}

export interface HRAData {
  attach_reqd: number;
  monthly_hra: number;
  rented_in_metro_city: number;
  annual_hra_exemption: number;
  monthly_hra_exemption: number;
  start_date: string;
  end_date: string;
  pan: string;
  address_line1: string;
  address_line2: string;
  lta?: LTAData;
}
interface HRAFormProps {
  hraData: HRAData;
  onChange: (field: keyof HRAData | "lta", value: any) => void;
}
const HRAForm: React.FC<HRAFormProps> = ({ hraData, onChange }) => {
const LTAData = (hraData as unknown as any[])?.[1];

  return (
    <div className="mt-4">
      <div className="border rounded-lg p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700 uppercase">
            House Rent Allowance (Exempt u/s 10(13A))
          </h3>
        </div>

        <div className="bg-yellow-100 text-yellow-800 text-xs px-3 py-2 rounded">
          If rent is more than ₹8,333/month or ₹1,00,000/year, PAN is mandatory.
        </div>

        <div className="grid grid-cols-6 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-500">Address Line 1</label>
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
          <div>
            <label className="text-xs text-gray-500">Monthly Rental</label>
            <input
  type="number"
  value={hraData.monthly_hra}
  readOnly
  className="w-full border rounded px-3 py-2 text-sm bg-gray-100"
/>
          </div>

          <div>
            <label className="text-xs text-gray-500">PAN</label>
            <input
              value={hraData.pan}
              onChange={(e) => onChange("pan", e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          {hraData.attach_reqd === 1 && (
            <div className="col-span-2 flex items-end">
              <label className="text-sm text-gray-600 cursor-pointer flex gap-2">
                📎 Attach file
                <input type="file" hidden />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* ================= LTA Section ================= */}
      {LTAData?.items && (
        <div className="border rounded p-4 mt-4">
          <Typography variant="bodySmall" color="body1" className="font-semibold">LTA Details</Typography>

          {LTAData.items.map((category: { category_name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; items: any[]; }, catIdx: React.Key | null | undefined) => (
            <div key={catIdx} className="mb-4">
              <Typography
                variant="bodySmall"
                color="body2"
                className="mb-2"
              >
              Category Name:  {category.category_name}
              </Typography>

              {category.items.map((item, idx) => (
                <div
                  key={item.exemption_sub_category}
                  className="grid grid-cols-2 gap-4 mb-4 border-b pb-4"
                >
                  <div className="col-span-2 flex justify-between items-center">
                    <Typography variant="bodySmall" color="body2" className="font-medium">
                    Sub Category {item.exemption_sub_category}
                    </Typography>
                    <span className="text-sm text-gray-600">
                      Max: {item.max_amount}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm text-gray-500">Amount</label>
                    <input
                      type="number"
                      value={item.amount}
                      readOnly={item.editable === 0}
                      onChange={(e) => {
                        if (catIdx === null || catIdx === undefined) return
                      
                        const categoryIndex = Number(catIdx)
                        if (Number.isNaN(categoryIndex)) return
                      
                        const updatedCategories = [...LTAData.items]
                        const updatedItems = [...category.items]
                      
                        updatedItems[idx] = {
                          ...item,
                          amount: Number(e.target.value),
                        }
                      
                        updatedCategories[categoryIndex] = {
                          ...category,
                          items: updatedItems,
                        }
                      
                        onChange("lta", { items: updatedCategories })
                      }}
                      className={`w-full border rounded px-3 py-1 ${
                        item.editable === 0
                          ? "bg-gray-200 cursor-not-allowed"
                          : ""
                      }`}
                    />
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
