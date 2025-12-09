import { useRef, useEffect, useState, useCallback } from "react";
import { Form } from "@tsed/react-formio";
import ProfileGridSkeleton from "./ProfileSkeleton";
import {
  useGetEmployeeDetailsByEmpId,
  useGetEmployeeFieldPermissions,
  useCurrentEmployeeAllDetails,
} from "../../hooks/useEmployee";
import { convertToFormioWithTabMetadata, type TabWithSchema } from "./FrappeToFormIoConverterSepTabs";
import { useUpdateFrappeDocument } from "../../hooks/useFrappeQuery";
import CircularLoader from "../shared/atoms/CircularLoader";
import toast from "react-hot-toast";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";

const EmployeeProfileForm: React.FC = () => {
  const { targetEmployeeId } = useTargetUser();
  const { data: userId } = useLoggedInUser();
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentEmployeeAllDetails(userId || "");

  // Use targetEmployeeId if viewing another user, otherwise use current user's employee ID
  const employeeId = targetEmployeeId || (isCurrentUserLoading ? null : currentUser?.employee) || "";

  const [tabs, setTabs] = useState<TabWithSchema[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formInstances = useRef<Record<string, any>>({});
  const employee = useGetEmployeeDetailsByEmpId(employeeId);
  const mutation = useUpdateFrappeDocument();
  const { data: fieldPermissions } = useGetEmployeeFieldPermissions({
    doctype: "Employee",
    docname: employeeId,
    all_fields: 0,
    detailed: 1,
    include_breaks: 1,
  });

  // Refs for scroll-spy
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isTabChangeRef = useRef(false);

  useEffect(() => {
    if (!fieldPermissions || !employee?.data) return;

    const result = convertToFormioWithTabMetadata(fieldPermissions, employee?.data);
    setTabs(result.tabs);
    if (result.tabs.length > 0) {
      setActiveTab(result.tabs[0].key);
    }
  }, [fieldPermissions, employee?.data]);

  // Scroll-spy implementation
  const setupScrollSpy = useCallback(() => {
    if (tabs.length === 0) return;

    // Find the parent scroll container (from EmployeeProfile.tsx)
    const firstSection = Object.values(sectionRefs.current)[0];
    if (!firstSection) return;

    // Find the scrollable parent
    let scrollParent: HTMLElement | null = firstSection.parentElement;
    while (scrollParent) {
      const overflowY = window.getComputedStyle(scrollParent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        break;
      }
      scrollParent = scrollParent.parentElement;
    }

    if (!scrollParent) {
      console.warn('No scroll parent found');
      return;
    }

    const observerOptions = {
      root: scrollParent,
      rootMargin: "-100px 0px -66% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    let currentIntersecting: { key: string; ratio: number }[] = [];

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isTabChangeRef.current) return;

      entries.forEach((entry) => {
        const sectionKey = entry.target.getAttribute("data-section");
        if (!sectionKey) return;

        if (entry.isIntersecting) {
          const existingIndex = currentIntersecting.findIndex(
            (item) => item.key === sectionKey
          );
          if (existingIndex >= 0) {
            currentIntersecting[existingIndex].ratio = entry.intersectionRatio;
          } else {
            currentIntersecting.push({
              key: sectionKey,
              ratio: entry.intersectionRatio,
            });
          }
        } else {
          currentIntersecting = currentIntersecting.filter(
            (item) => item.key !== sectionKey
          );
        }
      });

      if (currentIntersecting.length > 0) {
        const mostVisible = currentIntersecting.reduce((prev, current) =>
          current.ratio > prev.ratio ? current : prev
        );
        setActiveTab(mostVisible.key);
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    Object.values(sectionRefs.current).forEach((section) => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => observer.disconnect();
  }, [tabs]);

  useEffect(() => {
    const cleanup = setupScrollSpy();
    return cleanup;
  }, [setupScrollSpy]);

  // Scroll to section when tab is clicked
  const scrollToSection = useCallback((key: string) => {
    // Update active tab immediately
    setActiveTab(key);

    const section = sectionRefs.current[key];
    if (section) {
      isTabChangeRef.current = true;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        isTabChangeRef.current = false;
      }, 1000);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      // Collect data from all form instances
      const allData: Record<string, unknown> = {};

      for (const tab of tabs) {
        const instance = formInstances.current[tab.key];
        if (instance) {
          const submission = await instance.submit();
          const submissionData = submission?.data || {};
          Object.assign(allData, submissionData);
        }
      }

      // Format the data
      const formattedData = Object.entries(allData).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: { [key: string]: any }, [key, value]) => {
          if (key === "branch") {
            return acc;
          }

          if (Array.isArray(value) && !value.length) {
            acc[key] = "";
          } else if (
            Array.isArray(value) &&
            (value[0]?.storage === "customBase64" ||
              value[0]?.storage === "url")
          ) {
            acc[key] = value[0]?.url;
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      if (employeeId) {
        mutation.mutate(
          {
            doctype: "Employee",
            name: employeeId,
            data: formattedData,
          },
          {
            onSuccess() {
              employee.refetch();
              toast.success("Updated data successfully.");
            },
            onError(err) {
              toast.error("Failed to update data.");
              console.warn("Form submission error -", err);
            },
          }
        );
      }
    } catch (err) {
      toast.error("Failed to update data.");
      console.warn("Form submission error -", err);
    }
  };

  if (tabs.length === 0 || !employee?.data) {
    return <ProfileGridSkeleton />;
  }

  return (
    <div className="w-full max-w-full bg-white p-0">
      {/* Custom sticky tab header */}
      {tabs.length > 1 && (
        <div className="sticky top-12 md:top-16 z-10 bg-white px-4 flex-shrink-0 w-full max-w-full border-b-2 border-gray-200 ">
          <div className="flex bg-white overflow-x-scroll scrollbar-hide gap-2 w-full max-w-full py-2 md:max-w-[calc(100vw-23rem)]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => scrollToSection(tab.key)}
                className={`whitespace-nowrap px-2 py-1 rounded-[32px] text-sm font-medium transition-all duration-200 ${activeTab === tab.key
                  ? "bg-blue-100 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-blue-600"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form content - no internal scroll */}
      <div className="w-full p-4 ">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            ref={(el) => {
              sectionRefs.current[tab.key] = el;
            }}
            data-section={tab.key}
            className="mb-6 last:mb-0 w-full max-w-full min-h-[200px]"
          >
            {/* Tab section heading */}
            <div className="mb-4 pb-3 border-b-2 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{tab.label}</h2>
            </div>

            <Form
              className="profile-form w-full max-w-full bg-white"
              form={tab.schema}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onFormReady={(instance: any) => {
                formInstances.current[tab.key] = instance;
              }}
              options={{
                builder: { styles: false },
                submitButton: false,
                alerts: false,
                disableOnSubmit: true,
                rowClass: "flex flex-col md:flex-row md:space-x-4",
                labelClass: "mb-1 font-medium text-gray-700",
                inputClass:
                  "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
                validateOnInit: true,
                validateOnBlur: true,
                validateOnChange: false,
                disableOnInit: mutation.isPending,
                formClass: mutation.isPending ? "form-disabled" : "space-y-6",
              }}
            />
          </div>
        ))}

        {/* Submit button */}
        <div className="w-full bg-white py-2">
          <button
            onClick={handleSubmit}
            disabled={mutation?.isPending}
            className="w-full rounded-lg py-3 bg-black text-white font-medium hover:bg-gray-800 transition-colors hidden"
          >
            {mutation?.isPending || employee.isLoading ? (
              <CircularLoader size="sm" color="white" />
            ) : (
              "Update"
            )}{" "}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileForm;
