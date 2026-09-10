// The "Webapp" desktop icon (recruitment/desktop_icon/webapp.json) links to /webapp.
// Frappe's desktop page resolves an External icon's relative link against
// window.location.origin and then sets target="_blank" on any route starting with
// "http" — i.e. every External icon — so it would always open in a new tab. Open
// the Webapp in the current tab instead, as a plain redirect.
document.addEventListener(
	"click",
	(event) => {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;

		// Edit mode strips the href, which leaves the icon to its hide/rename handlers.
		const icon = event.target.closest?.("a.desktop-icon[href]");
		if (!icon || event.target.closest(".hide-button")) return;

		const url = new URL(icon.getAttribute("href"), window.location.origin);
		if (url.origin !== window.location.origin || url.pathname.replace(/\/$/, "") !== "/webapp")
			return;

		event.preventDefault();
		event.stopImmediatePropagation();
		window.location.href = url.href;
	},
	true
);
