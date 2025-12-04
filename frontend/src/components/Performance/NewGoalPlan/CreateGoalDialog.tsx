import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeIdCard } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import createGoalFormSchema from "./createGoalFormSchema.json";
import { useAddGoalRequest, useGetGoalAndSubgoalFieldConfigs, useGetGoalPlanFrameworkSettings, useUpdateGoalRequest } from "../../../hooks/useGoal";
import { GroupGoalItem } from "../../../types/goal";
import { useGoalModel } from "../GoalModelContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";
import { applyFieldConfigs } from "./formConvertUtil";

type ActionType = "Save" | "Update" | "View";
interface CreateGoalDialogProps {
  defaultData?: GroupGoalItem;
  isOpen?: boolean;
  onClose: () => void;
  actionType?: ActionType;
  goalPlanName?: string | null;
}

export default function CreateGoalDialog({
  defaultData,
  isOpen = false,
  onClose,
  actionType = "Save",
  goalPlanName
}: CreateGoalDialogProps) {
  console.log("defualtData", defaultData);
  const { selectedGoalPlanId } = useGoalModel();
  const { setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployeeIdCard } = useCurrentEmployeeIdCard();
  const formRef = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const { data: goalPlanFrameworkSettings } = useGetGoalPlanFrameworkSettings(goalPlanName || selectedGoalPlanId || "");
  //  console.log("goalPlanFrameworkSettings", goalPlanFrameworkSettings);


  // console.log("goalplananme",goalPlanName);
  const isFormReady = useRef(false);

  const { mutate: addGoalRequest } = useAddGoalRequest();
  const { mutate: updateGoalRequest } = useUpdateGoalRequest();

  const { data: goalAndSubgoalFieldConfigs } = useGetGoalAndSubgoalFieldConfigs(goalPlanName || selectedGoalPlanId || "");

  function toTitleCase(str: string | undefined) {
    if (!str) return "";
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function toSnackCase(str: string | undefined): string {
    if (!str) return "";
    return (
      str
        // handle camelCase or PascalCase boundaries
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        // replace spaces, hyphens and multiple separators with underscore
        .replace(/[\s\-]+/g, "_")
        // remove any non-word characters except underscore
        .replace(/[^\w_]+/g, "")
        // collapse multiple underscores
        .replace(/_+/g, "_")
        // trim leading/trailing underscores
        .replace(/^_+|_+$/g, "")
        .toLowerCase()
    );
  }

  const targetTypeToSubmissionFormate = (tt: string) => ["Is Equal To", "Is Less than or equal to", "Is More than or equal to"].find(t => toSnackCase(t) === tt);

  // Map incoming defaultData -> Formio form field structure
  function mapDefaultDataToFormSubmission(defaultData: any) {
    if (!defaultData) return { data: {} };

    const mappedMain = {
      title: defaultData.goal ?? "",
      description: defaultData.description,
      startDate: defaultData.start_date,
      endDate: defaultData.end_date,
      weightage: defaultData.weightage ?? 0,
      achievement: defaultData.achievement ?? 0,
      status: toSnackCase(defaultData.status ?? ""),
      scorecardPillar: defaultData.score ?? "",
    };

    const mappedSubs =
      defaultData.subgoals
        ?.map((sg: any) => {
          const title = sg.goal ?? sg.name ?? "";
          const description = sg.description ?? "";
          const start_date = sg.start_date ?? "";
          const end_date = sg.end_date ?? "";
          const weightage = sg.weightage ?? 0;
          const achievement = sg.achievement ?? 0;
          const status = toSnackCase(sg.status ?? "");
          const target = sg.target ?? "";
          const metric = sg.metric ?? "";
          const target_type = toSnackCase(sg.target_type ?? "");

          return {
            subGoalTitle: title,
            subGoalDesc: description,
            subStartDate: start_date,
            subEndDate: end_date,
            subWeightage: weightage,
            subAchievement: achievement,
            subAchieved: achievement,
            target,
            metric,
            target_type,
            subStatus: status,
          };
        }) || [];

    return {
      data: {
        ...mappedMain,
        subGoals: mappedSubs,
      },
    };
  }

  // Map form submission to API payload 
  function mapGoalSubmission(formData: any) {
    const mainGoal = {
      title: formData.title,
      description: formData.description,
      is_group: 1,
      start_date: formData.startDate?.split?.("T")[0] ?? formData.startDate ?? "",
      end_date: formData.endDate?.split?.("T")[0] ?? formData.endDate ?? "",
      weightage: formData.weightage,
      achievement: formData.achievement,
      status: toTitleCase(formData.status),
      scorecard_pillar: formData.scorecardPillar,
    };

    const subGoals = (formData.subGoals || []).map(
      (sg: any) => ({
        title: sg.subGoalTitle,
        description: sg.subGoalDesc,
        is_group: 0,
        start_date: sg.subStartDate?.split?.("T")[0] ?? sg.subStartDate ?? "",
        end_date: sg.subEndDate?.split?.("T")[0] ?? sg.subEndDate ?? "",
        weightage: sg.subWeightage,
        achievement: sg.subAchievement,
        status: toTitleCase(sg.subStatus),
        target: sg.target,
        metric: sg.metric,
        target_type: targetTypeToSubmissionFormate(sg.subTargetType),
        achieved: sg.subAchieved,
      })
    );

    return [mainGoal, ...subGoals];
  }

  // Ensure we set form instance when form is ready
  function handleFormReady(instance: any) {
    if (!instance) return;
    formRef.current = instance;
    isFormReady.current = true;

    if (isOpen && defaultData) {
      try {
        const submission = mapDefaultDataToFormSubmission(defaultData);
        instance.setSubmission(submission);
      } catch (err) {
        console.error("Error calling setSubmission in onFormReady:", err);
      }
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!isFormReady.current) {
      // eslint-disable-next-line no-console
      console.log("Form not ready yet; waiting to set submission");
      return;
    }

    const instance = formRef.current;
    if (!instance) return;

    if (defaultData) {
      const submission = mapDefaultDataToFormSubmission(defaultData);

      try {
        instance.setSubmission(submission);
      } catch (err) {
        console.error("Error calling setSubmission:", err);
      }
    }
  }, [defaultData, isOpen]);



  const handleSave = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data ?? {};

      const payload = {
        employee: currentEmployeeIdCard?.id,
        goal_plan: selectedGoalPlanId,
        goal_data: {
          goal_plan_item: mapGoalSubmission(formData),
        },
      };

      addGoalRequest(payload as Record<string, unknown>, {
        onSuccess: (data: any) => {
          if (data?.status && data.status === "error") {
            toast.error(data?.message);
            return;
          }
          onClose();
          // keep existing behavior: refetch attendance after a short delay
          setTimeout(() => setRefetchAttendance(true), 2000);
          toast.success("Goal saved successfully!");
        },
        onError: (error: any) => {
          const formatedError = errorResponseFormater(error, "Failed to save goal.");
          toast.error(formatedError);
        },
      });
    } catch (err) {
      console.error("Error while submitting formRef:", err);
    }
  }

  const handleUpdate = async () => {
    try {
      const submission = await formRef.current?.submit();
      const formData = submission?.data ?? {};

      console.log("formData", formData)

      // ---- map main goal ----
      const updatedMainItem = {
        goal: formData.title,
        description: formData.description,
        weightage: formData.weightage,
        start_date: formData.startDate?.split?.("T")[0] ?? formData.startDate ?? "",
        end_date: formData.endDate?.split?.("T")[0] ?? formData.endDate ?? "",
        achievement: formData.achievement,
        status: toTitleCase(formData.status),
        is_group: 1,

        // ---- map subgoals ----
        subgoals: (formData.subGoals || []).map((sg: any) => ({
          name: sg.subGoalTitle,
          description: sg.subGoalDesc,
          weightage: sg.subWeightage,
          start_date: sg.subStartDate?.split?.("T")[0] ?? sg.subStartDate ?? "",
          end_date: sg.subEndDate?.split?.("T")[0] ?? sg.subEndDate ?? "",
          achieved: sg.subAchieved,
          achievement: sg.subAchievement,
          status: toTitleCase(sg.subStatus),
          target_type: targetTypeToSubmissionFormate(sg.target_type),
          target: sg.target,
          metric: sg.metric,
          is_group: 0,
        })),
      };

      const payload = {
        goal_plan_name: goalPlanName || selectedGoalPlanId,
        updated_items: [updatedMainItem],
      };

      console.log("UPDATE PAYLOAD:", payload);

      updateGoalRequest(payload as Record<string, unknown>, {
        onSuccess: (data: any) => {
          if (data?.status && data.status === "error") {
            toast.error(data?.message);
            return;
          }
          console.log("data", data);
          onClose();
          setTimeout(() => setRefetchAttendance(true), 2000);
          toast.success("Goal updated successfully!");
        },
        onError: (error: CustomError) => {
          const formatedError = errorResponseFormater(error, "Failed to save goal.");
          toast.error(formatedError);
        },
      });
    } catch (err) {
      console.error("Update form error:", err);
    }
  };

  const handleSubmit = async () => {
    if (actionType === "Save") {
      handleSave();
    } else if (actionType === "Update") {
      handleUpdate();
    }
  };

  // Make title field readonly when editing
  const modifiedSchema = React.useMemo(() => {
    if (!goalAndSubgoalFieldConfigs) return createGoalFormSchema;

    let modified = JSON.parse(JSON.stringify(createGoalFormSchema));

    if (actionType === "Update") {
      // applyFieldConfigs now defensive — it returns the modified schema (or original if not applicable)
      modified = applyFieldConfigs(
        modified,
        // pass the API wrapper if it contains message OR just the arrays
        goalAndSubgoalFieldConfigs?.goal_attributes,
        goalAndSubgoalFieldConfigs?.sub_goal_attributes
      );
    }

    // If defaultData exists, set the title to readonly on the modified schema
    if (!defaultData) return modified;

    // traverse modified.components to make title readonly
    const stack = [...(modified.components ?? [])];
    while (stack.length) {
      const comp = stack.pop();
      if (!comp) continue;
      if (comp.key === "title") {
        comp.disabled = true;
        comp.readOnly = true;
      }
      if (comp.components) stack.push(...comp.components);
      if (comp.columns) comp.columns.forEach((c: any) => stack.push(...(c.components ?? [])));
      if (comp.rows) comp.rows.forEach((row: any[]) => row.forEach((cell: any) => stack.push(...(cell.components ?? []))));
      // Also handle editgrid sub-components if required — applyFieldConfigs already does sub-goal mappings
    }

    return modified;
  }, [defaultData, goalAndSubgoalFieldConfigs]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={() => onClose && onClose()}
    >
      <div
        className="w-full h-full lg:h-auto lg:max-h-[80vh] lg:max-w-xl  md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {isDesktop ?
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
            <h2 className="text-xl font-semibold text-gray-900">
              {actionType === "Save" ? "Create New Goal" : (actionType === "Update" ? "Edit Goal" : "View Goal")}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close dialog"
            >
              <X />
            </button>
          </div> :
          <HeaderBar
            title={actionType === "Save" ? "Create New Goal" : "Edit Goal"}
            showBackButton={true}
            onBack={onClose}
          />
        }
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <Form
            key={JSON.stringify(goalPlanFrameworkSettings)}
            form={modifiedSchema}
            options={{
              submitButton: false,
              goalPlanFrameworkSettings: goalPlanFrameworkSettings,
              readOnly: actionType === "View"
            }}

            onFormReady={handleFormReady}
          />
        </div>

        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
          >
            {actionType}
          </button>
        </div>
      </div>
    </div>
  );
}
