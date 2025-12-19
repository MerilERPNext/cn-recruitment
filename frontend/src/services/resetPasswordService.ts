import FrappeAPI from "../utils/frappeAPI";

export const requestPasswordReset = async (email: string) => {
  const response = FrappeAPI.callMethod('cn_hrms_core.api.request_password_reset', {
    email,
  });
  return response;
};


export const updatePasswordViaKey = async ({
  key,
  new_password,
}: {
  key: string;
  new_password: string;
}) => {
  const response = FrappeAPI.callMethod(
  'cn_hrms_core.api.update_password_via_key',
    {
      key,
      new_password,
    }
  );
  return response;
};

export const updatePasswordValidation = async ({
  new_password,
}: {
  new_password: string;
}) => {
  const response = FrappeAPI.callMethod(
  'cn_hrms_core.cn_hrms_core.overrides.password_validation.test_password_strength?',
    {
      new_password,
    }
  );
  return response;
};

