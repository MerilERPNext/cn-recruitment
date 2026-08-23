import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { DeleteGoalsPayload, GoalActionResponse, GoalFormConfig, GoalPlanId, GoalPlanResponse, GoalsRequest, GoalSubmitResponse, Message, MyGoalsResponse, ReferenceGoalsParams, ReferenceGoalsResponse, GoalRepositoryResponse, SaveGoalsPayload, SubmitSelectedGoalsPayload, CascadeGoalsParams, CascadeGoalsResponse, GoalDetailResponse, GoalCheckInsResponse, SubmitGoalCheckInPayload, SubmitGoalCheckInResponse, PerformanceOverviewResponse, RequestCheckInPayload, RequestCheckInResponse, MyPeerReviewsResponse, FeedbackFormResponse, SaveFeedbackResponse, SaveFeedbackPayload, SubmitFeedbackPayload, SubmitFeedbackResponse, AddGoalCommentPayload, AddGoalCommentResponse, TeamOverviewResponse, TeamMembersResponse, TeamMembersParams, TeamGoalsParams, TeamGoalsResponse, ApprovalQueueParams, ApprovalQueueResponse, GoalApprovalDetailParams, GoalApprovalDetailResponse, GoalActionPayload, GoalActionResultResponse } from "../types/goal";
import { performanceService } from "../services/performanceService";
import { queryClient } from "../providers/QueryProvider";
interface PerformanceQueryKey {

  goalPlans: (employeeId: string) => ["performance", "goal-plans", string];
  goalPlan: (goalId: string) => ["performance", "goal-plan", string];
  goalFormConfig: ["performance", "goal-form-config"];
  myGoals: ["performance", "my-goals"];
  mandatoryGoals: ["performance", "mandatory-goals"];
  referenceGoals: (params?: ReferenceGoalsParams) => ["performance", "reference-goals", ReferenceGoalsParams | undefined];
  goalRepository: (params?: ReferenceGoalsParams) => ["performance", "goal-repository", ReferenceGoalsParams | undefined];
  cascadeGoalManager: (params?: CascadeGoalsParams) => ["performance", "cascade-manager-goals", CascadeGoalsParams | undefined];
  goalDetail: (goalId: string) => ["performance", "goal-detail", string];
  goalApprovalDetail: (params?: GoalApprovalDetailParams) => ["performance", "goal-approval-detail", GoalApprovalDetailParams | undefined];
  goalCheckIns: (goalId: string) => ["performance", "goal-check-ins", string];
  overview: ["performance", "overview"];
  teamOverview: (manager?: string) => ["performance", "team-overview", string | undefined];
  teamMembers: (params?: TeamMembersParams) => ["performance", "team-members", TeamMembersParams | undefined];
  teamGoals: (params?: TeamGoalsParams) => ["performance", "team-goals", TeamGoalsParams | undefined];
  approvalQueue: (params?: ApprovalQueueParams) => ["performance", "approval-queue", ApprovalQueueParams | undefined];
  myPeerReviews: ["performance", "my-peer-reviews"];
  feedbackForm: (nomination: string) => ["performance", "feedback-form", string];
}
export const PERFORMANCE_QUERY_KEYS: PerformanceQueryKey = {
  goalPlans: (employeeId: string) => ["performance", "goal-plans", employeeId] as const,
  goalPlan: (goalId: string) => ["performance", "goal-plan", goalId] as const,
  goalFormConfig: ["performance", "goal-form-config"] as const,
  myGoals: ["performance", "my-goals"] as const,
  mandatoryGoals: ["performance", "mandatory-goals"] as const,
  referenceGoals: (params?: ReferenceGoalsParams) => ["performance", "reference-goals", params],
  goalRepository: (params?: ReferenceGoalsParams) => ["performance", "goal-repository", params],
  cascadeGoalManager: (params?: CascadeGoalsParams) => ["performance", "cascade-manager-goals", params],
  goalDetail: (goalId: string) => ["performance", "goal-detail", goalId] as const,
  goalApprovalDetail: (params?: GoalApprovalDetailParams) => ["performance", "goal-approval-detail", params],
  goalCheckIns: (goalId: string) => ["performance", "goal-check-ins", goalId] as const,
  overview: ["performance", "overview"] as const,
  teamOverview: (manager?: string) => ["performance", "team-overview", manager] as const,
  teamMembers: (params?: TeamMembersParams) => ["performance", "team-members", params],
  teamGoals: (params?: TeamGoalsParams) => ["performance", "team-goals", params],
  approvalQueue: (params?: ApprovalQueueParams) => ["performance", "approval-queue", params],
  myPeerReviews: ["performance", "my-peer-reviews"] as const,
  feedbackForm: (nomination: string) => ["performance", "feedback-form", nomination] as const,
};

export const useGoalPlans = (employeeId: string): UseQueryResult<GoalPlanId[], Error> =>
  useQuery<GoalPlanId[], Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalPlans(employeeId),
    queryFn: () => performanceService.getAllGoalPlans(employeeId),
    refetchOnWindowFocus: true,
  });

