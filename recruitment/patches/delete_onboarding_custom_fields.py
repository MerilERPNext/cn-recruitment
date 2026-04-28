import frappe

def execute():
    doctype = "Employee Onboarding"
    
    # 1. Clean up any Custom Field records for Employee Onboarding (just to be safe)
    custom_fields = frappe.get_all("Custom Field", filters={"dt": doctype}, pluck="name")
    for cf in custom_fields:
        frappe.delete_doc("Custom Field", cf, force=1)
        
    # 2. Get valid fields from standard DocType
    standard_fields = [d.fieldname for d in frappe.get_meta(doctype).fields]
    # Standard fields handled automatically by frappe
    standard_fields.extend([
        "name", "creation", "modified", "modified_by", "owner", 
        "docstatus", "idx", "_user_tags", "_comments", "_assign", "_liked_by"
    ])
    
    # 3. Get all columns from db table
    if frappe.db.table_exists(doctype):
        db_columns = frappe.db.get_table_columns(doctype)
        
        # 4. Identify columns to drop (all those starting with 'custom_')
        columns_to_drop = []
        for col in db_columns:
            if col.startswith("custom_") and col not in standard_fields:
                columns_to_drop.append(col)
                
        # 5. Drop them
        if columns_to_drop:
            # We drop them one by one to avoid any query length limit issues
            for col in columns_to_drop:
                try:
                    frappe.db.commit()
                    frappe.db.sql(f"ALTER TABLE `tab{doctype}` DROP COLUMN `{col}`", auto_commit=1)
                    print(f"Successfully dropped column: {col}")
                except Exception as e:
                    # In case the column dropping fails (e.g., dependency, index)
                    print(f"Failed to drop column {col}: {str(e)}")
                    
    frappe.clear_cache(doctype=doctype)
