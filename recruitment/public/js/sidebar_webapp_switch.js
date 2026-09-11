// "Switch to Webapp" in the Desk sidebar header's dropdown (the menu under the app
// name, top-left), placed directly below Help. SidebarHeader builds its item list in
// the constructor and hands it to the menu in setup_app_switcher, so the item is
// spliced in there — before any items appended after Help (Navbar Settings ones on
// newer Frappe) are rendered. Shown to the same users as the Webapp desktop icon:
// `recruitment.recruitment.utils.check_app_permission` gates it on this role.
(() => {
	const SidebarHeader = frappe.ui.SidebarHeader;
	if (!SidebarHeader) return;

	const ITEM_NAME = "switch-to-webapp";
	const setup_app_switcher = SidebarHeader.prototype.setup_app_switcher;

	SidebarHeader.prototype.setup_app_switcher = function (...args) {
		if (!this.dropdown_items.some((item) => item.name === ITEM_NAME)) {
			const help = this.dropdown_items.findIndex((item) => item.name === "help");
			// Help is only there when desk notifications are enabled; append otherwise.
			const at = help === -1 ? this.dropdown_items.length : help + 1;
			this.dropdown_items.splice(at, 0, {
				name: ITEM_NAME,
				label: __("Switch to Webapp"),
				icon: "app-window",
				condition: () => frappe.user.has_role("Employee Self Service"),
				onClick: () => {
					window.location.href = "/webapp";
				},
			});
		}
		return setup_app_switcher.apply(this, args);
	};
})();