export const useGoalFormConfig = (): UseQueryResult<GoalFormConfig, Error> =>
  useQuery<GoalFormConfig, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalFormConfig,
    queryFn: performanceService.getGoalFormConfig,
    staleTime: 5 * 60 * 1000,
  });

export const useAddGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => performanceService.addGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] }),
  });
};

export const useUpdateGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => performanceService.updateGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] }),
  });
};

export const useSaveGoals = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveGoalsPayload) => performanceService.saveGoals(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-plans"] });
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals });
    },
  });
};

export const useGoalPlanDetails = (goalId: string): UseQueryResult<GoalPlanResponse, Error> =>
  useQuery<GoalPlanResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalPlan(goalId),
    queryFn: () => performanceService.getGoalPlanDetails(goalId),
    refetchOnWindowFocus: true,
  });

export const useMyGoals = (
  params?: { employee?: string },
  options?: { enabled?: boolean }
): UseQueryResult<MyGoalsResponse, Error> =>
  useQuery<MyGoalsResponse, Error>({
    queryKey: params?.employee ? [...PERFORMANCE_QUERY_KEYS.myGoals, params.employee] : PERFORMANCE_QUERY_KEYS.myGoals,
    queryFn: () => performanceService.getMyGoals(params),
    refetchOnWindowFocus: false,
    staleTime: 1 * 60 * 1000,
    ...options,
  });

export const useSubmitSelectedGoals = () => {
  const queryClient = useQueryClient();

  return useMutation<GoalActionResponse, Error, SubmitSelectedGoalsPayload>({
    mutationFn: (payload) => performanceService.submitSelectedGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals }),
  });
};

export const useDeleteGoals = () => {
  const queryClient = useQueryClient();

  return useMutation<GoalActionResponse, Error, DeleteGoalsPayload>({
    mutationFn: (payload) => performanceService.deleteGoals(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals }),
  });
};

export const useGetMandotaryGoals = (): UseQueryResult<Message, Error> =>
  useQuery<Message, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.mandatoryGoals,
    queryFn: () => performanceService.getMandotaryGoals(),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
export const useSubmitMandatoryGoals = () =>
  useMutation<GoalSubmitResponse, Error, GoalsRequest>({
    mutationFn: (payload) => performanceService.submitMandatoryGoals(payload),
  });

export const fetchDepartmentOptions = (company?: string) => {
  return async (search: string, skip: number) => {
    try {
      return await performanceService.getDepartmentOptions({
        search_text: search,
        skip,
        company,
      });
    } catch (e) {
      console.error("Failed to fetch department options", e);
      return [];
    }
  };
};

export const fetchDesignationOptions = (department?: string) => {
  return async (search: string, skip: number) => {
    try {
      return await performanceService.getDesignationOptions({
        search_text: search,
        skip,
        department,
      });
    } catch (e) {
      console.error("Failed to fetch designation options", e);
      return [];
    }
  };
};

export const useReferanceGoals = (params?:ReferenceGoalsParams , options?:{enabled?:boolean}):UseQueryResult<ReferenceGoalsResponse , Error> => {
  return useQuery<ReferenceGoalsResponse , Error>({
    queryKey:PERFORMANCE_QUERY_KEYS.referenceGoals(params),
    queryFn:()=>performanceService.getReferanceGoals(params),
    enabled:options?.enabled ?? true,
    staleTime:2 * 60 * 1000
  })
};

export const useGoalRepository = (params?: ReferenceGoalsParams, options?: { enabled?: boolean }): UseQueryResult<GoalRepositoryResponse, Error> => {
  return useQuery<GoalRepositoryResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalRepository(params),
    queryFn: () => performanceService.getGoalRepository(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCascadeMangerGoals = (params?: CascadeGoalsParams, options?: { enabled?: boolean }): UseQueryResult<CascadeGoalsResponse, Error> =>{
  return useQuery<CascadeGoalsResponse , Error>({
    queryKey:PERFORMANCE_QUERY_KEYS.cascadeGoalManager(params),
    queryFn:() => performanceService.getCascadeGoals(params),
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  })
}

export const useGoalDetail = (goalId: string, options?: { enabled?: boolean }): UseQueryResult<GoalDetailResponse, Error> =>
  useQuery<GoalDetailResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalDetail(goalId),
    queryFn: () => performanceService.getGoalDetail(goalId),
    enabled: (options?.enabled ?? true) && !!goalId,
    refetchOnWindowFocus: true,
    staleTime: 1 * 60 * 1000,
  });

export const useGoalCheckIns = (goalId: string, options?: { enabled?: boolean }): UseQueryResult<GoalCheckInsResponse, Error> =>
  useQuery<GoalCheckInsResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalCheckIns(goalId),
    queryFn: () => performanceService.getGoalCheckIns(goalId),
    enabled: (options?.enabled ?? true) && !!goalId,
    staleTime: 30 * 1000,
    ...options,
  });

