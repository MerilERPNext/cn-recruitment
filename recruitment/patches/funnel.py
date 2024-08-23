import frappe
def execute():
    funnels = frappe.get_all("Funnel", fields=["name"])
    for funnel in funnels:
        funnel_doc = frappe.get_doc("Funnel", funnel["name"])
        updated = False  # Track if any changes are made
        if not frappe.db.exists("Funnel",funnel["name"]):
            funnel_doc.insert(ignore_permissions = True)
            frappe.db.commit()
        for fd in funnel_doc.funnel_definition:
            if fd.type == "send_mail":
                node_data = frappe.parse_json(fd.data)
                node_data["email_account"] = frappe.get_value("Email Account", {"default_outgoing": 1})
                
                fd.data = frappe.as_json(node_data)  # Use frappe.as_json for consistency
                updated = True

        if updated:
            funnel_doc.save()
            frappe.db.commit()  # Commit the transaction after saving


    # for d in data:
    #     if not frappe.db.exists("Funnel",d.get("name")):
    #         frappe.get_doc(d).insert(ignore_permissions = True)
    #     else:
    #         funnel_doc = frappe.get_doc("Funnel",d.get("name"))
    #         funnel_doc.update(d)
    #         funnel_doc.save()


