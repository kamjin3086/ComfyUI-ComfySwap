import { app } from "../../scripts/app.js";

console.log("[ComfySwap] Plugin loading...");

// ============================================================
// Utility Functions
// ============================================================

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function detectCandidateParams(prompt) {
  const list = [];
  for (const [nodeId, node] of Object.entries(prompt || {})) {
    const classType = node.class_type || "";
    const inputs = node.inputs || {};
    for (const key of Object.keys(inputs)) {
      const value = inputs[key];
      if (Array.isArray(value)) continue;
      
      if (["text", "seed", "steps", "cfg", "scheduler", "sampler_name", "denoise", "width", "height", "image", "positive", "negative", "ckpt_name", "vae_name", "clip_skip", "batch_size"].includes(key)) {
        let type = "string";
        if (["seed", "steps", "width", "height", "batch_size", "clip_skip"].includes(key)) type = "integer";
        else if (["denoise", "cfg"].includes(key)) type = "float";
        else if (key === "image") type = "image";
        
        list.push({
          name: key,
          type,
          node_id: String(nodeId),
          field: key,
          class_type: classType,
          default: value,
        });
      }
    }
  }
  return list;
}

function mergeCandidates(candidates) {
  const map = new Map();
  for (const c of candidates) {
    const key = `${c.name}:${c.type}`;
    if (!map.has(key)) {
      map.set(key, {
        name: c.name,
        type: c.type,
        default: c.default ?? "",
        targets: [],
      });
    }
    map.get(key).targets.push({ node_id: c.node_id, field: c.field });
  }
  return Array.from(map.values());
}

function createEl(tag, attrs = {}, text = "") {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
}

// ============================================================
// Styles
// ============================================================

const modalStyle = `
  .cs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .cs-modal {
    width: min(720px, 95vw);
    max-height: 90vh;
    overflow: auto;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  }
  .cs-header {
    padding: 20px 24px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 16px 16px 0 0;
  }
  .cs-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
  }
  .cs-body {
    padding: 20px 24px;
  }
  .cs-form-row {
    margin-bottom: 16px;
  }
  .cs-form-row label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
  }
  .cs-form-row input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #1e293b;
    background: #ffffff;
  }
  .cs-form-row input:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .cs-table-container {
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .cs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .cs-table th {
    background: #f1f5f9;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    font-size: 11px;
    text-transform: uppercase;
  }
  .cs-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  .cs-table tr:last-child td { border-bottom: none; }
  .cs-table tr:hover { background: #f8fafc; }
  .cs-table input[type="text"] {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 12px;
  }
  .cs-table input[type="text"]:focus {
    outline: none;
    border-color: #3b82f6;
  }
  .cs-table input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #3b82f6;
  }
  .cs-type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }
  .cs-type.integer { background: #dbeafe; color: #1d4ed8; }
  .cs-type.float { background: #fef3c7; color: #b45309; }
  .cs-type.string { background: #d1fae5; color: #047857; }
  .cs-type.image { background: #fce7f3; color: #be185d; }
  .cs-node { font-size: 11px; color: #64748b; font-family: monospace; }
  .cs-empty { text-align: center; padding: 30px; color: #94a3b8; font-size: 13px; }
  .cs-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  .cs-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .cs-btn-sm {
    padding: 4px 10px;
    font-size: 11px;
  }
  .cs-btn-outline {
    background: #fff;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  .cs-btn-outline:hover { background: #f8fafc; }
  .cs-btn-primary {
    background: #3b82f6;
    color: white;
  }
  .cs-btn-primary:hover { background: #2563eb; }
  .cs-footer {
    padding: 16px 24px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    border-radius: 0 0 16px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cs-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 18px;
    background: #1e293b;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 100000;
    animation: cs-slideIn 0.3s ease;
  }
  .cs-toast.success { background: #059669; }
  .cs-toast.error { background: #dc2626; }
  @keyframes cs-slideIn {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .cs-footer-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cs-btn-link {
    background: none;
    color: #94a3b8;
    font-size: 12px;
    padding: 6px 10px;
  }
  .cs-btn-link:hover { color: #64748b; }
  .cs-more-panel {
    display: none;
    position: absolute;
    bottom: 60px;
    right: 24px;
    width: 320px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    z-index: 10;
  }
  .cs-more-panel.show { display: block; }
  .cs-more-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }
  .cs-more-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #94a3b8;
    cursor: pointer;
    padding: 0 4px;
  }
  .cs-more-close:hover { color: #64748b; }
  .cs-more-body { padding: 8px; }
  .cs-more-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 6px;
  }
  .cs-more-item:hover { background: #f8fafc; }
  .cs-more-item-info {
    flex: 1;
    min-width: 0;
  }
  .cs-more-item-info strong {
    display: block;
    font-size: 13px;
    color: #1e293b;
  }
  .cs-more-item-info span {
    font-size: 11px;
    color: #94a3b8;
  }
  .cs-more-item-action {
    display: flex;
    gap: 6px;
  }
  .cs-more-item-action input {
    width: 130px;
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 11px;
  }
`;

