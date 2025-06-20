import json
import requests
import re
import frappe
from frappe.utils import now_datetime, strip_html
from nextai.funnel.doctype.funnel_task import action_return_keys
from nextai.funnel.doctype.funnel_task.utils.format_with_variables import format_with_variables
from nextai.funnel.doctype.funnel_task.utils.logger import debug
from recruitment.customizations.interview.interview import refresh_access_token




def send_teams_message(action_node, variables):
    try:
        node_data = json.loads(action_node.data)

        sender_user_id = format_with_variables(node_data.get("user"), variables)
        recipients = format_with_variables(node_data.get("recipients"), variables)
        use_template = node_data.get("select_template")
        message_template = node_data.get("message_template")
        message_subject = node_data.get("message_subject")
        message_content = node_data.get("message_content")

        if not recipients:
            frappe.throw("Recipients (Teams User IDs) are required.")

        recipient_ids = [r.strip() for r in recipients.split(",") if r]

        if use_template:
            template_doc = frappe.get_doc("Email Template", message_template)
            content = template_doc.response_html or template_doc.subject or ""
            subject = template_doc.subject or ""
        else:
            content = message_content
            subject = message_subject or ""

        # content = strip_html(format_with_variables(content, variables))
        content = format_with_variables(content, variables)
        subject = format_with_variables(subject, variables)
        full_message = f"{subject}\n\n{content}" if subject else content

        prev_user = frappe.session.user
        try:
            if sender_user_id:
                frappe.session.user = sender_user_id

            from_upn = frappe.db.get_value("User", frappe.session.user, "email")
            token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

            if token_doc.token_expiry <= now_datetime():
                refresh_access_token(frappe.session.user)
                token_doc = frappe.get_doc("Microsoft Teams User Token", {"user": frappe.session.user})

            access_token = token_doc.access_token
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            for recipient_id in recipient_ids:
                to_upn = frappe.db.get_value("User", recipient_id, "email")
                if not to_upn:
                    debug(f"No email found for user {recipient_id}, skipping")
                    frappe.log_error(f"No email found for user {recipient_id}", "Teams Message Warning")
                    continue

                chat_payload = {
                    "chatType": "oneOnOne",
                    "members": [
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": ["owner"],
                            "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{to_upn}')"
                        },
                        {
                            "@odata.type": "#microsoft.graph.aadUserConversationMember",
                            "roles": ["owner"],
                            "user@odata.bind": f"https://graph.microsoft.com/v1.0/users('{from_upn}')"
                        }
                    ]
                }

                chat_res = requests.post("https://graph.microsoft.com/v1.0/chats", headers=headers, json=chat_payload)
                if chat_res.status_code not in [200, 201]:
                    frappe.log_error(chat_res.text, f"Failed to create chat for {recipient_id}")
                    continue

                chat_id = chat_res.json().get("id")
                msg_payload = {
                    "body": {
                        "contentType": "html",
                        "content": full_message
                    }
                }

                msg_url = f"https://graph.microsoft.com/v1.0/chats/{chat_id}/messages"
                msg_res = requests.post(msg_url, headers=headers, json=msg_payload)

                if msg_res.status_code != 201:
                    frappe.log_error(msg_res.text, f"Failed to send message to {recipient_id}")
                else:
                    frappe.log_error(f"Message sent to {recipient_id}", "Teams Message Success")

        finally:
            frappe.session.user = prev_user

        variables["funnel_teams_recipients"] = ", ".join(recipient_ids)
        return {
            action_return_keys.result: {
                "recipients": recipient_ids
            }
        }

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Teams Message Exception")
        raise
