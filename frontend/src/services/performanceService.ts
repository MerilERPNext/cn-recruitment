import type {
  GoalFormConfig,
  GoalFormConfigResponse,
  GoalPlanId,
  GoalPlanItem,
  GoalPlanResponse,
  GoalsRequest,
  GoalSubmitResponse,
  GoalActionResponse,
  DeleteGoalsPayload,
  GroupGoalItem,
  Message,
  MyGoalsResponse,
  SaveGoalsPayload,
  SaveGoalsResponse,
  SubmitSelectedGoalsPayload,
  SubGoalItem,
  ReferenceGoalsResponse,
  ReferenceGoalsParams,
  GoalRepositoryResponse,
  CascadeGoalsParams,
  CascadeGoalsResponse,
  GoalDetailResponse,
  GoalCheckInsResponse,
  SubmitGoalCheckInPayload,
  SubmitGoalCheckInResponse,
  PerformanceOverviewResponse,
  RequestCheckInPayload,
  RequestCheckInResponse,
  MyPeerReviewsResponse,
  FeedbackFormResponse,
  SaveFeedbackPayload,
  SaveFeedbackResponse,
  SubmitFeedbackPayload,
  SubmitFeedbackResponse,
  AddGoalCommentPayload,
  AddGoalCommentResponse,
  TeamOverviewResponse,
  TeamMembersParams,
  TeamMembersResponse,
  TeamGoalsParams,
  TeamGoalsResponse,
  ApprovalQueueParams,
  ApprovalQueueResponse,
  GoalApprovalDetailParams,
  GoalApprovalDetailResponse,
  GoalActionPayload,
  GoalActionResultResponse,
} from "../types/goal";
import FrappeAPI from "../utils/frappeAPI";

export type GroupedGoalItem = GroupGoalItem & { subgroup: SubGoalItem[] };

const isGroupGoalItem = (item: GoalPlanItem): item is GroupGoalItem => item.is_group === 1;
const isSubGoalItem = (item: GoalPlanItem): item is SubGoalItem => item.is_group === 0;

const throwIfUnsuccessful = <T>(response: T): T => {
  const apiResponse = response as { success?: boolean; message?: string } | null;
  if (apiResponse?.success === false) {
    throw new Error(apiResponse.message || "The request could not be completed.");
  }
  return response;
};

