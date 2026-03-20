/**
 * ComfySwap - Export Panel Module
 * Main export dialog for workflow synchronization
 */

import { 
  slugify, 
  generateWorkflowName, 
  detectCandidateParams, 
  mergeCandidates, 
  buildPayload,
  createEl 
} from './utils.js';
import { ensureStyles, showToast, renderRows, createConnectionStatusHTML, icons } from './ui-components.js';
import { getConnectionManager } from './connection-manager.js';

/**
 * Fetch existing workflows from both pending queue and connected Comfy-Swap instances
 * @returns {Promise<Array>}
 */
async function fetchExistingWorkflows() {
  const workflows = new Map();
  
  // 1. Get pending workflows (not yet synced)
  try {
    const cm = getConnectionManager();
    const pending = await cm.getPendingWorkflows();
    for (const wf of (pending || [])) {
      if (wf.id) {
        workflows.set(wf.id, { ...wf, source: "pending" });
      }
    }
  } catch (e) {
    console.warn("[ComfySwap] Failed to fetch pending workflows:", e);
  }
  
  // 2. Try to get synced workflows from the first connected Comfy-Swap instance
  // This uses the stored URL from localStorage (legacy support)
  const swapUrl = localStorage.getItem("comfy_swap_url") || "http://localhost:8189";
  try {
    const response = await fetch(`${swapUrl}/api/workflows`, {
      method: "GET",
      signal: AbortSignal.timeout(3000)
    });
    if (response.ok) {
      const synced = await response.json();
      for (const wf of (synced || [])) {
        if (wf.id && !workflows.has(wf.id)) {
          workflows.set(wf.id, { ...wf, source: "synced" });
        }
      }
    }
  } catch (e) {
    // Comfy-Swap server might not be reachable, that's okay
    console.debug("[ComfySwap] Could not fetch synced workflows:", e.message);
  }
  
  return Array.from(workflows.values());
}

/**
 * Generate the modal HTML template
 * @param {Object} options 
 * @returns {string}
 */
