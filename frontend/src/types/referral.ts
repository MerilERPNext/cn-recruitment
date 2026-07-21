// ✅ Referral Details Interface
export interface ReferralDetails {
  referral_id: string
  candidate_name: string
  status: string
  applied_on: string
  position: string
  remarks?: string
  // ✅ Extra fields:
  email?: string
  resume_url?: string
  referrer_name?: string
  referral_date?: string
  latest_status?: string
  status_date?: string
}

export interface GetReferralStatusResponse {
  data: ReferralDetails
}

// ✅ Permission Error Class
export class PermissionError extends Error {
  constructor(
    message: string,
    public statusCode = 403,
  ) {
    super(message)
    this.name = "PermissionError"
  }
}

// ✅ New types for designations
export interface Designation {
  name: string
}

export interface DesignationResponse {
  data: Designation[]
}

// ✅ Option type for select dropdown
export interface SelectOption {
  label: string
  value: string
}