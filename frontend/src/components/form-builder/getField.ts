export async function get_fields_for_doctype(doctype: "string") {
  if (!window?.frappe) return;
  await new Promise((resolve) =>
    window.frappe.model.with_doctype(doctype, resolve)
  );
  return window.frappe.meta
    .get_docfields(doctype)
    .filter((df: { fieldtype: string; fieldname: string }) => {
      return (
        (window.frappe.model.is_value_type(df.fieldtype) &&
          !["lft", "rgt"].includes(df.fieldname)) ||
        ["Table", "Table Multiselect"].includes(df.fieldtype)
      );
    });
}
