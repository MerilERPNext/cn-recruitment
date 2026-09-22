import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Save,
  Mail,
  Building2,
  Briefcase,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import DesktopLayoutWrapper from "../../DesktopLayoutWrapper";
import HeaderBar from "../../HeaderBar";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import ProfileSkeleton from "../../shared/molecules/Skeletons/ProfileSkeleton";
import NoDataFound from "../../shared/atoms/NoDataFound";
import {
  useInitiationFields,
  useSaveInitiationFieldsMutation,
  useOnboardingInitiationConfig,
  useInitiateOnboardingMutation,
} from "../../../hooks/useNewHire";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import type {
  InitiationFieldRow,
  SaveInitiationFieldsParams,
} from "../../../types/newHire";

const FORM_NAME = "NH Test - All Companies";

const InitiateOnboarding: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams<{ id?: string }>();

  const stateData = (location.state as Record<string, unknown>) || {};
  const employeeId = routeId || (stateData?.employeeId as string) || "";
  const recruit = (stateData?.recruit as Record<string, unknown>) || {};
  const stateFormData = (stateData?.formData as Record<string, unknown>) || {};

  // Fetch initiation fields configuration for the form
  const {
    data: initiationResponse,
    isLoading: isLoadingFields,
    isError: isFieldsError,
    error: fieldsError,
    refetch: refetchFields,
  } = useInitiationFields(FORM_NAME);

  // Fetch prefilled onboarding initiation config for the employee (if employeeId exists)
  const {
    data: employeeConfigResponse,
    isLoading: isLoadingEmp,
    isError: isEmpError,
    error: empError,
    refetch: refetchEmp,
  } = useOnboardingInitiationConfig(employeeId || undefined);

  // Mutations
  const { mutateAsync: saveInitiationFields, isPending: isSavingFields } =
    useSaveInitiationFieldsMutation();
  const { mutateAsync: initiateOnboarding, isPending: isInitiating } =
    useInitiateOnboardingMutation();

  const isSubmitting = isSavingFields || isInitiating;

  // Local state for initiation settings & fields
  const [fieldsList, setFieldsList] = useState<InitiationFieldRow[]>([]);
  const [sendPortalInvite, setSendPortalInvite] = useState<boolean>(true);
  const [portalForm, setPortalForm] = useState<string>("");
  const [inviteTemplate, setInviteTemplate] = useState<string>("");
  const [newFieldName, setNewFieldName] = useState<string>("");

  // Local state for candidate payload values
  const [candidatePayload, setCandidatePayload] = useState<Record<string, unknown>>({});

  // Sync state when initiationResponse loads
  useEffect(() => {
    if (initiationResponse?.data) {
      const data = initiationResponse.data;
      setSendPortalInvite(Boolean(data.send_portal_invite));
      setPortalForm(data.onboarding_portal_form || "");
      setInviteTemplate(data.portal_invite_template || "");

      if (data.initiation_fields && data.initiation_fields.length > 0) {
        setFieldsList(data.initiation_fields);
      } else if (data.effective_fields && data.effective_fields.length > 0) {
        setFieldsList(
          data.effective_fields.map((f, idx) => ({
            fieldname: f,
            order: idx + 1,
            mandatory_override: "Default",
            read_only_override: "Default",
          }))
        );
      }
    }
  }, [initiationResponse]);

  // Sync candidate payload when employeeConfigResponse loads
  useEffect(() => {
    if (employeeConfigResponse?.data?.tabs) {
      const initial: Record<string, unknown> = {};
      employeeConfigResponse.data.tabs.forEach((tab) => {
        tab.sections.forEach((sec) => {
          sec.fields.forEach((f) => {
            if (f.value !== undefined && f.value !== null && f.value !== "") {
              initial[f.fieldname] = f.value;
            }
          });
        });
      });
      setCandidatePayload((prev) => ({ ...initial, ...prev }));
    }
  }, [employeeConfigResponse]);

  // Derived employee details
  const empData = employeeConfigResponse?.data;
  const employeeName =
    empData?.employee_name ||
    (stateFormData.first_name as string) ||
    (recruit.first_name as string) ||
    (recruit.employee_name as string) ||
    (stateFormData.employee_name as string) ||
    (employeeId ? `Employee ${employeeId}` : "New Recruit");

  const employeeEmail =
    empData?.email ||
    (stateFormData.personal_email as string) ||
    (stateFormData.company_email as string) ||
    (recruit.personal_email as string) ||
    (recruit.company_email as string) ||
    "-";

  const department =
    (stateFormData.department_title as string) ||
    (stateFormData.department as string) ||
    (recruit.department as string) ||
    "-";

  const designation =
    (stateFormData.designation_title as string) ||
    (stateFormData.designation as string) ||
    (recruit.designation as string) ||
    "-";

  // Handle Save Initiation Fields Configuration
  const handleSaveFormConfig = async () => {
    try {
      const params: SaveInitiationFieldsParams = {
        form: FORM_NAME,
        fields: fieldsList.map((row, idx) => ({
          fieldname: row.fieldname,
          label_override: row.label_override || null,
          mandatory_override: row.mandatory_override || "Default",
          read_only_override: row.read_only_override || "Default",
          section_override: row.section_override || null,
          order: idx + 1,
          default_value: row.default_value || null,
        })),
        settings: {
          send_portal_invite: sendPortalInvite ? 1 : 0,
          onboarding_portal_form: portalForm || undefined,
          portal_invite_template: inviteTemplate || undefined,
        },
      };

      await saveInitiationFields(params);
      toast.success("Initiation form configuration saved successfully!");
    } catch (err) {
      const msg = errorResponseFormater(err, "Failed to save initiation fields.");
      toast.error(msg);
    }
  };

  // Handle Initiate Onboarding for Employee
  const handleInitiateOnboarding = async () => {
    if (!employeeId) {
      // Save configuration first if no employee ID
      await handleSaveFormConfig();
      navigate("/webapp/employees-directory");
      return;
    }

    try {
      // 1. Save initiation fields
      const saveParams: SaveInitiationFieldsParams = {
        form: FORM_NAME,
        fields: fieldsList.map((row, idx) => ({
          fieldname: row.fieldname,
          label_override: row.label_override || null,
          mandatory_override: row.mandatory_override || "Default",
          read_only_override: row.read_only_override || "Default",
          section_override: row.section_override || null,
          order: idx + 1,
          default_value: row.default_value || null,
        })),
        settings: {
          send_portal_invite: sendPortalInvite ? 1 : 0,
          onboarding_portal_form: portalForm || undefined,
          portal_invite_template: inviteTemplate || undefined,
        },
      };
      await saveInitiationFields(saveParams);

      // 2. Call initiate_onboarding
      const res = await initiateOnboarding({
        name: employeeId,
        payload: candidatePayload,
      });

      const onboardingId = res?.data?.employee_onboarding || "";
      toast.success(
        `Onboarding initiated successfully for ${employeeName}${onboardingId ? ` (${onboardingId})` : ""}!`
      );
      navigate("/webapp/employees-directory");
    } catch (err) {
      const msg = errorResponseFormater(err, "Failed to initiate onboarding.");
      toast.error(msg);
    }
  };

  const handleAddField = () => {
    const trimmed = newFieldName.trim();
    if (!trimmed) return;
    if (fieldsList.some((f) => f.fieldname === trimmed)) {
      toast.error(`Field '${trimmed}' is already in the initiation list.`);
      return;
    }
    setFieldsList((prev) => [
      ...prev,
      {
        fieldname: trimmed,
        order: prev.length + 1,
        mandatory_override: "Default",
        read_only_override: "Default",
      },
    ]);
    setNewFieldName("");
  };

  const handleRemoveField = (index: number) => {
    setFieldsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    key: keyof InitiationFieldRow,
    value: unknown
  ) => {
    setFieldsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  // Loading state
  if (isLoadingFields || (employeeId && isLoadingEmp)) {
    return (
      <DesktopLayoutWrapper title="Initiate Onboarding">
        <div className="max-w-5xl mx-auto w-full p-6">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <ProfileSkeleton tabs={2} cardsPerSection={3} />
          </div>
        </div>
      </DesktopLayoutWrapper>
    );
  }

  // Error state
  if (isFieldsError || (employeeId && isEmpError)) {
    const currentError = fieldsError || empError;
    return (
      <DesktopLayoutWrapper title="Initiate Onboarding">
        <div className="max-w-5xl mx-auto w-full p-6">
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200 text-center my-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4 text-red-600 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <Typography variant="h3" color="title" className="mb-2 font-bold">
              Failed to Load Initiation Configuration
            </Typography>
            <Typography variant="body" color="secondary" className="max-w-md mb-6">
              {currentError instanceof Error
                ? currentError.message
                : "Unable to fetch the onboarding initiation form configuration."}
            </Typography>
            <div className="flex items-center gap-3">
              <Button
                variant="contain"
                size="md"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  refetchFields();
                  if (employeeId) refetchEmp();
                }}
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
        </div>
      </DesktopLayoutWrapper>
    );
  }

  const content = (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 bg-white px-5 py-4 rounded-xl shadow-xs">
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
                {employeeId
                  ? `Initiate Onboarding: ${employeeName}`
                  : "Onboarding Initiation Form"}
              </Typography>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Step 2: Onboarding Setup
              </span>
            </div>
            <Typography variant="bodySmall" color="secondary">
              Configure onboarding fields from {FORM_NAME} and initiate the employee journey.
            </Typography>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSaveFormConfig}
            loading={isSavingFields}
          >
            Save Form
          </Button>
          <Button
            variant="contain"
            size="md"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleInitiateOnboarding}
            loading={isSubmitting}
          >
            Initiate Onboarding
          </Button>
        </div>
      </div>

      {/* Employee Quick Info Card (if employee exists) */}
      {employeeId && (
        <div className="bg-gradient-to-r from-primary-50/60 via-white to-primary-50/40 border border-primary-100 p-5 rounded-xl shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {employeeName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Typography variant="h4" color="title" className="font-bold">
                    {employeeName}
                  </Typography>
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-primary-100 text-primary-800">
                    {employeeId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
                  {employeeEmail !== "-" && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {employeeEmail}
                    </span>
                  )}
                  {designation !== "-" && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      {designation}
                    </span>
                  )}
                  {department !== "-" && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {department}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Form Settings & Portal Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Sliders className="w-5 h-5 text-primary" />
          <Typography variant="h4" color="title" className="font-semibold">
            1. Initiation Settings ({FORM_NAME})
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Onboarding Portal Form
            </label>
            <input
              type="text"
              placeholder="e.g. Standard Portal Form"
              value={portalForm}
              onChange={(e) => setPortalForm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Portal Invite Email Template
            </label>
            <input
              type="text"
              placeholder="e.g. Candidate Portal Invitation"
              value={inviteTemplate}
              onChange={(e) => setInviteTemplate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700 font-medium">
            <input
              type="checkbox"
              checked={sendPortalInvite}
              onChange={(e) => setSendPortalInvite(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary-500"
            />
            <span>Send automated Portal Invite to candidate upon initiation</span>
          </label>
        </div>
      </div>

      {/* Section 2: Initiation Fields List & Configuration */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <Typography variant="h4" color="title" className="font-semibold">
              2. Configured Initiation Fields
            </Typography>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {fieldsList.length} field(s) configured
          </span>
        </div>

        {/* Add field input */}
        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <input
            type="text"
            placeholder="Enter fieldname (e.g. employee_onboarding_template, boarding_begins_on)..."
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddField();
              }
            }}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <Button
            variant="contain"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleAddField}
            disabled={!newFieldName.trim()}
          >
            Add Field
          </Button>
        </div>

        {/* Fields list table */}
        {fieldsList.length === 0 ? (
          <NoDataFound
            title="No Initiation Fields"
            subtitle="No fields currently configured for this form. Add a field above to start."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Fieldname
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Label Override
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Mandatory
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Read Only
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Default Value
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 w-16">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {fieldsList.map((row, idx) => (
                  <tr key={`${row.fieldname}-${idx}`} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {row.fieldname}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Optional label"
                        value={row.label_override || ""}
                        onChange={(e) =>
                          handleFieldChange(idx, "label_override", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.mandatory_override || "Default"}
                        onChange={(e) =>
                          handleFieldChange(idx, "mandatory_override", e.target.value)
                        }
                        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="Default">Default</option>
                        <option value="Required">Required</option>
                        <option value="Optional">Optional</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.read_only_override || "Default"}
                        onChange={(e) =>
                          handleFieldChange(idx, "read_only_override", e.target.value)
                        }
                        className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="Default">Default</option>
                        <option value="Read Only">Read Only</option>
                        <option value="Editable">Editable</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Default value"
                        value={row.default_value || ""}
                        onChange={(e) =>
                          handleFieldChange(idx, "default_value", e.target.value)
                        }
                        className="w-full border border-gray-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveField(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-xs">
        <Button
          variant="subtle"
          size="md"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/webapp/employees-directory")}
        >
          Back to Directory
        </Button>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="md"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSaveFormConfig}
            loading={isSavingFields}
          >
            Save Form
          </Button>
          <Button
            variant="contain"
            size="md"
            icon={<CheckCircle2 className="w-4 h-4" />}
            onClick={handleInitiateOnboarding}
            loading={isSubmitting}
          >
            Initiate Onboarding
          </Button>
        </div>
      </div>
    </div>
  );

  const pageTitle = employeeId
    ? `Initiate Onboarding: ${employeeName}`
    : "Initiate Onboarding";

  if (isDesktop) {
    return (
      <DesktopLayoutWrapper title={pageTitle}>
        <div className="max-w-5xl mx-auto w-full p-6">{content}</div>
      </DesktopLayoutWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <HeaderBar
        title={pageTitle}
        showBackButton={true}
        onBack={() => navigate("/webapp/employees-directory")}
      />
      <main className="flex-grow p-4 max-w-2xl mx-auto w-full">{content}</main>
    </div>
  );
};

export default InitiateOnboarding;
