import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { useCurrentEmployeeIdCard } from "../../../hooks/useEmployee";
import toast from "react-hot-toast";
import { CustomError } from "../../../types/attendance";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import createGoalFormSchema from "./createGoalFormSchema.json";
import { useAddGoalRequest, useUpdateGoalRequest } from "../../../hooks/useGoal";
import { GroupGoalItem } from "../../../types/goal";
import { useGoalModel } from "../GoalModelContext";
import { useScreenSize } from "../../../hooks/useScreenSize";
import HeaderBar from "../../HeaderBar";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

type ActionType = "Save" | "Update";
interface CreateGoalDialogProps {
  defaultData?: GroupGoalItem; 
  isOpen?: boolean;
  onClose: () => void;
  actionType?: ActionType;
}

export default function CreateGoalDialog({
  defaultData,
  isOpen = false,
  onClose,
  actionType = "Save"
}: CreateGoalDialogProps) {
  console.log("defualtData", defaultData)
  const { selectedGoalPlanId } =  useGoalModel();
  const { setRefetchAttendance } = useGlobalStore();
  const { data: currentEmployeeIdCard } = useCurrentEmployeeIdCard();
  const formRef = useRef<any>(null);
  const { isDesktop } = useScreenSize();


  const isFormReady = useRef(false);

  const { mutate: addGoalRequest } = useAddGoalRequest();
  const { mutate: updateGoalRequest } = useUpdateGoalRequest();

  function toTitleCase(str: string | undefined) {
    if (!str) return "";
    return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Map incoming defaultData -> Formio form field structure
  function mapDefaultDataToFormSubmission(defaultData: any) {
    if (!defaultData) return { data: {} };

    const mappedMain = {
      title: defaultData.title ?? defaultData.goal ?? "",
      description:
        defaultData.description ?? defaultData.desc ?? defaultData.note ?? "",
      startDate: defaultData.start_date ?? defaultData.startDate ?? "",
      endDate: defaultData.end_date ?? defaultData.endDate ?? "",
      weightage:
        defaultData.weightage ?? defaultData.weight ?? defaultData.weightage ?? 0,
      achievement:
        defaultData.achievement ?? defaultData.achieved ?? defaultData.achievement ?? 0,
      status:
        (defaultData.status &&
          String(defaultData.status).toLowerCase().replace(/\s+/g, "_")) ??
        "",
      // optional scorecard pillar mapping (if your defaultData has the field)
      scorecardPillar: defaultData.scorecard_pillar ?? defaultData.scorecardPillar ?? "",
    };

    const mappedSubs =
      (Array.isArray(defaultData.subgoals) ? defaultData.subgoals : defaultData.subGoals) 
        ?.map((sg: any) => {
          const title = sg.title ?? sg.name ?? sg.subgoal_title ?? sg.subGoalTitle ?? "";
          const description =
            sg.description ?? sg.desc ?? sg.subGoalDesc ?? sg.sub_goal_desc ?? "";
          const start_date = sg.start_date ?? sg.startDate ?? sg.subStartDate ?? "";
          const end_date = sg.end_date ?? sg.endDate ?? sg.subEndDate ?? "";
          const weightage = sg.weightage ?? sg.subWeightage ?? 0;
          const achievement = sg.achievement ?? sg.subAchievement ?? sg.achieved ?? 0;
          const status =
            (sg.status && String(sg.status).toLowerCase().replace(/\s+/g, "_")) ?? "";

          const target = sg.target ?? "";
          const metric = sg.metric ?? "";
          const subTargetType = sg.target_type ?? sg.subTargetType ?? "";

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
            subTargetType,
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
      goal: "G1",
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
      (sg: any, index: number) => ({
        goal: `S${index + 1}`,
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
        target_type: sg.subTargetType,
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



  const handleSave = async()=>{
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
        onSuccess: () => {
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
        achievement: sg.subAchievement,
        status: toTitleCase(sg.subStatus),
        is_group: 0,
      })),
    };

    const payload = {
      goal_plan_name: selectedGoalPlanId,
      updated_items: [updatedMainItem],
    };

      console.log("UPDATE PAYLOAD:", payload);
 
    updateGoalRequest(payload as Record<string, unknown>, {
      onSuccess: () => {
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
    if(actionType === "Save"){
      handleSave();
    }else if(actionType === "Update"){
      handleUpdate();
    }
  };

  // Make title field readonly when editing
const modifiedSchema = React.useMemo(() => {
  if (!defaultData) return createGoalFormSchema;

  const cloned = JSON.parse(JSON.stringify(createGoalFormSchema));

  const stack = [...cloned.components];
  while (stack.length) {
    const comp = stack.pop();
    if (!comp) continue;

    if (comp.key === "title") {
      comp.disabled = true;   
      comp.readOnly = true;    
    }

    if (comp.components) stack.push(...comp.components);
  }

  return cloned;
}, [defaultData]);

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
           {actionType==="Save"? "Create New Goal" : "Edit Goal"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>:
        <HeaderBar
          title={actionType==="Save"? "Create New Goal" : "Edit Goal"}
          showBackButton={true}
          onBack={onClose}
        />
    }
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <Form
            form={modifiedSchema}
            options={{ submitButton: false }}
            onFormReady={handleFormReady}
          />
        </div>

        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-lg bg-blue-700 text-white font-medium hover:bg-blue-800 transition-colors"
            aria-label={`${actionType} goal`}
          >
            {actionType}
          </button>
        </div>
      </div>
    </div>
  );
}
