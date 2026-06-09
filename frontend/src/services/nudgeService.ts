import FrappeAPI from "../utils/frappeAPI";
import { NudgeResponse } from "../types/nudge";

export const sendNudge = async (todo: string | string[]): Promise<NudgeResponse> => {
  const payload = { todo };
  const res = await FrappeAPI.callMethod("nextai.nextai.api.nudge.send_nudge", payload);
  return res as NudgeResponse;
};
