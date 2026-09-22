/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Form } from "@tsed/react-formio";
import toast from "react-hot-toast";

import { useNewHireFormConfig, useCreateNewHireMutation } from "../../../hooks/useNewHire";
import {
  compileTabSchema,
  sanitizeNewHirePayload,
  buildSelectData,
  evalDependsOn,
} from "./newHireFormioSchema";
import "../../../formio.custom.css";
import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import ProfileSkeleton from "../../shared/molecules/Skeletons/ProfileSkeleton";
import NoDataFound from "../../shared/atoms/NoDataFound";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

const AddEmployee: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();

  const { data: configResponse, isLoading, isError, error, refetch } = useNewHireFormConfig();
  const { mutateAsync: createNewHire, isPending: isSubmitting } = useCreateNewHireMutation();

  const configData = configResponse?.data;
  const tabs = configData?.tabs || [];

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [formSyncTick, setFormSyncTick] = useState(0);
  const formDataRef = useRef<Record<string, any>>({});
  const formInstancesRef = useRef<Record<number, any>>({});

  // Active tab schema
  const currentTab = tabs[activeTabIndex];
  const activeTabSchema = useMemo(() => {
    if (!currentTab) return null;
    return compileTabSchema(currentTab);
  }, [currentTab]);

  // Memoize form submission per tab and on explicit sync ticks so typing does not trigger submission re-pushes
  const formSubmission = useMemo(
    () => ({
      data: formDataRef.current,
      metadata: { selectData: buildSelectData(formDataRef.current) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTabIndex, formSyncTick]
  );

  // Handle form field changes without triggering full form re-renders on each keystroke
  const handleChange = (submission: any) => {
    const prevData: any = formDataRef.current;
    const newData = { ...prevData, ...(submission?.data || {}) };
    const changedKey = submission?.changed?.component?.key;

    let syncNeeded = false;

    // Cascading clears for dependent select fields
    if (changedKey === "company" && newData.company !== prevData.company) {
      newData.department = "";
      delete newData.department_title;
      newData.designation = "";
      delete newData.designation_title;
      syncNeeded = true;
    } else if (changedKey === "department" && newData.department !== prevData.department) {
      newData.designation = "";
      delete newData.designation_title;
      syncNeeded = true;
    }

    const selectData = submission?.metadata?.selectData;
    if (selectData && typeof selectData === "object") {
      const labelOf = (v: any) =>
        v && typeof v === "object" ? (v.employee_name ?? v.label ?? v.name ?? v.title) : undefined;
      Object.keys(selectData).forEach((key) => {
        const sd = selectData[key];
        if (Array.isArray(sd)) {
          const labels = sd.map((v: any) => labelOf(v)).filter(Boolean);
          if (labels.length) newData[`${key}_title`] = labels;
          else delete newData[`${key}_title`];
        } else {
          const lbl = labelOf(sd);
          if (lbl) newData[`${key}_title`] = lbl;
          else delete newData[`${key}_title`];
        }
      });
    }

    formDataRef.current = newData;

    if (syncNeeded) {
      setFormSyncTick((tick) => tick + 1);
    }
  };

  // Validate current tab before advancing
  const validateCurrentTab = (): string[] => {
    if (!currentTab) return [];
    const errors: string[] = [];
    const data = formDataRef.current;

    currentTab.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.read_only === 1) return;
        if (field.depends_on && !evalDependsOn(field.depends_on, data)) return;

        const isRequired =
          field.is_mandatory === 1 || evalDependsOn(field.mandatory_depends_on, data);

        if (isRequired) {
          const val = data[field.fieldname];
          if (
            val === undefined ||
            val === null ||
            val === "" ||
            (Array.isArray(val) && val.length === 0)
          ) {
            errors.push(`${field.label || field.fieldname} is required.`);
          }
        }
      });
    });

    return errors;
  };

  const handleNext = async () => {
    const errors = validateCurrentTab();
    const instance = formInstancesRef.current[activeTabIndex];
    if (instance) {
      instance.checkValidity(formDataRef.current, true, formDataRef.current);
    }

    if (errors.length > 0) {
      toast.error(errors[0]);
      setTimeout(() => {
        const firstError = document.querySelector(
          ".formio-error-wrapper, .has-error, .required-field"
        );
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    if (activeTabIndex < tabs.length - 1) {
      setActiveTabIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Validate all mandatory fields across all tabs
  const validateAllTabs = (): { isValid: boolean; missingLabel?: string; tabIndex?: number } => {
    const data = formDataRef.current;
    for (let tIdx = 0; tIdx < tabs.length; tIdx++) {
      const tab = tabs[tIdx];
      for (const section of tab.sections) {
        for (const field of section.fields) {
          if (field.read_only === 1) continue;
          if (field.depends_on && !evalDependsOn(field.depends_on, data)) continue;

          const isRequired =
            field.is_mandatory === 1 || evalDependsOn(field.mandatory_depends_on, data);

          if (isRequired) {
            const val = data[field.fieldname];
            if (
              val === undefined ||
              val === null ||
              val === "" ||
              (Array.isArray(val) && val.length === 0)
            ) {
              return { isValid: false, missingLabel: field.label, tabIndex: tIdx };
            }
          }
        }
      }
    }
    return { isValid: true };
  };

  // Submit new hire
  const handleSave = async (redirectRoute = "/webapp/employees-directory/new-hires") => {
    const validation = validateAllTabs();
    if (!validation.isValid) {
      if (validation.tabIndex !== undefined && validation.tabIndex !== activeTabIndex) {
        setActiveTabIndex(validation.tabIndex);
      }
      toast.error(`Required: ${validation.missingLabel}`);
      return;
    }

    try {
      const sanitizedPayload = sanitizeNewHirePayload(formDataRef.current, tabs);
      const res = await createNewHire({
        payload: sanitizedPayload,
        form: configData?.form,
        submit: 1,
      });

      const hireName = res?.data?.name || "New Recruit";
      toast.success(`New recruit ${hireName} created in Pending status. Activate it from New Hires.`);
      navigate(redirectRoute, {
        state: {
          recruit: res?.data,
          formData: formDataRef.current,
        },
      });
    } catch (err) {
      const msg = errorResponseFormater(err, "Failed to create new recruit.");
      toast.error(msg);
    }
  };

  // Header & back control (Desktop)
  const headerContent = (
    <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4 bg-white px-4 py-3 rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/webapp/employees-directory")}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Employee Directory"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Typography variant="h3" color="title">
              New Recruit
            </Typography>
            {configData?.form && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-primary-50 text-primary border border-primary-200">
                {configData.form}
              </span>
            )}
          </div>
          <Typography variant="bodySmall" color="secondary">
            Fill out the new hire's details and submit. The employee is created in Pending status and activated later from New Hires.
          </Typography>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="contain"
          size="md"
          onClick={() => handleSave()}
          loading={isSubmitting}
        >
          SUBMIT
        </Button>
      </div>
    </div>
  );

  // Content rendering based on API state
  const renderContent = () => {
    // 1. Loading State
    if (isLoading) {
      return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6 flex gap-3 border-b border-gray-200 pb-4">
            <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
          <ProfileSkeleton tabs={3} cardsPerSection={4} />
        </div>
      );
    }

    // 2. Error State Screen
    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center my-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-600 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <Typography variant="h3" color="title" className="mb-2 font-bold">
            Failed to Load Form Configuration
          </Typography>
          <Typography variant="body" color="secondary" className="max-w-md mb-6">
            {error instanceof Error ? error.message : "Unable to fetch the New Hire intake form configuration. Please ensure a New Hire Form is configured."}
          </Typography>
          <div className="flex items-center gap-3">
            <Button
              variant="contain"
              size="md"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => refetch()}
            >
              Try Again
            </Button>
            <Button
              variant="subtle"
              size="md"
              onClick={() => navigate("/webapp/employees-directory")}
            >
              Back to Directory
            </Button>
          </div>
        </div>
      );
    }

    // 3. Empty State
    if (!tabs.length) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <NoDataFound
            title="No Form Configuration Found"
            subtitle="No fields or tabs configured for the New Hire Form. Please configure the form in Admin."
            onClick={() => navigate("/webapp/employees-directory")}
          />
        </div>
      );
    }

    // 4. Success State: Formio Form with Tabs
    return (
      <div className="space-y-6">
        {/* Tab Switcher */}
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide bg-white rounded-xl p-1 shadow-sm">
          {tabs.map((tab, idx) => {
            const isActive = activeTabIndex === idx;
            return (
              <button
                key={tab.tab}
                onClick={() => setActiveTabIndex(idx)}
                className={`flex-1 min-w-[140px] px-4 py-3 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-primary-50 text-primary border-b-2 border-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="truncate">{tab.tab}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Formio Form */}
        <div className="bg-transparent">
          {activeTabSchema && (
            <Form
              key={`tab-form-${activeTabIndex}`}
              form={activeTabSchema}
              submission={formSubmission}
              onChange={handleChange}
              onFormReady={(instance: any) => {
                formInstancesRef.current[activeTabIndex] = instance;
              }}
              formReady={(instance: any) => {
                formInstancesRef.current[activeTabIndex] = instance;
              }}
              options={{
                noAlerts: true,
                validateOnInit: false,
                validateOnBlur: true,
                validateOnChange: false,
                submitButton: false,
                rowClass: "flex flex-col space-y-4",
                labelClass: "mb-1.5 text-sm font-semibold text-gray-700",
                inputClass:
                  "w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all px-3 py-2 text-sm",
              }}
            />
          )}
        </div>

        {/* Navigation & Action Footer */}
        <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Top Row: Step Navigation */}
          <div className="flex items-center justify-between gap-3 w-full">
            {activeTabIndex > 0 ? (
              <Button
                variant="subtle"
                size="md"
                icon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => {
                  setActiveTabIndex((prev) => prev - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Previous Step
              </Button>
            ) : (
              <div />
            )}

            {activeTabIndex < tabs.length - 1 && (
              <Button
                variant="contain"
                size="md"
                onClick={handleNext}
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Bottom Row: Action Buttons on Same Row */}
          <div className="border-t border-gray-100 pt-3 flex flex-row items-center justify-end gap-3 w-full">
            <Button
              variant="contain"
              size="md"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => handleSave()}
              loading={isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              SUBMIT
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title="New Recruit">
        <div className="max-w-5xl mx-auto w-full p-6">
          {headerContent}
          {renderContent()}
        </div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <HeaderBar
        title="New Recruit"
        showBackButton={true}
        onBack={() => navigate("/webapp/employees-directory")}
      />
      <main className="flex-grow p-4 max-w-2xl mx-auto w-full">
        {configData?.form && (
          <div className="mb-4 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-lg border border-gray-200 shadow-xs">
            <Typography variant="bodySmall" color="secondary">
              Intake Form
            </Typography>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary-50 text-primary border border-primary-200">
              {configData.form}
            </span>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  );
};

export default AddEmployee;
