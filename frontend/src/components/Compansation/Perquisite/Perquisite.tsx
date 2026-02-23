/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import { X, SearchIcon } from "lucide-react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { usePerquisite } from "../../../hooks/payroll/usePerquisite";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { formatCurrency } from "../../../utils/currency";

export default function PerquisiteList() {
  const [selectedPerquisite, setSelectedPerquisite] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const { data: perquisiteData } = usePerquisite(
    user?.employee,
    user?.company
  );

  const { isDesktop } = useScreenSize();

  const perquisites = useMemo(() => {
    return ((perquisiteData as any)?.extra_payments || []).map(
      (item: any) => ({
        id: item.name,
        name: item.salary_component,
        taxableValue: item.amount,
        status: item.is_tax_applicable === 1 ? "Paid" : "Not Paid",
        description: `Payment Date: ${item.payment_date}`,
        details: {
          paymentDate: item.payment_date,
          taxApplicable: item.is_tax_applicable === 1,
          referenceNo: item.name,
        },
      })
    );
  }, [perquisiteData]);

  // ✅ SEARCH FILTER
  const filteredPerquisites = useMemo(() => {
    if (!searchTerm) return perquisites;

    return perquisites.filter((item: any) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [perquisites, searchTerm]);

  const titles = ["Perquisite Name", "Taxable Value", "Status", "Action"];
  const columnWidths = ["0.5fr", "1.2fr", "1.2fr", "1fr"];

  return (
    <div className="w-full p-1">
      <div className="mb-6">
        <Typography variant="subheading" color="body1">
          Employee Perquisite
        </Typography>
        <Typography variant="bodySmall" color="body2">
          Track Employee Perquisite History
        </Typography>
      </div>
      {isDesktop ? (
        <CardTable titles={titles} columnWidths={columnWidths}>

          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              placeholder="Search loans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-100  w-full"
            />
          </div>

          <div className="border bg-white hover:bg-primary/20">
            {filteredPerquisites.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500 text-center">
                No perquisites found
              </div>
            )}

            {filteredPerquisites.map((item: any) => (
              <div
                key={item.id}
                className="max-w-screen grid px-6 py-3 gap-4 items-center border-gray-200"
                style={{ gridTemplateColumns: columnWidths.join(" ") }}
              >
                <div className="font-medium flex justify-center">
                  {item.name}
                </div>

                <div className="font-medium items-center flex justify-center">
                  {formatCurrency(item.taxableValue)}
                </div>

                <div className="font-medium items-center flex justify-center">
                  <span
                    className={`px-2.5 py-1.5 rounded-2xl text-xs font-medium
                    ${
                      item.status === "Paid"
                        ? "bg-success/20 text-success"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="font-medium items-center flex justify-center">
                  <button
                    onClick={() => setSelectedPerquisite(item)}
                    className="text-[13px] font-medium text-primary border border-primary/40 
                    bg-primary-20 px-3 py-0.5 rounded-lg hover:bg-primary/40 
                    hover:border-primary/60 hover:text-primary-800 transition-colors duration-150"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardTable>
      ) : (
        /* ================= MOBILE ================= */
        <div className="space-y-4">
          {filteredPerquisites.length === 0 && (
            <div className="p-4 text-sm text-gray-500 text-center">
              No perquisites found
            </div>
          )}

          {filteredPerquisites.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-4 shadow-sm border"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-xl text-xs font-medium
                  ${
                    item.status === "Paid"
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
          <Card className="rounded-2xl w-full max-w-lg p-6 relative mx-4">
            <button
              onClick={() => setSelectedPerquisite(null)}
              className="absolute top-4 right-4 text-gray-500"
            >
              <X size={18} />
            </button>

            <h2 className="text-xl font-semibold">
              {selectedPerquisite.name}
            </h2>

            <p className="text-sm text-gray-500 mb-3 font-bold">
              Taxable Value:{" "}
              {formatCurrency(selectedPerquisite.taxableValue)}
            </p>

            <p className="text-sm text-gray-600 mb-4 font-bold">
              {selectedPerquisite.description}
            </p>

            <div className="bg-app rounded-xl p-4 text-sm">
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
                      <span
                        className={`font-medium ${
                          typeof value === "boolean"
                            ? value
                              ? "bg-success-100 text-success"
                              : "bg-error-100 text-error"
                            : "bg-transparent text-gray-800"
                        } px-2 py-1 rounded`}
                      >
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
          </Card>
        </div>
      )}
    </div>
  );
}