export const getPerformanceErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const responseData = (error as {
    response?: { data?: { message?: unknown; exception?: unknown; _server_messages?: unknown } };
    message?: unknown;
  })?.response?.data;
  const message = responseData?.message;

  if (typeof message === "string" && message.trim()) return message;
  if (message && typeof message === "object") {
    const payload = message as {
      message?: unknown;
      error?: unknown;
      error_message?: unknown;
      data?: { errors?: string[] };
    };
    const mainMsg =
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "";
    const detailErrs =
      Array.isArray(payload.data?.errors) && payload.data.errors.length > 0
        ? payload.data.errors.join(", ")
        : "";

    if (mainMsg && detailErrs) return `${mainMsg} (${detailErrs})`;
    if (mainMsg) return mainMsg;

    for (const value of [payload.error_message, payload.error]) {
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  if (typeof responseData?.exception === "string" && responseData.exception.trim()) {
    return responseData.exception.split(":").slice(1).join(":").trim() || responseData.exception;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const performanceService = {
  getAllGoalPlans: async (employeeId: string): Promise<GoalPlanId[]> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_assigned_goal_plan",
      { employee_id: employeeId },
    );

    return response as GoalPlanId[];
  },

  getGoalFormConfig: async (): Promise<GoalFormConfig> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_goal_form_config",
    );

    return (response as GoalFormConfigResponse).data;
  },

  addGoals: async (body: Record<string, unknown>): Promise<unknown> =>
    throwIfUnsuccessful(await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.add_goals_in_goal_plan",
      body,
    )),

  updateGoals: async (body: Record<string, unknown>): Promise<unknown> =>
    throwIfUnsuccessful(await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.update_goal_plan_items",
      body,
    )),

  getGoalPlanDetails: async (goalId: string): Promise<GoalPlanResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.doctype.goal_plan.goal_plan.get_goal_details",
      { goal_name: goalId },
    );

    return response as GoalPlanResponse;
  },

  saveGoals: async (payload: SaveGoalsPayload): Promise<SaveGoalsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.save_goals",
      { payload },
    );

    return throwIfUnsuccessful(response as SaveGoalsResponse);
  },

  getMyGoals: async (params?: { employee?: string }): Promise<MyGoalsResponse> => {
    const queryParams = params?.employee ? { employee: params.employee } : undefined;
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_my_goals",
      queryParams
    );

    return response as MyGoalsResponse;
  },

  submitSelectedGoals: async (
    payload: SubmitSelectedGoalsPayload,
  ): Promise<GoalActionResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.submit_selected_goals",
      { payload },
    );

    return throwIfUnsuccessful(response as GoalActionResponse);
  },

  deleteGoals: async (payload: DeleteGoalsPayload): Promise<GoalActionResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.delete_goals",
      { payload },
    );

    return throwIfUnsuccessful(response as GoalActionResponse);
  },

  getMandotaryGoals: async (): Promise<Message> => {
    const response = await FrappeAPI.callMethod("cn_pms.cn_performance_management.api.goal_api.get_mandatory_goals")
    return response as Message
  },

  submitMandatoryGoals: async (payload: GoalsRequest): Promise<GoalSubmitResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.acknowledge_goals",
      { payload },
    );

    return throwIfUnsuccessful(response as GoalSubmitResponse);
  },
  employeeGoalCheckIn: async (payload: RequestCheckInPayload): Promise<RequestCheckInResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.request_check_in",
      { payload } as Record<string, unknown>,
    );

    return throwIfUnsuccessful(response as RequestCheckInResponse);
  },
  getDepartmentOptions: async (params: { search_text?: string; skip?: number; limit?: number; company?: string }): Promise<any> => {
    const response: any = await FrappeAPI.callMethod(
      "recruitment.api.job_requisition.get_link_field_options",
      {
        doctype: "Department",
        search_text: params.search_text || "",
        limit: params.limit || 20,
        skip: params.skip || 0,
        company: params.company,
        disabled: 0,
      }
    );

    const data = response?.results || (Array.isArray(response) ? response : []);
    return data.map((item: any) => ({
      label: item?.label || item.id,
      value: item?.id,
    }));
  },

  getDesignationOptions: async (params: { search_text?: string; skip?: number; limit?: number; department?: string }): Promise<any> => {
    const apiParams: Record<string, any> = {
      doctype: "Designation",
      search_text: params.search_text || "",
      limit: params.limit || 20,
      skip: params.skip || 0,
      custom_status: "Active",
    };
    if (params.department && params.department !== "All") {
      apiParams.custom_department = params.department;
    }

    const response: any = await FrappeAPI.callMethod(
      "recruitment.api.job_requisition.get_link_field_options",
      apiParams
    );

    const data = response?.results || (Array.isArray(response) ? response : []);
    return data.map((item: any) => ({
      label: item?.label || item.id,
      value: item?.id,
    }));
  },
  getReferanceGoals: async (params?: ReferenceGoalsParams): Promise<ReferenceGoalsResponse> =>{
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_reference_goals",
      params as Record<string, unknown>
    );
    return response as ReferenceGoalsResponse

  },
  getGoalRepository: async (params?: ReferenceGoalsParams): Promise<GoalRepositoryResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_goal_repositories",
      params as Record<string, unknown>
    );
    return response as GoalRepositoryResponse;
  },
  getCascadeGoals: async (params?: CascadeGoalsParams): Promise<CascadeGoalsResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_cascade_goals",
      params as Record<string, unknown>
    );
    return response as CascadeGoalsResponse;
  },

  getGoalDetail: async (goalId: string): Promise<GoalDetailResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_goal_detail",
      { goal: goalId },
    );
    return response as GoalDetailResponse;
  },

  submitGoalCheckIn: async (payload: SubmitGoalCheckInPayload): Promise<SubmitGoalCheckInResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.submit_check_in",
      { payload },
    );
    return throwIfUnsuccessful(response as SubmitGoalCheckInResponse);
  },

  getGoalCheckIns: async (goalId: string): Promise<GoalCheckInsResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_goal_checkins",
      { goal: goalId },
    );
    return response as GoalCheckInsResponse;
  },

  getOverview: async (): Promise<PerformanceOverviewResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.goal_api.get_overview",
    );
    return response as PerformanceOverviewResponse;
  },
  getMyPeerReviews: async (): Promise<MyPeerReviewsResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.feedback_api.get_my_peer_reviews",
    );
    return response as MyPeerReviewsResponse;
  },

  getFeedbackForm: async (nomination: string): Promise<FeedbackFormResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.feedback_api.get_feedback_form",
      { nomination },
    );
    return response as FeedbackFormResponse;
  },

  saveFeedback: async (payload: SaveFeedbackPayload): Promise<SaveFeedbackResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.feedback_api.save_feedback",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as SaveFeedbackResponse);
  },

  submitFeedback: async (payload: SubmitFeedbackPayload): Promise<SubmitFeedbackResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.feedback_api.submit_feedback",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as SubmitFeedbackResponse);
  },
  addGoalComment: async (payload: AddGoalCommentPayload): Promise<AddGoalCommentResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.goal_api.add_checkin_comment",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as AddGoalCommentResponse);
  },
  getTeamOverview: async (manager?: string): Promise<TeamOverviewResponse> => {
    const res = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.team_api.get_team_overview",
      manager ? { manager } : undefined,
    );
    return res as TeamOverviewResponse;
  },
  getTeamMembers: async (params?: TeamMembersParams): Promise<TeamMembersResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.team_api.get_team_members",
      params as Record<string, unknown> | undefined,
    );
    return response as TeamMembersResponse;
  },
  getTeamGoals: async (params?: TeamGoalsParams): Promise<TeamGoalsResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.get_team_goals",
      params as Record<string, unknown> | undefined,
    );
    return throwIfUnsuccessful(response as TeamGoalsResponse);
  },
  getApprovalQueue: async (params?: ApprovalQueueParams): Promise<ApprovalQueueResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.get_approval_queue",
      params as Record<string, unknown> | undefined,
    );
    return throwIfUnsuccessful(response as ApprovalQueueResponse);
  },
  getGoalApprovalDetail: async (params: GoalApprovalDetailParams): Promise<GoalApprovalDetailResponse> => {
    const response = await FrappeAPI.getMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.get_goal_approval_detail",
      { employee: params.employee, goal_key: params.goal_key },
    );
    return throwIfUnsuccessful(response as GoalApprovalDetailResponse);
  },
  approveTeamGoals: async (payload: GoalActionPayload): Promise<GoalActionResultResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.approve_goals",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as GoalActionResultResponse);
  },
  rejectTeamGoals: async (payload: GoalActionPayload): Promise<GoalActionResultResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.reject_goals",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as GoalActionResultResponse);
  },
  sendBackTeamGoals: async (payload: GoalActionPayload): Promise<GoalActionResultResponse> => {
    const response = await FrappeAPI.callMethod(
      "cn_pms.cn_performance_management.api.team_goal_api.send_back_goals",
      payload as unknown as Record<string, unknown>,
    );
    return throwIfUnsuccessful(response as GoalActionResultResponse);
  },

};


export const groupGoalsByParent = (items: GoalPlanItem[]): GroupedGoalItem[] => {
  const groupedGoals: GroupedGoalItem[] = [];
  let currentGroup: GroupedGoalItem | null = null;

  items.forEach((item) => {
    if (isGroupGoalItem(item)) {
      currentGroup = { ...item, subgroup: [] };
      groupedGoals.push(currentGroup);
    } else if (isSubGoalItem(item) && currentGroup) {
      currentGroup.subgroup.push(item);
    }
  });

  return groupedGoals;
};
