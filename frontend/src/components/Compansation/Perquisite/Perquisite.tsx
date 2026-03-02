/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo } from "react";
import { FileText, X } from "lucide-react";
import CardTable from "../../shared/CardTable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { usePerquisite } from "../../../hooks/payroll/usePerquisite";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { formatCurrency } from "../../../utils/currency";
import StatusBadge from "../../shared/atoms/statusBadge";
import SearchInputWrapper from "../../shared/SearchBar";

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
    <div className="w-full lg:p-4 p-2">
      <div className="sm:mb-4 px-2 mb-2">
        <Typography variant="h4">
          Employee Perquisite
        </Typography>
        {isDesktop &&
          <Typography variant="bodySmall" color="body2">
            Track Employee Perquisite History
          </Typography>
        }
      </div>
      {isDesktop ? (
        <CardTable titles={titles} columnWidths={columnWidths}>

        
          <div className="flex items-center w-full border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
              <SearchInputWrapper
                searchTerm={searchTerm}
                handleSearch={(e) => setSearchTerm(e.target.value)}
              />
            </div>
   

          <div className="border bg-white hover:bg-primary/10">
            {filteredPerquisites.length === 0 && (
    <div className="flex items-center justify-center py-16">
    <div className="text-center">
      <FileText className="w-10 h-10 mx-auto text-blue-400 mb-3" />
      <Typography variant="h4">No records found</Typography>
      <Typography variant="bodySmall">
        No invoice available.
      </Typography>
    </div>
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
                  <StatusBadge status={item.status} />
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
              className="cursor-pointer border-t-4 border-x border-b mt-2
                border-x-primary/20 border-b-primary/20 
                shadow-sm border-primary bg-white rounded-xl"
              onClick={() => setSelectedPerquisite(item)}
            >
              <div className="p-4 flex flex-col gap-3 w-full">
                {/* Header: Perquisite Name + Status */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">Perquisite Name</Typography>
                    <Typography variant="mobileCardValue">
                      {item.name}
                    </Typography>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Amount Row */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Typography variant="mobileCardLabel">Taxable Value</Typography>
                    <Typography variant="mobileCardValue">
                      {formatCurrency(item.taxableValue)}
                    </Typography>
                  </div>
                </div>

                <div className="w-full flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPerquisite(item);
                    }}
                    className="text-[13px] font-medium text-primary border border-primary/40 
                    bg-primary-20 px-3 py-1 rounded-lg hover:bg-primary/40 
                    hover:border-primary/60 hover:text-primary-800 transition-colors duration-150"
                  >
                    View Details
                  </button>
                </div>
              </div>
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
                        className={`font-medium ${typeof value === "boolean"
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