export const useSubmitGoalCheckIn = () => {
  const queryClient = useQueryClient();

  return useMutation<SubmitGoalCheckInResponse, Error, SubmitGoalCheckInPayload>({
    mutationFn: (payload) => performanceService.submitGoalCheckIn(payload),
    onSuccess: (_response) => {
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-detail"]})
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-check-ins"]})
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals });
    },
  });
};

export const usePerformanceOverview = (): UseQueryResult<PerformanceOverviewResponse, Error> =>
  useQuery<PerformanceOverviewResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.overview,
    queryFn: performanceService.getOverview,
    staleTime: 5 * 60 * 1000,
  });
export const useGetMyPeerReviews = (): UseQueryResult<MyPeerReviewsResponse, Error> =>
  useQuery<MyPeerReviewsResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.myPeerReviews,
    queryFn: performanceService.getMyPeerReviews,
    staleTime: 5 * 60 * 1000,
  });
export const useGetFeedBackForm = (peerId: string, options?: { enabled?: boolean }): UseQueryResult<FeedbackFormResponse, Error> =>
  useQuery<FeedbackFormResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.feedbackForm(peerId),
    queryFn:()=> performanceService.getFeedbackForm(peerId),
    enabled: (options?.enabled ?? true) && !!peerId,
    staleTime: 30 * 1000,
    ...options,
  });
export const useSaveFeedback = ()  => {
  return useMutation<SaveFeedbackResponse, Error, SaveFeedbackPayload>({
    mutationFn:(payload)=>performanceService.saveFeedback(payload),
    onSuccess:()=>{
      queryClient.invalidateQueries({queryKey:PERFORMANCE_QUERY_KEYS.myPeerReviews})
    }
  })
}
  
export const useSubmitFeedback = ()  => {
  return useMutation<SubmitFeedbackResponse, Error, SubmitFeedbackPayload>({
    mutationFn:(payload)=>performanceService.submitFeedback(payload),
    onSuccess:()=>{
      queryClient.invalidateQueries({queryKey:PERFORMANCE_QUERY_KEYS.myPeerReviews})
    }
  })
}
export const useAddGoalComment = ()  => {
  return useMutation<AddGoalCommentResponse, Error, AddGoalCommentPayload>({
    mutationFn:(payload)=>performanceService.addGoalComment(payload),
    onSuccess:()=>{
      queryClient.invalidateQueries({queryKey:PERFORMANCE_QUERY_KEYS.myGoals})
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-check-ins"]})
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-detail"] })
    }
  })
}
  

export const useEmployeeGoalsCheckIn = () => {

  return useMutation<RequestCheckInResponse, Error, RequestCheckInPayload>({
    mutationFn: (payload) => performanceService.employeeGoalCheckIn(payload),
   
  });
};

export const useGetTeamOverview = (manager?: string): UseQueryResult<TeamOverviewResponse, Error> =>
  useQuery<TeamOverviewResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.teamOverview(manager),
    queryFn: () => performanceService.getTeamOverview(manager),
    staleTime: 5 * 60 * 1000,
  });
export const useGetTeamMembers = (params?: TeamMembersParams): UseQueryResult<TeamMembersResponse, Error> =>
  useQuery<TeamMembersResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.teamMembers(params),
    queryFn: () => performanceService.getTeamMembers(params),
    staleTime: 5 * 60 * 1000,
  });
export const useGetTeamGoals = (params?: TeamGoalsParams): UseQueryResult<TeamGoalsResponse, Error> =>
  useQuery<TeamGoalsResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.teamGoals(params),
    queryFn: () => performanceService.getTeamGoals(params),
    staleTime: 5 * 60 * 1000,
  });
export const useGetApprovelQueue = (params?: ApprovalQueueParams): UseQueryResult<ApprovalQueueResponse, Error> =>
  useQuery<ApprovalQueueResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.approvalQueue(params),
    queryFn: () => performanceService.getApprovalQueue(params),
    staleTime: 5 * 60 * 1000,
  });
export const useGetGoalApprovalDetail = (
  params?: GoalApprovalDetailParams,
  options?: { enabled?: boolean }
): UseQueryResult<GoalApprovalDetailResponse, Error> =>
  useQuery<GoalApprovalDetailResponse, Error>({
    queryKey: PERFORMANCE_QUERY_KEYS.goalApprovalDetail(params),
    queryFn: () => performanceService.getGoalApprovalDetail(params!),
    enabled: (options?.enabled ?? true) && !!params?.employee && !!params?.goal_key,
    staleTime: 2 * 60 * 1000,
  });

export const useApproveTeamGoals = () => {
  return useMutation<GoalActionResultResponse, Error, GoalActionPayload>({
    mutationFn: (payload) => performanceService.approveTeamGoals(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance", "approval-queue"] });
      queryClient.invalidateQueries({ queryKey: ["performance", "goal-approval-detail"] });
    },
  })
}