// ============================================================
// Main Functions
// ============================================================

async function openComfySwapExport() {
  let exported;
  try {
    exported = await app.graphToPrompt();
  } catch (e) {
    alert(`Export failed: ${e.message}`);
    return;
  }
  const promptObj = exported?.output || exported;
  if (!promptObj || Object.keys(promptObj).length === 0) {
    alert("No workflow to export. Please create a workflow first.");
    return;
  }
  const candidates = detectCandidateParams(promptObj);
  const initialMapping = mergeCandidates(candidates);
  openMappingPanel(promptObj, initialMapping);
}

function showToast(message, type = "") {
  const existing = document.querySelector(".cs-toast");
  if (existing) existing.remove();
  const toast = createEl("div", { class: `cs-toast ${type}` }, message);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderRows(state) {
  if (state.mapping.length === 0) {
    return `<tr><td colspan="5" class="cs-empty">
      No parameters detected. Click "Add All" to see all inputs.
    </td></tr>`;
  }
  return state.mapping.map((p, i) => {
    const nodeIds = (p.targets || []).map(t => t.node_id).join(", ");
    return `
    <tr>
      <td style="width:32px;text-align:center;">
        <input type="checkbox" data-k="sel" data-i="${i}" ${p.selected !== false ? "checked" : ""}/>
      </td>
      <td style="width:120px;">
        <input type="text" data-k="name" data-i="${i}" value="${p.name}"/>
      </td>
      <td style="width:60px;"><span class="cs-type ${p.type}">${p.type}</span></td>
      <td><input type="text" data-k="default" data-i="${i}" value="${String(p.default ?? "")}"/></td>
      <td style="width:80px;"><span class="cs-node">Node ${nodeIds}</span></td>
    </tr>`;
  }).join("");
}

function buildPayload(state, promptObj) {
  const id = slugify(state.name);
  const selectedParams = state.mapping.filter(m => m.selected !== false);
  return {
    id,
    name: state.name,
    comfyui_workflow: promptObj,
    param_mapping: selectedParams.map(m => ({
      name: m.name,
      type: m.type,
      default: m.default,
      targets: m.targets,
    })),
  };
}

function openMappingPanel(promptObj, initialMapping) {
  if (!document.getElementById("cs-style")) {
    const style = document.createElement("style");
    style.id = "cs-style";
    style.textContent = modalStyle;
    document.head.appendChild(style);
  }

  const state = {
    name: "my-workflow",
    mapping: initialMapping.map(m => ({ ...m, selected: true })),
  };

  const overlay = createEl("div", { class: "cs-overlay" });
  const modal = createEl("div", { class: "cs-modal" });
  modal.innerHTML = `
    <div class="cs-header">
      <h3>Export to Comfy-Swap</h3>
    </div>
    <div class="cs-body">
      <div class="cs-form-row">
        <label>Workflow Name</label>
        <input id="cs-name" value="${state.name}" placeholder="my-workflow" />
      </div>
      <div class="cs-form-row">
        <label>API Parameters</label>
      </div>
      <div class="cs-actions">
        <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-add-all">+ Add All</button>
        <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-merge">Merge Selected</button>
      </div>
      <div class="cs-table-container">
        <table class="cs-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody id="cs-body"></tbody>
        </table>
      </div>
    </div>
    <div class="cs-footer">
      <button class="cs-btn cs-btn-outline" id="cs-cancel">Cancel</button>
      <div class="cs-footer-right">
        <button class="cs-btn cs-btn-link" id="cs-more" title="More export options">More ▾</button>
        <button class="cs-btn cs-btn-primary" id="cs-save">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save
        </button>
      </div>
    </div>
    <div class="cs-more-panel" id="cs-more-panel">
      <div class="cs-more-header">
        <span>Other Export Methods</span>
        <button class="cs-more-close" id="cs-more-close">×</button>
      </div>
      <div class="cs-more-body">
        <div class="cs-more-item">
          <div class="cs-more-item-info">
            <strong>Direct Send</strong>
            <span>Send to Comfy-Swap server directly</span>
          </div>
          <div class="cs-more-item-action">
            <input id="cs-url" value="" placeholder="http://localhost:8189" />
            <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-send">Send</button>
          </div>
        </div>
        <div class="cs-more-item">
          <div class="cs-more-item-info">
            <strong>Copy JSON</strong>
            <span>Copy and paste in Comfy-Swap web UI</span>
          </div>
          <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-copy">Copy</button>
        </div>
        <div class="cs-more-item">
          <div class="cs-more-item-info">
            <strong>Download File</strong>
            <span>Download .json for manual upload</span>
          </div>
          <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-download">Download</button>
        </div>
      </div>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const body = modal.querySelector("#cs-body");
  const refresh = () => { body.innerHTML = renderRows(state); };
  refresh();

  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  modal.querySelector("#cs-cancel").addEventListener("click", () => overlay.remove());

  body.addEventListener("click", e => {
    const btn = e.target;
    if (btn.dataset?.k === "split") {
      const i = Number(btn.dataset.i);
      const item = state.mapping[i];
      if (!item?.targets || item.targets.length <= 1) return;
      const first = { ...item, targets: [item.targets[0]] };
      const rest = item.targets.slice(1).map((t, idx) => ({
        ...item,
        name: `${item.name}_${idx + 2}`,
        targets: [t],
      }));
      state.mapping.splice(i, 1, first, ...rest);
      refresh();
    }
  });

  body.addEventListener("input", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const i = Number(input.dataset.i);
    const item = state.mapping[i];
    if (!item) return;
    if (input.dataset.k === "name") item.name = input.value.trim();
    if (input.dataset.k === "default") item.default = input.value;
  });

  body.addEventListener("change", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const i = Number(input.dataset.i);
    const item = state.mapping[i];
    if (item && input.dataset.k === "sel") item.selected = input.checked;
  });

  modal.querySelector("#cs-merge").addEventListener("click", () => {
    const sel = state.mapping.map((m, i) => [m, i]).filter(([m]) => m.selected).map(([, i]) => i);
    if (sel.length < 2) { alert("Select at least 2 parameters to merge."); return; }
    const base = state.mapping[sel[0]];
    for (let k = sel.length - 1; k >= 1; k--) {
      base.targets = [...base.targets, ...(state.mapping[sel[k]].targets || [])];
      state.mapping.splice(sel[k], 1);
    }
    refresh();
  });

  modal.querySelector("#cs-add-all").addEventListener("click", () => {
    let added = 0;
    for (const [nodeId, node] of Object.entries(promptObj || {})) {
      for (const [key, value] of Object.entries(node.inputs || {})) {
        if (Array.isArray(value)) continue;
        if (state.mapping.some(m => m.targets.some(t => t.node_id === String(nodeId) && t.field === key))) continue;
        let type = "string";
        if (typeof value === "number") type = Number.isInteger(value) ? "integer" : "float";
        state.mapping.push({
          name: `${key}_${nodeId}`,
          type,
          default: value,
          targets: [{ node_id: String(nodeId), field: key }],
          selected: false,
        });
        added++;
      }
    }
    refresh();
    if (added) showToast(`Added ${added} inputs`, "success");
  });

  // Validate helper
  function validate() {
    state.name = modal.querySelector("#cs-name").value.trim();
    if (!state.name) { alert("Please enter a workflow name."); return null; }
    const selected = state.mapping.filter(m => m.selected !== false);
    if (!selected.length) { alert("Please select at least one parameter."); return null; }
    return buildPayload(state, promptObj);
  }

  // Save (main action)
  modal.querySelector("#cs-save").addEventListener("click", async () => {
    const payload = validate();
    if (!payload) return;
    try {
      const r = await fetch("/comfyswap/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      showToast(`"${state.name}" saved!`, "success");
      overlay.remove();
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  });

  // More panel toggle
  const morePanel = modal.querySelector("#cs-more-panel");
  const urlInput = modal.querySelector("#cs-url");
  urlInput.value = localStorage.getItem("comfy_swap_url") || "http://localhost:8189";
  
  modal.querySelector("#cs-more").addEventListener("click", () => {
    morePanel.classList.toggle("show");
  });
  modal.querySelector("#cs-more-close").addEventListener("click", () => {
    morePanel.classList.remove("show");
  });

  // Direct send
  modal.querySelector("#cs-send").addEventListener("click", async () => {
    const payload = validate();
    if (!payload) return;
    const url = urlInput.value.trim();
    if (!url) { alert("Please enter Comfy-Swap URL."); return; }
    try {
      let r = await fetch(`${url}/api/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.status === 409) {
        r = await fetch(`${url}/api/workflows/${encodeURIComponent(payload.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!r.ok) throw new Error(await r.text());
      localStorage.setItem("comfy_swap_url", url);
      showToast(`Sent to ${url}`, "success");
      morePanel.classList.remove("show");
    } catch (e) {
      alert(`Send failed: ${e.message}`);
    }
  });

  // Copy JSON
  modal.querySelector("#cs-copy").addEventListener("click", async () => {
    const payload = validate();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast("JSON copied!", "success");
      morePanel.classList.remove("show");
    } catch (e) {
      alert(`Copy failed: ${e.message}`);
    }
  });

  // Download
  modal.querySelector("#cs-download").addEventListener("click", () => {
    const payload = validate();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${payload.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Downloaded ${payload.id}.json`, "success");
    morePanel.classList.remove("show");
  });
}

// ============================================================
// Register Extension
// ============================================================

app.registerExtension({
  name: "ComfySwap",
  commands: [{ id: "comfyswap.export", label: "Export to ComfySwap", function: openComfySwapExport }],
  menuCommands: [{ path: ["Workflow"], commands: ["comfyswap.export"] }],
  getCanvasMenuItems() {
    return [null, { content: "Export to ComfySwap", callback: openComfySwapExport }];
  },
});

console.log("[ComfySwap] Plugin loaded. Access: Workflow menu or right-click canvas.");