function generateModalHTML(options) {
  const { state, nodeCount, paramCount, existingWorkflows } = options;
  
  return `
    <div class="cs-header">
      <h3>
        ${icons.upload}
        Export to Comfy-Swap
      </h3>
      <p class="cs-header-desc">Make this workflow callable via API and CLI</p>
    </div>
    <div class="cs-body">
      ${createConnectionStatusHTML()}
      
      <div class="cs-stats">
        <div class="cs-stat">
          <svg class="cs-stat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          </svg>
          <span>Nodes: <span class="cs-stat-value">${nodeCount}</span></span>
        </div>
        <div class="cs-stat">
          <svg class="cs-stat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06"/>
          </svg>
          <span>Detected Params: <span class="cs-stat-value">${paramCount}</span></span>
        </div>
      </div>
      
      <div class="cs-mode-section">
        <div class="cs-mode-tabs">
          <button class="cs-mode-tab active" data-mode="create">Create New</button>
          <button class="cs-mode-tab" data-mode="update">Update Existing</button>
        </div>
        
        <div class="cs-mode-panel" id="cs-mode-create">
          <div class="cs-form-row">
            <label>Workflow Name</label>
            <input id="cs-name" value="${state.name}" placeholder="e.g. portrait-flux-1024" />
            <div class="cs-name-preview">API ID: <code id="cs-id-preview">${slugify(state.name)}</code></div>
          </div>
        </div>
        
        <div class="cs-mode-panel hidden" id="cs-mode-update">
          <div class="cs-form-row">
            <label>Select Workflow to Update</label>
            <select id="cs-existing-select">
              ${existingWorkflows.length === 0 
                ? '<option value="">No workflows found</option>'
                : existingWorkflows.map(w => {
                    const label = w.name || w.id;
                    const badge = w.source === "pending" ? " [pending]" : "";
                    return `<option value="${w.id}">${label}${badge}</option>`;
                  }).join('')}
            </select>
          </div>
          <div class="cs-form-row">
            <label>New Name <span class="cs-label-hint">(optional, leave empty to keep current)</span></label>
            <input id="cs-update-name" value="" placeholder="Leave empty to keep existing name" />
          </div>
        </div>
      </div>
      
      <div class="cs-section-header">
        <div class="cs-section-title">
          ${icons.settings}
          API Parameters
        </div>
        <span class="cs-param-count" id="cs-selected-count">${paramCount} selected</span>
      </div>
      
      <div class="cs-actions">
        <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-add-all" title="Add all configurable input parameters from workflow">
          ${icons.add}
          Add All
        </button>
        <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-merge" title="Merge selected parameters into one (changes sync together)">
          ${icons.merge}
          Merge Selected
        </button>
      </div>
      <div class="cs-table-container">
        <table class="cs-table">
          <thead>
            <tr>
              <th style="width:28px;text-align:center;">
                <input type="checkbox" id="cs-select-all" checked title="Select/Deselect All"/>
              </th>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody id="cs-body"></tbody>
        </table>
      </div>
      
      <div class="cs-metadata">
        <button class="cs-metadata-toggle" id="cs-metadata-toggle">
          ${icons.chevron}
          View Raw Workflow JSON (for debugging)
        </button>
        <div class="cs-metadata-content" id="cs-metadata-content">
          <pre id="cs-metadata-json"></pre>
        </div>
      </div>
    </div>
    <div class="cs-footer">
      <button class="cs-btn cs-btn-outline" id="cs-cancel">
        ${icons.close}
        Cancel
      </button>
      <div class="cs-footer-right">
        <button class="cs-btn cs-btn-link" id="cs-more" title="More options">More ▾</button>
        <button class="cs-btn cs-btn-primary" id="cs-save">
          ${icons.swap}
          Swap
        </button>
      </div>
    </div>
    <div class="cs-more-panel" id="cs-more-panel">
      <div class="cs-more-header">
        <span>Export Options</span>
        <button class="cs-more-close" id="cs-more-close">×</button>
      </div>
      <div class="cs-more-body">
        <div class="cs-more-item">
          <div class="cs-more-item-info">
            <strong>
              ${icons.copy}
              Export JSON
            </strong>
            <span>Copy to clipboard for manual import</span>
          </div>
          <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-copy">Copy</button>
        </div>
        <div class="cs-more-item">
          <div class="cs-more-item-info">
            <strong>
              ${icons.download}
              Export File
            </strong>
            <span>Download .json file for backup or transfer</span>
          </div>
          <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-download">Export</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup all event handlers for the export panel
 * @param {HTMLElement} modal 
 * @param {HTMLElement} overlay 
 * @param {Object} state 
 * @param {Object} promptObj 
 * @param {Array} existingWorkflows
 */
function setupEventHandlers(modal, overlay, state, promptObj, existingWorkflows) {
  const cm = getConnectionManager();
  
  const body = modal.querySelector("#cs-body");
  const selectedCount = modal.querySelector("#cs-selected-count");
  const selectAllCheckbox = modal.querySelector("#cs-select-all");
  const nameInput = modal.querySelector("#cs-name");
  const idPreview = modal.querySelector("#cs-id-preview");
  const existingSelect = modal.querySelector("#cs-existing-select");
  const updateNameInput = modal.querySelector("#cs-update-name");
  const modeTabs = modal.querySelectorAll(".cs-mode-tab");
  const modeCreatePanel = modal.querySelector("#cs-mode-create");
  const modeUpdatePanel = modal.querySelector("#cs-mode-update");
  
  const updateSelectedCount = () => {
    const count = state.mapping.filter(m => m.selected !== false).length;
    selectedCount.textContent = `${count} selected`;
  };
  
  const refresh = () => { 
    body.innerHTML = renderRows(state); 
    updateSelectedCount();
  };
  refresh();

  // Mode tab switching
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.mode = tab.dataset.mode;
      
      if (state.mode === "create") {
        modeCreatePanel.classList.remove("hidden");
        modeUpdatePanel.classList.add("hidden");
      } else {
        modeCreatePanel.classList.add("hidden");
        modeUpdatePanel.classList.remove("hidden");
        if (existingSelect.value && !state.existingId) {
          state.existingId = existingSelect.value;
        }
      }
    });
  });

  // Name input
  nameInput.addEventListener("input", () => {
    state.name = nameInput.value.trim();
    idPreview.textContent = slugify(state.name);
  });

  // Existing workflow select
  existingSelect.addEventListener("change", () => {
    state.existingId = existingSelect.value;
    const selected = existingWorkflows.find(w => w.id === existingSelect.value);
    if (selected && !updateNameInput.value) {
      updateNameInput.placeholder = `Current: ${selected.name || selected.id}`;
    }
  });

  // Update name input
  updateNameInput.addEventListener("input", () => {
    state.name = updateNameInput.value.trim();
  });

  // Select all checkbox
  selectAllCheckbox.addEventListener("change", () => {
    const checked = selectAllCheckbox.checked;
    state.mapping.forEach(m => m.selected = checked);
    refresh();
  });

  // Close handlers
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  modal.querySelector("#cs-cancel").addEventListener("click", () => overlay.remove());

  // Metadata toggle
  const metadataToggle = modal.querySelector("#cs-metadata-toggle");
  const metadataContent = modal.querySelector("#cs-metadata-content");
  const metadataJson = modal.querySelector("#cs-metadata-json");
  metadataJson.textContent = JSON.stringify(promptObj, null, 2);
  
  metadataToggle.addEventListener("click", () => {
    metadataToggle.classList.toggle("open");
    metadataContent.classList.toggle("show");
  });

  // Split parameter (via data attribute)
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

  // Input handlers for parameter editing
  body.addEventListener("input", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const i = Number(input.dataset.i);
    const item = state.mapping[i];
    if (!item) return;
    if (input.dataset.k === "name") item.name = input.value.trim();
    if (input.dataset.k === "default") item.default = input.value;
    if (input.dataset.k === "desc") item.description = input.value;
  });

  // Checkbox change handlers
  body.addEventListener("change", e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const i = Number(input.dataset.i);
    const item = state.mapping[i];
    if (item && input.dataset.k === "sel") {
      item.selected = input.checked;
      updateSelectedCount();
      input.closest("tr")?.classList.toggle("cs-row-disabled", !input.checked);
    }
  });

  // Merge button
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

  // Add all button
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
    if (state.mode === "create") {
      state.name = modal.querySelector("#cs-name").value.trim();
      if (!state.name) { 
        alert("Please enter a workflow name."); 
        return null; 
      }
    } else {
      // Update mode
      state.existingId = modal.querySelector("#cs-existing-select").value;
      if (!state.existingId) { 
        alert("Please select a workflow to update."); 
        return null; 
      }
      const newName = modal.querySelector("#cs-update-name").value.trim();
      if (newName) {
        state.name = newName;
      } else {
        const existing = existingWorkflows.find(w => w.id === state.existingId);
        state.name = existing?.name || state.existingId;
      }
    }
    
    const selected = state.mapping.filter(m => m.selected !== false);
    if (!selected.length) { 
      alert("Please select at least one parameter."); 
      return null; 
    }
    
    return buildPayload(state, promptObj);
  }

  // Main swap button - add to pending queue for Comfy-Swap to pick up
  modal.querySelector("#cs-save").addEventListener("click", async () => {
    const payload = validate();
    if (!payload) return;
    
    try {
      await cm.addPendingWorkflow(payload);
      
      // Show appropriate toast based on connection status and mode
      const action = state.mode === "create" ? "created" : "updated";
      if (cm.hasActiveInstance()) {
        const count = cm.getActiveCount();
        const msg = count === 1 
          ? `"${state.name}" ${action}!` 
          : `"${state.name}" ${action} (${count} instances)`;
        showToast(msg, "success");
      } else {
        showToast(`"${state.name}" queued (waiting for connection)`, "warning");
      }
      
      overlay.remove();
    } catch (e) {
      showToast(`Queue failed: ${e.message}`, "error");
    }
  });

  // More panel toggle
  const morePanel = modal.querySelector("#cs-more-panel");
  
  modal.querySelector("#cs-more").addEventListener("click", () => {
    morePanel.classList.toggle("show");
  });
  modal.querySelector("#cs-more-close").addEventListener("click", () => {
    morePanel.classList.remove("show");
  });

  // Export JSON (copy)
  modal.querySelector("#cs-copy").addEventListener("click", async () => {
    const payload = validate();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      showToast("Exported to clipboard!", "success");
      morePanel.classList.remove("show");
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  });

  // Export File (download)
  modal.querySelector("#cs-download").addEventListener("click", () => {
    const payload = validate();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${payload.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast(`Exported ${payload.id}.json`, "success");
    morePanel.classList.remove("show");
  });

  // Connection status refresh
  setupConnectionStatusHandlers(modal);
}

/**
 * Setup handlers for the connection status section in the modal
 * @param {HTMLElement} modal 
 */
function setupConnectionStatusHandlers(modal) {
  const cm = getConnectionManager();
  
  // Refresh status button
  modal.querySelector("#cs-refresh-status")?.addEventListener("click", async () => {
    await cm.refresh();
    refreshConnectionStatus(modal);
  });
}

/**
 * Refresh the connection status section
 * @param {HTMLElement} modal 
 */
function refreshConnectionStatus(modal) {
  const oldStatus = modal.querySelector(".cs-connection-status");
  const oldInstanceList = modal.querySelector(".cs-instance-list");
  
  if (!oldStatus) return;
  
  // Create new HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = createConnectionStatusHTML();
  
  const newStatus = tempDiv.querySelector(".cs-connection-status");
  const newInstanceList = tempDiv.querySelector(".cs-instance-list");
  
  if (newStatus) oldStatus.replaceWith(newStatus);
  if (oldInstanceList && newInstanceList) oldInstanceList.replaceWith(newInstanceList);
  
  setupConnectionStatusHandlers(modal);
}

/**
 * Open the mapping panel (main export dialog)
 * @param {Object} promptObj - ComfyUI workflow prompt object
 * @param {Array} initialMapping - Initial parameter mapping
 */
export async function openMappingPanel(promptObj, initialMapping) {
  ensureStyles();

  const existingWorkflows = await fetchExistingWorkflows();
  const autoName = generateWorkflowName(promptObj);
  
  const state = {
    mode: "create",
    name: autoName,
    existingId: "",
    mapping: initialMapping.map(m => ({ ...m, selected: true })),
  };

  const nodeCount = Object.keys(promptObj || {}).length;
  const paramCount = initialMapping.length;

  const overlay = createEl("div", { class: "cs-overlay" });
  const modal = createEl("div", { class: "cs-modal" });
  
  modal.innerHTML = generateModalHTML({ state, nodeCount, paramCount, existingWorkflows });
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setupEventHandlers(modal, overlay, state, promptObj, existingWorkflows);
}

/**
 * Main entry point - open the ComfySwap export dialog
 * @param {Function} graphToPrompt - Function to get the current workflow
 */
export async function openComfySwapExport(graphToPrompt) {
  let exported;
  try {
    exported = await graphToPrompt();
  } catch (e) {
    alert(`Swap failed: ${e.message}`);
    return;
  }
  
  const promptObj = exported?.output || exported;
  if (!promptObj || Object.keys(promptObj).length === 0) {
    alert("No workflow to swap. Please create a workflow first.");
    return;
  }
  
  const candidates = detectCandidateParams(promptObj);
  const initialMapping = mergeCandidates(candidates);
  openMappingPanel(promptObj, initialMapping);
}
