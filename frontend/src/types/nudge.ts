export interface NudgeResult {
  success: boolean;
  message: string;
  todo: string;
}

export interface NudgeResponse {
  success: boolean;
  message: string;
  results?: NudgeResult[];
}
