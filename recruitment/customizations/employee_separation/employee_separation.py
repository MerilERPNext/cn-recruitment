import frappe

def update_employee_relieving_date(doc, method=None):
    if not doc.custom_actual_last_working_date or not doc.employee_name:
        return

    employee_doc = frappe.get_doc("Employee", {"employee_name": doc.employee_name})
    if employee_doc:
        frappe.db.set_value(
            "Employee",
            employee_doc.name,
            "relieving_date",
            frappe.utils.getdate(doc.custom_actual_last_working_date)
        )
import frappe
import json

@frappe.whitelist()
def get_dynamic_conversation_html(docname):
    conversations = frappe.get_all('CNA Conversation',
                                  filters={'reference_doc': f'Employee Separation::{docname}'},
                                  fields=['message'])

    html = '''
    <style>
    .frappe-table-wrapper {
        overflow-x: auto;
        margin-top: 10px;
    }
    .frappe-table {
        width: 100%;
        border-collapse: collapse;
        font-family: "Open Sans", Arial, sans-serif;
        font-size: 14px;
        border: 1px solid #ddd;
        box-shadow: 0 0 10px rgb(0 0 0 / 0.1);
        background-color: #fff;
    }
    .frappe-table th, .frappe-table td {
        padding: 12px 15px;
        border: 1px solid #ddd;
        text-align: left;
        vertical-align: top;
    }
    .frappe-table thead {
        background-color: #f5f6f7;
        color: #555;
        font-weight: 600;
    }
    .frappe-table tbody tr:hover {
        background-color: #f1f7fb;
    }
    </style>

    <div class="frappe-table-wrapper">
    <table class="frappe-table">
      <thead>
        <tr>
          <th>Question</th>
          <th>Answer</th>
        </tr>
      </thead>
      <tbody>
    '''

    rows_count = 0
    for conv in conversations:
        try:
            msg_json = json.loads(conv.message)
            components = msg_json.get('form', {}).get('components', [])
            submission = msg_json.get('submission_data', {})

            for comp in components:
                question = comp.get('label')
                key = comp.get('key')
                if not question or not key:
                    continue

                answer = submission.get(key)
                if answer is None or answer in [True, False] or answer == 'submit':
                    continue

                # For selectboxes (checkboxes), value may be a dict or complex type
                # Format answer nicely
                if isinstance(answer, dict):
                    # Format dictionary keys with true value for checkboxes
                    checked = [k for k, v in answer.items() if v]
                    answer_str = ', '.join(checked) if checked else 'None'
                else:
                    answer_str = str(answer)

                question_safe = frappe.safe_decode(question)
                answer_safe = frappe.safe_decode(answer_str)

                html += f'''
                <tr>
                    <td>{question_safe}</td>
                    <td>{answer_safe}</td>
                </tr>
                '''
                rows_count += 1
        except Exception:
            continue

    if rows_count == 0:
        html += '''
        <tr>
            <td colspan="2" style="text-align:center; color:#999;">No conversation data found</td>
        </tr>
        '''

    html += '''
      </tbody>
    </table>
    </div>
    '''

    return html
