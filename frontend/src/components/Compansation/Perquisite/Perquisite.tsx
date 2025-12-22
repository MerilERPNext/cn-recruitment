/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { X } from "lucide-react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { usePerquisite } from "../../../hooks/payroll/usePerquisite";

const perquisites = [
  {
    id: "P-001",
    name: "Company Car",
    type: "Vehicle",
    taxableValue: 120000,
    status: "Applicable",
    description: "Car provided by company for official and personal use",
    details: {
      engineCC: 1600,
      fuelProvided: true,
      driverProvided: true,
      usage: "Personal + Official",
    },
  },
  {
    id: "P-002",
    name: "Rent Free Accommodation",
    type: "Accommodation",
    taxableValue: 300000,
    status: "Applicable",
    description: "House provided by employer",
    details: {
      city: "Delhi",
      accommodationType: "Furnished",
      rentValue: 25000,
    },
  },
  {
    id: "P-003",
    name: "Medical Reimbursement",
    type: "Medical",
    taxableValue: 15000,
    status: "Not Applicable",
    description: "Medical expenses reimbursed by company",
    details: {
      annualLimit: 15000,
      billsRequired: true,
    },
  },
];

export default function PerquisiteList() {
    const [selectedPerquisite, setSelectedPerquisite] = useState<any>(null);
    const {data: perquisiteData} = usePerquisite(
        "EMP-0001",
        "My Company",
        "2024-06"
    );
   console.log("Perquisite Data:", perquisiteData);
    const { isDesktop } = useScreenSize();
  
    const titles = [
      "Perquisite Name",
      "Type",
      "Taxable Value",
      "Status",
      "Action",
    ];
  
    const columnWidths = ["2fr", "1.2fr", "1.2fr", "1fr", "0.8fr"];
  
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
  
    return (
      <div className="w-full">
        {/* ================= DESKTOP ================= */}
        {isDesktop ? (
          <CardTable titles={titles} columnWidths={columnWidths}>
            <div className="card-subtitle bg-white border-t border-gray-200">
              {perquisites.map((item) => (
                <div
                  key={item.id}
                  className="grid px-6 py-3 gap-4 items-center border-b border-gray-200 "
                  style={{ gridTemplateColumns: columnWidths.join(" ") }}
                >
                  <div className="font-medium">{item.name}</div>
                  <div>{item.type}</div>
                  <div className="font-medium">
                    {formatCurrency(item.taxableValue)}
                  </div>
  
<div>                  <span
                    className={`px-2.5 py-0.5 rounded-2xl text-xs font-medium
                    ${
                      item.status === "Applicable"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                  </div>
  
<div>                  <button
                    onClick={() => setSelectedPerquisite(item)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </button>
                  </div>
                </div>
              ))}
            </div>
          </CardTable>
        ) : (
          /* ================= MOBILE ================= */
          <div className="space-y-4">
            {perquisites.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 shadow-sm border"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
  
                  <span
                    className={`px-2 py-0.5 rounded-xl text-xs font-medium
                    ${
                      item.status === "Applicable"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
  
                <div className="mt-2 text-sm font-medium">
                  {formatCurrency(item.taxableValue)}
                </div>
  
                <button
                  onClick={() => setSelectedPerquisite(item)}
                  className="mt-3 text-sm text-blue-600 font-medium"
                >
                  View Details →
                </button>
              </div>
            ))}
          </div>
        )}
  
        {/* ================= DETAILS MODAL ================= */}
        {selectedPerquisite && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative mx-4">
              <button
                onClick={() => setSelectedPerquisite(null)}
                className="absolute top-4 right-4 text-gray-500"
              >
                <X size={18} />
              </button>
  
              <h2 className="text-xl font-semibold">
                {selectedPerquisite.name}
              </h2>
  
              <p className="text-sm text-gray-500 mb-3">
                Taxable Value:{" "}
                {formatCurrency(selectedPerquisite.taxableValue)}
              </p>
  
              <p className="text-sm text-gray-600 mb-4">
                {selectedPerquisite.description}
              </p>
  
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <h3 className="font-medium mb-2">Perquisite Details</h3>
  
                <ul className="space-y-2">
                  {Object.entries(selectedPerquisite.details).map(
                    ([key, value]) => (
                      <li
                        key={key}
                        className="flex justify-between border-b last:border-b-0 pb-1"
                      >
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="font-medium">
                          {typeof value === "boolean"
                            ? value
                              ? "Yes"
                              : "No"
                            : String(value)}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
