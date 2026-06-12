/**
 * job_description.js — JD Template Builder (custom HTML editor, no Frappe Quill)
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders ONE drag-and-drop builder in the `jd_builder` HTML field (after Skills):
 *   - Left  : vertical field picker (Job Description + Job Requisition fields).
 *   - Right : a contenteditable HTML editor + toolbar.
 *   - Below : a live preview of the rendered JD.
 *
 * Dropping/clicking a field inserts a friendly "pill" that carries the Jinja
 * token in its `data-token`. The builder HTML is stored AS-IS in the hidden
 * `description` (Text Editor) field — lossless round-trip, no string rewriting.
 * At render time the backend (detokenize_pills) swaps each pill back to its
 * Jinja token and renders it (missing values ⇒ empty).
 * ─────────────────────────────────────────────────────────────────────────────
 */

let jdb_drag = null;      // {token,label} being dragged
let jdb_fields = [];      // flat [{label, token}] for the picker

// ── small html helpers ─────────────────────────────────────────────────────
function jdb_escAttr(s) {
	return String(s == null ? "" : s)
		.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function jdb_pillHtml(item) {
	return `<span class="jd-token" contenteditable="false" data-token="${jdb_escAttr(item.token)}">` +
		`${frappe.utils.escape_html(item.label || item.token)}</span>`;
}

// ── styles ──────────────────────────────────────────────────────────────────
function jdb_injectStyles() {
	if (document.getElementById("jdb-styles")) return;
	const css = `
		.jdb-wrap{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;}
		.jdb-picker{flex:0 0 240px;border:1px solid #d8e0ea;border-radius:8px;background:#fbfdff;
			display:flex;flex-direction:column;max-height:560px;}
		.jdb-picker-hd{padding:9px 11px;border-bottom:1px solid #e6ecf3;}
		.jdb-picker-body{padding:8px 11px;overflow-y:auto;}
		.jdb-field{display:block;padding:4px 9px;margin:2px 0;border:1px solid #d5deea;border-radius:6px;
			background:#fff;color:#1a3a6b;font-size:.8rem;cursor:grab;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
		.jdb-field:hover{background:#eef3fa;}
		.jdb-grouphd{font-size:.72rem;font-weight:700;color:#5b6b80;text-transform:uppercase;letter-spacing:.03em;margin:6px 0 4px;}
		.jdb-main{flex:1 1 440px;min-width:360px;}
		.jdb-toolbar{display:flex;flex-wrap:wrap;gap:2px;border:1px solid #d8e0ea;border-bottom:none;
			border-radius:8px 8px 0 0;background:#f6f9fc;padding:5px 7px;}
		.jdb-tb{border:1px solid transparent;background:transparent;border-radius:5px;min-width:28px;height:26px;cursor:pointer;font-size:.85rem;color:#33415c;}
		.jdb-tb:hover{background:#e7eefb;border-color:#cdd9ea;}
		.jdb-editor{border:1px solid #d8e0ea;border-radius:0 0 8px 8px;min-height:380px;max-height:600px;
			overflow-y:auto;padding:14px 16px;background:#fff;font-size:.9rem;line-height:1.6;outline:none;}
		.jdb-editor:focus{border-color:#9db7e0;box-shadow:0 0 0 2px rgba(120,160,220,.15);}
		.jd-token{display:inline-block;padding:1px 9px;margin:0 2px;border-radius:11px;background:#e7eefb;color:#1a3a6b;
			border:1px solid #c5d2e0;font-size:.88em;line-height:1.6;white-space:nowrap;user-select:none;}
		.jdb-preview-hd{font-size:.74rem;font-weight:700;color:#5b6b80;text-transform:uppercase;letter-spacing:.03em;margin:14px 0 4px;}
		.jdb-preview{border:1px dashed #cdd7e2;border-radius:8px;padding:12px 16px;background:#fff;font-size:.9rem;line-height:1.6;}
	`;
	const s = document.createElement("style");
	s.id = "jdb-styles";
	s.textContent = css;
	document.head.appendChild(s);
}

// ── insert / sync ─────────────────────────────────────────────────────────
function jdb_insertPill(editor, item, range) {
	editor.focus();
	const sel = window.getSelection();
	if (range) { sel.removeAllRanges(); sel.addRange(range); }
	else if (editor._range) { sel.removeAllRanges(); sel.addRange(editor._range); }

	let r = sel.rangeCount ? sel.getRangeAt(0) : null;
	if (!r || !editor.contains(r.commonAncestorContainer)) {
		r = document.createRange(); r.selectNodeContents(editor); r.collapse(false);
	}
	r.deleteContents();
	// Table fields carry a Jinja loop ({% for row in … %}{{ row.x }}{% endfor %}).
	// Insert those as EDITABLE text so the author can format each row (bullets,
	// labels, line breaks); a single non-editable pill would lock the whole loop
	// in one opaque box. Scalar fields stay as friendly pills.
	const isBlock = /{%/.test(item.token || "");
	let last;
	if (isBlock) {
		const frag = document.createDocumentFragment();
		frag.appendChild(document.createTextNode(item.token));
		last = document.createTextNode(" ");
		frag.appendChild(last);
		r.insertNode(frag);
	} else {
		const tpl = document.createElement("template");
		tpl.innerHTML = jdb_pillHtml(item) + " ";
		last = tpl.content.lastChild;
		r.insertNode(tpl.content);
	}
	if (last) {
		const after = document.createRange();
		after.setStartAfter(last); after.collapse(true);
		sel.removeAllRanges(); sel.addRange(after);
		editor._range = after.cloneRange();
	}
	jdb_sync(editor);
}

function jdb_sync(editor) {
	const frm = editor._frm;
	if (!frm) return;
	frm.doc.description = editor.innerHTML;  // store builder HTML as-is (pills carry the Jinja)
	frm.dirty();
	jdb_previewDebounced(frm);
}

const jdb_previewDebounced = frappe.utils.debounce(frm => jdb_preview(frm), 500);

function jdb_saveRange(editor) {
	const sel = window.getSelection();
	if (sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
		editor._range = sel.getRangeAt(0).cloneRange();
	}
}

// ── render ──────────────────────────────────────────────────────────────────
function jdb_render(frm, groups) {
	const $wrapper = frm.fields_dict["jd_builder"]?.$wrapper;
	if (!$wrapper || !$wrapper.length) return;
	jdb_injectStyles();
	$wrapper.empty();

	jdb_fields = [];
	(groups || []).forEach(g => (g.fields || []).forEach(f => jdb_fields.push({ label: f.label, token: f.token })));
	jdb_fields.sort((a, b) => (b.token || "").length - (a.token || "").length);

	const groupsHtml = (groups || []).map(g => {
		const rows = (g.fields || []).map(f =>
			`<div class="jdb-field" draggable="true" data-token="${jdb_escAttr(f.token)}" data-label="${jdb_escAttr(f.label)}" title="${jdb_escAttr(f.label)}">` +
			`<span style="color:#7c93b3;">⠿</span>&nbsp; ${frappe.utils.escape_html(f.label)}</div>`
		).join("");
		return `<div class="jdb-group"><div class="jdb-grouphd">${frappe.utils.escape_html(g.group)}</div>${rows}</div>`;
	}).join("");

	const tb = [
		["bold", "<b>B</b>", "Bold"], ["italic", "<i>I</i>", "Italic"], ["underline", "<u>U</u>", "Underline"],
		["insertUnorderedList", "•", "Bullets"], ["insertOrderedList", "1.", "Numbered"],
		["formatBlock:H3", "H", "Heading"], ["removeFormat", "T×", "Clear"],
	].map(([cmd, html, t]) => `<button type="button" class="jdb-tb" data-cmd="${cmd}" title="${t}">${html}</button>`).join("");

	const $ui = $(`
		<div class="jdb-wrap">
			<div class="jdb-picker">
				<div class="jdb-picker-hd">
					<div style="font-size:.82rem;font-weight:700;color:#1a3a6b;margin-bottom:6px;">📋 Insert Field</div>
					<input type="text" class="form-control jdb-search" placeholder="🔍 Search fields…" style="height:28px;font-size:.8rem;padding:2px 8px;" />
					<div style="font-size:.7rem;color:#8794a6;margin-top:4px;">Drag into the body, or click to insert.</div>
				</div>
				<div class="jdb-picker-body">${groupsHtml}</div>
			</div>
			<div class="jdb-main">
				<div class="jdb-toolbar">${tb}</div>
				<div class="jdb-editor" contenteditable="true"></div>
				<div class="jdb-preview-hd">Live Preview</div>
				<div class="jdb-preview"><span class="text-muted">…</span></div>
			</div>
		</div>`);
	$wrapper.append($ui);

	const editor = $ui.find(".jdb-editor")[0];
	editor._frm = frm;
	editor.innerHTML = frm.doc.description || "";

	$(editor).on("keyup mouseup blur", () => jdb_saveRange(editor));
	$(editor).on("input", () => jdb_sync(editor));

	$ui.on("mousedown", ".jdb-tb", e => e.preventDefault());
	$ui.on("click", ".jdb-tb", function () {
		const cmd = $(this).data("cmd"); editor.focus();
		if (String(cmd).indexOf("formatBlock:") === 0) document.execCommand("formatBlock", false, cmd.split(":")[1]);
		else document.execCommand(cmd, false, null);
		jdb_sync(editor);
	});

	$ui.on("click", ".jdb-field", function () {
		jdb_insertPill(editor, { token: $(this).attr("data-token"), label: $(this).attr("data-label") });
	});
	$ui.on("dragstart", ".jdb-field", function (e) {
		jdb_drag = { token: $(this).attr("data-token"), label: $(this).attr("data-label") };
		try { (e.originalEvent || e).dataTransfer.setData("text/plain", jdb_drag.token); } catch (err) {}
	});
	$ui.on("dragend", ".jdb-field", () => setTimeout(() => { jdb_drag = null; }, 50));

	editor.addEventListener("dragover", e => { if (jdb_drag) { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } });
	editor.addEventListener("drop", e => {
		if (!jdb_drag) return;
		e.preventDefault();
		let range = null;
		if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(e.clientX, e.clientY);
		else if (document.caretPositionFromPoint) {
			const p = document.caretPositionFromPoint(e.clientX, e.clientY);
			if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); range.collapse(true); }
		}
		jdb_insertPill(editor, jdb_drag, range);
		jdb_drag = null;
	});

	$ui.on("input search", ".jdb-search", function () {
		const q = ($(this).val() || "").toLowerCase().trim();
		$ui.find(".jdb-field").each(function () {
			const txt = ($(this).text() + " " + ($(this).attr("data-token") || "")).toLowerCase();
			this.style.display = (!q || txt.indexOf(q) !== -1) ? "" : "none";
		});
		// Show a group when any of its fields is shown. Check the field's own
		// inline display (not jQuery :visible) — :visible reports false while the
		// group is hidden, which would wrongly keep groups collapsed after the
		// search box is cleared.
		$ui.find(".jdb-group").each(function () {
			const anyShown = $(this).find(".jdb-field").toArray()
				.some(el => el.style.display !== "none");
			this.style.display = anyShown ? "" : "none";
		});
	});

	editor._previewEl = $ui.find(".jdb-preview")[0];
	jdb_preview(frm);
}

function jdb_preview(frm) {
	const el = frm.fields_dict["jd_builder"]?.$wrapper.find(".jdb-preview")[0];
	if (!el) return;
	frappe.call({
		method: "recruitment.recruitment.doctype.job_description.job_description.render_description",
		args: { description: frm.doc.description || "", doc: JSON.stringify(frm.doc || {}) },
		callback(r) { el.innerHTML = r.message || "<span class='text-muted'>Nothing to preview yet.</span>"; },
	});
}

frappe.ui.form.on("Job Description", {
	refresh(frm) {
		frappe.call({
			method: "recruitment.recruitment.doctype.job_description.job_description.get_jd_template_fields",
			callback(r) { if (r.message?.groups) jdb_render(frm, r.message.groups); },
		});
	},
});
