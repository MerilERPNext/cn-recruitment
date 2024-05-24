
frappe.ui.form.on('Web Form', {
	refresh:async function (frm) {
		alert("FIle Executed")
	},
	date_of_joining: async function (frm) {

    var doj = frappe.web_form.get_value('date_of_joining');
	let givenDate = new Date(doj);
	givenDate.setDate(givenDate.getDate() - 2);
	let year = givenDate.getFullYear();
	let month = String(givenDate.getMonth() + 1).padStart(2, '0');
	let day = String(givenDate.getDate()).padStart(2, '0');
	let resultDateString = `${year}-${month}-${day}`;
	frappe.web_form.set_value('boarding_begins_on', resultDateString)
  },
})