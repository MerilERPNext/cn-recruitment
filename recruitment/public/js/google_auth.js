frappe.provide('recruitment.google');

recruitment.google.save_token = function (user, access_token, refresh_token, token_expiry, google_email) {
    frappe.call({
        method: 'recruitment.api.google_token.save_user_google_token',
        args: {
            user: user,
            access_token: access_token,
            refresh_token: refresh_token,
            token_expiry: token_expiry,
            google_email: google_email
        },
        callback: function (r) {
            if (!r.exc) {
                frappe.msgprint(__('Google token saved successfully for ' + user));
            }
        }
    });
}
