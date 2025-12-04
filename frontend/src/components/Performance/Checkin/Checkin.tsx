import React, { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HeaderBar from "../../HeaderBar";
import { useCheckin, useGetCheckinCommentConfig, useGoalDetails } from "../../../hooks/useGoal";
import { Form } from "@tsed/react-formio";
import defaultFormSchema from "./CheckinFormSchema.json";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../../utils/errorResponseFormater";

const normalizeStatus = (s?: string) =>
  (s || "").toLowerCase().trim().replace(/\s+/g, "_");

// Types for form submission data structures
type SubgoalRow = {
  title: string;
  weightage: number;
  achievement: number;
  status: string;
  comment: string;
};

type GoalRow = {
  name: string;
  weightage: number;
  achievement: number;
  status: string;
  comment: string;
  subgoals?: {
    subgoalRow: SubgoalRow;
  }[];
};

type GoalItem = {
  goalRow: GoalRow;
};

type FormioSubmission = {
  data: {
    goals: GoalItem[];
    overall_comment?: string;
  };
};

// Types for API submission data structures
type APIItem = {
  name: string;
  achievement: number;
  status: string;
  comment: string;
};

type APISubmission = {
  goal_plan: string;
  goals: APIItem[];
  sub_goals: APIItem[];
  overall_comment?: string;
};

// Main Checkin component
const Checkin: React.FC = () => {
  const { goalPlanId } = useParams();
  const navigate = useNavigate();

  const { data: goalPlan, isLoading: goalLoading } = useGoalDetails(goalPlanId || "");
  const { data: CheckinCommentsConfig } = useGetCheckinCommentConfig(goalPlanId || "");

  const commentConfig = CheckinCommentsConfig ?? {
    enable_comments: false,
    goal_comments: false,
    goal_comments_mandatory: false,
    sub_goal_comments: false,
    sub_goal_comments_mandatory: false,
    overall_comments: false,
    overall_comments_mandatory: false
  };

  const formData = {
    goals: (goalPlan?.goal_plan_items || []).map((goal: any) => ({
      goalRow: {
        name: goal.goal ?? "",
        weightage: goal.weightage ?? null,
        achievement: goal.achievement ?? null,
        status: normalizeStatus(goal.status),
        comment: "",
        subgoals: (goal.subgoals || []).map((sub: any) => ({
          subgoalRow: {
            title: sub.title ?? "",
            weightage: sub.weightage ?? null,
            achievement: sub.achievement ?? null,
            status: normalizeStatus(sub.status),
            comment: ""
          }
        }))
      }
    }))
  };

  // console.log("formdata", formData);

  const formRef = useRef<any>(null);

  const handleFormReady = (instance: any) => {
    formRef.current = instance;
  }

  const { mutate: Checkin } = useCheckin();

  const handleSubmit = async () => {
    if (!formRef.current) {
      console.warn("Form not ready.");
      return;
    }

    try {
      const submission: FormioSubmission = await formRef.current.submit();

      const result: APISubmission = {
        goal_plan: goalPlanId || "",
        goals: [],
        sub_goals: [],
        overall_comment: submission.data.overall_comment || ""
      };

      submission?.data?.goals?.forEach((goalItem: GoalItem) => {
        const g = goalItem.goalRow;

        result.goals.push({
          name: g.name,
          achievement: g.achievement,
          status: g.status,
          comment: g.comment
        });

        if (Array.isArray(g.subgoals) && g.subgoals.length > 0) {
          const first = g.subgoals[0];
          const isEmptyObject = (o: any) =>
            o && typeof o === "object" && Object.keys(o).length === 0;

          const onlyEmpty =
            g.subgoals.length === 1 &&
            (
              // element itself is {}
              isEmptyObject(first) ||
              // element is { subgoalRow: {} }
              (first && isEmptyObject(first.subgoalRow)) ||
              // element is missing subgoalRow (e.g. {})
              first && first.subgoalRow === undefined
            );

          if (!onlyEmpty) {
            g.subgoals.forEach((sub: any) => {
              const sg = sub.subgoalRow || sub;
              if (!sg || isEmptyObject(sg)) return;
              result.sub_goals.push({
                name: sg.title,
                achievement: sg.achievement,
                status: sg.status,
                comment: sg.comment
              });
            });
          }
        }
        console.log("Prepared submission data:", result);
      });


      console.log("resut", result)
      Checkin(result, {
        onSuccess: () => {
          toast.success("Checkin submitted successfully.");
          navigate(-1);
        },
        onError: (error) => {
          toast.error(errorResponseFormater(error, "Checkin submission failed. Please try again."));
          console.error("Checkin submission error:", error);
        }
      });

    } catch (err) {
      console.error("Submit error:", err);
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      <HeaderBar titleTag={<span>Checkin For Gola Plan : <span className="font-bold">{goalPlanId}</span> </span>} onBack={() => navigate(-1)} />

      {goalLoading ? <Skeleton /> :
        <div className="px-8 py-4 max-w-2xl mx-auto shadow-xl border border-blue-200 rounded-lg">
          <Form
            key={JSON.stringify(commentConfig)}
            form={defaultFormSchema}
            submission={{ data: formData }}
            options={{
              commentConfig: commentConfig
            }}
            onFormReady={handleFormReady}
          />

          <div className="flex gap-4 sticky left-0 bottom-0 pb-4 w-full bg-white mt-6">
            <button
              onClick={() => navigate(-1)}
              className="w-full rounded-lg bg-gray-200 hover:bg-gray-300 px-4 py-3 font-semibold"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-3 font-semibold text-white"
            >
              Checkin
            </button>
          </div>
        </div>
      }
    </div>
  );
};

export default Checkin;

const Skeleton = () => {

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-pulse">

      <div className="flex justify-center mb-8">
        <div className="h-6 w-32 bg-gray-300 rounded" />
      </div>

      <div className="h-5 w-16 bg-gray-200 rounded mb-4" />

      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 shadow-sm">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((col) => (
              <div key={col} className="flex flex-col gap-2">
                <div className="h-3 w-16 bg-gray-200 rounded" />
                <div className="h-10 w-full bg-gray-100 rounded border border-gray-100" />
              </div>
            ))}
          </div>

          <div className="mb-6">
            <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-24 w-full bg-gray-100 rounded border border-gray-100" />
          </div>

          <div className="pl-0 sm:pl-4">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
              {[1, 2].map((j) => (
                <div key={j} className={`flex flex-col ${j !== 1 ? 'mt-6 pt-6 border-t border-gray-200' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {[1, 2, 3, 4].map((subCol) => (
                      <div key={subCol} className="flex flex-col gap-2">

                        <div className="h-3 w-14 bg-gray-300 rounded" />
                        <div className="h-9 w-full bg-gray-200 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="h-12 w-full bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex justify-center items-center gap-4 z-10">
        <div className="h-10 w-32 bg-gray-200 rounded-md" />
        <div className="h-10 w-32 bg-blue-100 rounded-md" />
      </div>

      {/* Spacer for fixed footer */}
      <div className="h-20" />
    </div>
  );
};