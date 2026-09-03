/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import assignmentDetailsFormSchema from "./assignmentDetailsFormSchema.json";
import {
  useCurrentEmployeeDetails,
  useEmployee,
  useGetAssignmentDetails,
} from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import HeaderBar from "../HeaderBar";
import CircularLoader from "../shared/atoms/CircularLoader";
import { Typography } from "../shared/atoms/Typography";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import { useScreenSize } from "../../hooks/useScreenSize";

const AssignmentDetailsPage = () => {
  const { isDesktop } = useScreenSize();
  const { targetEmployeeId } = useTargetUser();
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });

  const employeeId = targetEmployeeId || currentUser?.employee || "";
  const { data: targetEmployee } = useEmployee(employeeId);

  const employeeName = targetEmployee?.employee_name || "";

  const [selectedModule, setSelectedModule] = useState("Separation");
  const instanceRef = useRef<any>(null);
  // Ref avoids stale closure in the Form.io change handler
  const selectedModuleRef = useRef(selectedModule);
  selectedModuleRef.current = selectedModule;

  const { data: responseData, isLoading: isFetching } = useGetAssignmentDetails(
    selectedModule,
    employeeId,
  );

  const formatHeader = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const renderSections = () => {
    if (!responseData) return null;

    // Unwrap envelope: { module, employee, data: [...] }
    const sections = Array.isArray(responseData)
      ? responseData
      : Array.isArray(responseData?.data)
        ? responseData.data
        : null;

    if (!sections || sections.length === 0) {
      return <p className="text-gray-500 p-4">No data available.</p>;
    }

    // Format: [{ section, items: [{ ...fields, link? }] }]
    // Flatten into one table: Section column + item field columns
    if ("section" in sections[0] && "items" in sections[0]) {
      // Collect all item field keys (excluding "link") from the first non-empty section
      const firstItems = sections.find(
        (s: any) => s.items?.length > 0
      )?.items;
      if (!firstItems) return <p className="text-gray-500 p-4">No data available.</p>;

      const itemColumns = Object.keys(firstItems[0]).filter((k) => k !== "link");
      const columns = ["Section", ...itemColumns];

      // Group sections by name — multiple section objects with same name → one row
      const grouped = new Map<string, any[]>();
      sections.forEach((sectionObj: { section: string; items: any[] }) => {
        const existing = grouped.get(sectionObj.section) ?? [];
        grouped.set(sectionObj.section, [...existing, ...(sectionObj.items || [])]);
      });

      return (
        <div className="assignment-details-table mt-4 overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full table-fixed text-sm text-text-body1">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {formatHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([sectionName, items], rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="min-w-0 break-words px-4 py-3 align-top text-text-body1">
                      {col === "Section" ? (
                        sectionName
                      ) : (
                        <div className="flex flex-col gap-1">
                          {items.length === 0 ? (
                            <span>-</span>
                          ) : (
                            items.map((item: any, i: number) =>
                              item.link ? (
                                <a
                                  key={i}
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-text-link hover:text-primary hover:underline break-words"
                                >
                                  {item[col] || "-"}
                                </a>
                              ) : item[col] ? (
                                <span key={i}>{String(item[col])}</span>
                              ) : (
                                <span key={i}>-</span>
                              )
                            )
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Fallback: flat array — handles both plain objects and {field, field_link} pattern
    // Exclude any key that ends with "_link" or equals "link" from visible columns
    const allKeys = Object.keys(sections[0]);
    const linkKeySet = new Set(allKeys.filter((k) => k === "link" || k.endsWith("_link")));
    const columns = allKeys.filter((k) => !linkKeySet.has(k));

    return (
      <div className="assignment-details-table mt-4 overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full table-fixed text-sm text-text-body1">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {formatHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((row: any, rowIdx: number) => (
              <tr
                key={rowIdx}
                className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
              >
                {columns.map((col) => {
                  // Resolve link: prefer {col}_link, then fall back to "link"
                  const linkUrl = row[`${col}_link`] ?? row["link"] ?? null;
                  return (
                    <td key={col} className="px-4 py-3 text-text-body1">
                      {linkUrl ? (
                        <a
                          href={linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-link hover:text-primary hover:underline break-words"
                        >
                          {row[col] || "-"}
                        </a>
                      ) : row[col] ? (
                        String(row[col])
                      ) : (
                        "-"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const content = (
    <div className="assignment-details-page rounded-lg border border-border bg-card p-6 text-text-body1">
      {/* Header */}
      {employeeName && (
        <Typography variant="bodyMedium" className="text-text-body1 mb-4">
          Policies assigned to{" "}
          <span className="font-semibold text-text-title">{employeeName}</span>
          {employeeId && (
            <span className="text-gray-500"> ({employeeId})</span>
          )}
        </Typography>
      )}

      {/* Form.io Select */}
      <div className="assignment-details-form max-w-xs">
        <Form
          form={assignmentDetailsFormSchema}
          onFormReady={(form: any) => {
            instanceRef.current = form;
            form.setPristine(true);
            form.setSubmission(
              { data: { module: "Separation" } },
              { pristine: true }
            );
            form.on("change", (event: any) => {
              const module = event?.data?.module;
              // Use ref to avoid stale closure; React bails out if value unchanged
              if (module && module !== selectedModuleRef.current) {
                setSelectedModule(module);
              }
            });
          }}
          options={{
            submitButton: false,
            alerts: false,
          }}
        />
      </div>

      {/* Table Content */}
      <div className="mt-2 min-h-[200px]">
        {isFetching ? (
          <div className="flex justify-center items-center h-40">
            <CircularLoader />
          </div>
        ) : (
          renderSections()
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="Assignment Details">
        <div className="bg-app min-h-full p-6 w-full">{content}</div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <HeaderBar title="Assignment Details" />
      <div className="p-4">{content}</div>
    </div>
  );
};

export default AssignmentDetailsPage;
