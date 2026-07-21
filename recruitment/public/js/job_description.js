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
		.jdb-wrap{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;
			--jdb-indigo:#4f46e5;--jdb-violet:#7c3aed;--jdb-ink:#3730a3;}
		/* ── Field picker ─────────────────────────────────────────── */
		.jdb-picker{flex:0 0 250px;border:1px solid #e4e7f2;border-radius:14px;background:#fff;
			display:flex;flex-direction:column;max-height:600px;overflow:hidden;
			box-shadow:0 4px 16px rgba(49,46,129,.07);}
		.jdb-picker-hd{padding:13px 14px 12px;border-bottom:1px solid #e4e2f7;
			background:linear-gradient(135deg,#eef2ff 0%,#f5f3ff 55%,#fdf4ff 100%);}
		.jdb-picker-hd .form-control{border:1px solid #dcd9f5;border-radius:9px;background:#fff;}
		.jdb-picker-hd .form-control:focus{border-color:var(--jdb-indigo);box-shadow:0 0 0 3px rgba(79,70,229,.14);}
		.jdb-picker-body{padding:10px 12px;overflow-y:auto;}
		.jdb-picker-body::-webkit-scrollbar{width:8px;}
		.jdb-picker-body::-webkit-scrollbar-thumb{background:#d7dbf0;border-radius:8px;}
		.jdb-field{display:flex;align-items:center;gap:7px;padding:7px 11px;margin:4px 0;
			border:1px solid #e6e8f4;border-left:3px solid #c7d2fe;border-radius:9px;
			background:#fff;color:#3730a3;font-size:.8rem;font-weight:500;cursor:grab;
			white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
			transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background .12s ease;}
		.jdb-field:hover{background:linear-gradient(135deg,#eef2ff,#f5f3ff);border-left-color:var(--jdb-indigo);
			transform:translateX(2px);box-shadow:0 3px 10px rgba(79,70,229,.14);}
		.jdb-field:active{cursor:grabbing;}
		.jdb-grouphd{display:flex;align-items:center;gap:7px;font-size:.7rem;font-weight:800;color:var(--jdb-ink);
			text-transform:uppercase;letter-spacing:.06em;margin:14px 0 6px;}
		.jdb-grouphd::before{content:"";width:4px;height:13px;border-radius:3px;
			background:linear-gradient(180deg,var(--jdb-indigo),var(--jdb-violet));}
		.jdb-group:first-child .jdb-grouphd{margin-top:2px;}
		/* ── Editor + toolbar ─────────────────────────────────────── */
		.jdb-main{flex:1 1 460px;min-width:360px;}
		.jdb-toolbar{display:flex;flex-wrap:wrap;gap:3px;border:1px solid #e4e7f2;border-bottom:none;
			border-radius:14px 14px 0 0;background:linear-gradient(135deg,#eef2ff,#f5f3ff);padding:7px 9px;}
		.jdb-tb{border:1px solid transparent;background:#fff;border-radius:7px;min-width:30px;height:28px;
			cursor:pointer;font-size:.85rem;color:#4338ca;box-shadow:0 1px 2px rgba(49,46,129,.06);
			transition:all .12s ease;}
		.jdb-tb:hover{background:var(--jdb-indigo);border-color:var(--jdb-indigo);color:#fff;
			transform:translateY(-1px);box-shadow:0 3px 8px rgba(79,70,229,.28);}
		.jdb-editor{border:1px solid #e4e7f2;border-radius:0 0 14px 14px;min-height:380px;max-height:600px;
			overflow-y:auto;padding:16px 18px;background:#fff;font-size:.9rem;line-height:1.7;outline:none;
			white-space:pre-wrap;box-shadow:inset 0 1px 3px rgba(49,46,129,.04);}
		.jdb-editor:focus{border-color:#a5b4fc;box-shadow:0 0 0 3px rgba(79,70,229,.13);}
		.jd-token{display:inline-block;padding:2px 11px;margin:0 3px;border-radius:999px;
			background:linear-gradient(135deg,#eef2ff,#f5f3ff);color:#4338ca;
			border:1px solid #c7d2fe;font-size:.86em;font-weight:600;line-height:1.6;
			white-space:nowrap;user-select:none;box-shadow:0 1px 2px rgba(79,70,229,.1);}
		/* ── Live preview ─────────────────────────────────────────── */
		.jdb-preview-hd{display:flex;align-items:center;gap:7px;font-size:.72rem;font-weight:800;color:var(--jdb-ink);
			text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px;}
		.jdb-preview-hd::before{content:"";width:9px;height:9px;border-radius:50%;background:#22c55e;
			box-shadow:0 0 0 3px rgba(34,197,94,.2);}
		.jdb-preview{border:1px solid #e6e9f2;border-radius:12px;padding:6px 8px 4px;
			background:linear-gradient(180deg,#fbfbff,#fff);font-size:.9rem;line-height:1.6;
			box-shadow:0 4px 16px rgba(49,46,129,.06);}
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
			`<span style="color:#a5b4fc;font-size:.95em;">⠿</span>${frappe.utils.escape_html(f.label)}</div>`
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
					<div style="display:flex;align-items:center;gap:7px;font-size:.86rem;font-weight:800;color:#3730a3;margin-bottom:9px;">
						<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-size:.72rem;">✚</span>
						Insert Field
					</div>
					<input type="text" class="form-control jdb-search" placeholder="🔍 Search fields…" style="height:30px;font-size:.8rem;padding:2px 10px;" />
					<div style="font-size:.7rem;color:#8b90b8;margin-top:6px;">Drag into the body, or click to insert.</div>
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
