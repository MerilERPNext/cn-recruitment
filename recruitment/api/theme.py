"""Backend-driven design tokens for the recruitment frontend's theme system.

The frontend (``src/styles/theme.css``) defines the NOVA palette as static CSS
custom properties under ``:root``/``[data-theme]`` — that stays exactly as-is
and now serves as the FALLBACK layer. ``get_client_theme`` below is the
dynamic override on top of it: ``ThemeProvider`` fetches it once per session
and calls ``style.setProperty`` for whatever it returns, which — being an
inline style — wins over the static stylesheet rules. Nothing configured yet,
or the request fails? Nothing happens, and the static defaults keep showing.
That is the whole fallback story; there is no separate "if API fails" branch
to write.

DOCTYPE
    Client Theme Settings — see its own docstring
    (doctype/client_theme_settings/client_theme_settings.py) for how to add a
    new client, activate one, or add a new named theme for an existing client.
"""

import frappe

# Maps a Client Theme Settings Color field to the CSS custom property it
# feeds (without the leading "--"). The frontend does
# `document.documentElement.style.setProperty("--" + key, value)` for every
# key in the response, so this mapping is the one place that contract lives.
_TOKEN_FIELD_TO_VAR = {
	"surface": "surface",
	"surface_raised": "surface-raised",
	"surface_sunken": "surface-sunken",
	"app_background": "app",
	"sidebar": "sidebar",
	"primary": "primary",
	"primary_hover": "primary-hover",
	"brand_deep": "brand-deep",
	"on_primary": "on-primary",
	"text_title": "text-title",
	"text_body1": "text-body1",
	"text_body2": "text-body2",
	"text_disabled": "text-disabled",
	"text_link": "text-link",
	"text_primary_brand": "text-primary-brand",
	"border": "border",
	"border_strong": "border-strong",
	"success": "success",
	"warning": "warning",
	"error": "error",
	"info": "info",
	"ring": "ring",
}

# The exact values `theme.css` ships today, so a site with zero Client Theme
# Settings records renders pixel-identical to before this feature existed.
# Also used to fill in any token a record leaves blank, so a client can
# override just `primary` and inherit everything else.
_PLATFORM_DEFAULTS = {
	"Light": {
		"surface": "255 255 255",
		"surface_raised": "255 255 255",
		"surface_sunken": "246 251 255",
		"app_background": "246 251 255",
		"sidebar": "255 255 255",
		"primary": "24 217 255",
		"primary_hover": "0 184 222",
		"brand_deep": "16 52 72",
		"on_primary": "16 52 72",
		"text_title": "11 23 36",
		"text_body1": "44 57 69",
		"text_body2": "109 126 138",
		"text_disabled": "152 176 192",
		"text_link": "10 147 176",
		"text_primary_brand": "16 52 72",
		"border": "221 234 240",
		"border_strong": "203 220 230",
		"success": "22 179 100",
		"warning": "234 170 46",
		"error": "191 39 52",
		"info": "14 165 233",
		"ring": "24 217 255",
	},
	"Dark": {
		"surface": "11 23 36",
		"surface_raised": "16 52 72",
		"surface_sunken": "4 11 18",
		"app_background": "4 11 18",
		"sidebar": "11 23 36",
		"primary": "24 217 255",
		"primary_hover": "106 228 255",
		"brand_deep": "16 52 72",
		"on_primary": "16 52 72",
		"text_title": "246 251 255",
		"text_body1": "216 228 236",
		"text_body2": "147 167 180",
		"text_disabled": "107 132 150",
		"text_link": "24 217 255",
		"text_primary_brand": "24 217 255",
		"border": "30 58 77",
		"border_strong": "47 88 111",
		"success": "52 211 153",
		"warning": "251 191 36",
		"error": "248 113 113",
		"info": "56 189 248",
		"ring": "24 217 255",
	},
}


def _normalize_mode(mode):
	mode = (mode or "").strip().lower()
	return "Dark" if mode == "dark" else "Light"


def _hex_to_rgb_triplet(hex_color):
	"""``"#18D9FF"`` -> ``"24 217 255"`` — the space-separated format
	`theme.css` already uses so Tailwind's `<alpha-value>` keeps working."""
	hex_color = (hex_color or "").lstrip("#")
	if len(hex_color) != 6:
		return None
	try:
		r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
	except ValueError:
		return None
	return f"{r} {g} {b}"


def _default_theme_record(mode):
	return {
		"client": None,
		"theme_key": "default",
		"theme_name": f"Platform Default ({mode})",
	}


def _resolve_theme_doc(mode):
	"""The Client Theme Settings record to serve, or None when nothing is
	configured (the platform defaults alone are then the whole response)."""
	active_client = frappe.db.get_single_value("Recruitment Settings", "active_client")

	if active_client:
		name = frappe.db.get_value(
			"Client Theme Settings",
			{"client": active_client, "mode": mode, "is_default": 1, "is_active": 1},
			"name",
		)
		if name:
			return frappe.get_doc("Client Theme Settings", name)

	# Platform default: a theme with a blank `client`.
	name = frappe.db.get_value(
		"Client Theme Settings",
		{"client": "", "mode": mode, "is_default": 1, "is_active": 1},
		"name",
	)
	if name:
		return frappe.get_doc("Client Theme Settings", name)

	return None


@frappe.whitelist()
def get_client_theme(mode: str = "Light") -> dict:
	"""Design tokens for the active client's theme in `mode` ("Light"/"Dark",
	case-insensitive).

	Resolution order: the active client's default theme for this mode ->
	the platform's default theme for this mode -> hardcoded NOVA defaults.
	Always returns a full, usable token set — never throws, never returns an
	empty `tokens` dict — so the frontend never needs special-case handling
	beyond "the request itself failed" (network/permission error).
	"""
	mode = _normalize_mode(mode)
	defaults = _PLATFORM_DEFAULTS[mode]

	doc = _resolve_theme_doc(mode)

	tokens = {}
	for fieldname, var_name in _TOKEN_FIELD_TO_VAR.items():
		value = None
		if doc:
			value = _hex_to_rgb_triplet(doc.get(fieldname))
		tokens[var_name] = value or defaults[fieldname]

	if doc:
		return {
			"success": True,
			"client": doc.client or None,
			"theme_key": doc.theme_key,
			"theme_name": doc.theme_name,
			"mode": mode,
			"tokens": tokens,
		}

	fallback = _default_theme_record(mode)
	return {
		"success": True,
		"client": fallback["client"],
		"theme_key": fallback["theme_key"],
		"theme_name": fallback["theme_name"],
		"mode": mode,
		"tokens": tokens,
	}
