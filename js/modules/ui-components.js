/**
 * ComfySwap - UI Components Module
 * Contains reusable UI components like toast notifications, status indicators, etc.
 */

import { createEl, getTypeIcon } from './utils.js';
import { modalStyle, connectionStatusStyles } from './styles.js';
import { getConnectionManager, ConnectionState, ConnectionEvents } from './connection-manager.js';

/**
 * Ensure styles are injected into the document
 */
export function ensureStyles() {
  if (!document.getElementById("cs-style")) {
    const style = document.createElement("style");
    style.id = "cs-style";
    style.textContent = modalStyle + connectionStatusStyles;
    document.head.appendChild(style);
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: "success", "error", "warning", or ""
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, type = "", duration = 3000) {
  const existing = document.querySelector(".cs-toast");
  if (existing) existing.remove();
  
  const toast = createEl("div", { class: `cs-toast ${type}` });
  
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  
  const icon = icons[type] || '';
  toast.innerHTML = icon + message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), duration);
}

/**
 * Render parameter table rows
 * @param {Object} state - Current state object
 * @returns {string} HTML string
 */
export function renderRows(state) {
  if (state.mapping.length === 0) {
    return `<tr><td colspan="6" class="cs-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;opacity:0.5;">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <br/>No mappable parameters detected<br/>
      <span style="font-size:11px;color:#94a3b8;">Click "+ Add All" to add all input parameters</span>
    </td></tr>`;
  }
  
  return state.mapping.map((p, i) => {
    const nodeIds = (p.targets || []).map(t => t.node_id).join(", ");
    const rowClass = p.selected === false ? "cs-row-disabled" : "";
    const descValue = p.description || "";
    return `
    <tr class="${rowClass}">
      <td style="width:28px;text-align:center;">
        <input type="checkbox" data-k="sel" data-i="${i}" ${p.selected !== false ? "checked" : ""} title="Select to include in API"/>
      </td>
      <td style="width:100px;">
        <input type="text" data-k="name" data-i="${i}" value="${p.name}" placeholder="name"/>
      </td>
      <td style="width:60px;">
        <span class="cs-type ${p.type}">
          <span class="cs-type-icon">${getTypeIcon(p.type)}</span>
          ${p.type}
        </span>
      </td>
      <td style="width:120px;">
        <input type="text" data-k="default" data-i="${i}" value="${String(p.default ?? "")}" placeholder="default"/>
      </td>
      <td style="width:140px;">
        <input type="text" data-k="desc" data-i="${i}" value="${descValue}" placeholder="description"/>
      </td>
      <td style="width:70px;">
        <span class="cs-node" title="Mapped ComfyUI node">Node ${nodeIds}</span>
      </td>
    </tr>`;
  }).join("");
}

/**
 * Format time ago string
 * @param {number} seconds 
 * @returns {string}
 */
function formatTimeAgo(seconds) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/**
 * Create connection status indicator HTML
 * @returns {string} HTML string
 */
export function createConnectionStatusHTML() {
  const cm = getConnectionManager();
  const instances = cm.getInstances();
  const activeCount = cm.getActiveCount();
  const summary = cm.getConnectionSummary();
  
  let statusClass = "none";
  let statusText = "Waiting for connection...";
  
  if (activeCount > 0) {
    statusClass = "connected";
    statusText = activeCount === 1 
      ? "1 instance connected" 
      : `${activeCount} instances connected`;
  } else if (instances.length > 0) {
    statusClass = "stale";
    statusText = "Connection idle";
  }
  
  const instanceList = instances.length === 0 
    ? '<div class="cs-no-instances">Workflows will sync when Comfy-Swap connects</div>'
    : instances.map(inst => {
        const stateClass = inst.connected ? "connected" : "stale";
        const statusStr = inst.connected 
          ? `Active (${formatTimeAgo(inst.last_seen_ago)})`
          : `Inactive (${formatTimeAgo(inst.last_seen_ago)})`;
        
        return `
          <div class="cs-instance-item ${stateClass}">
            <div class="cs-connection-dot ${stateClass}"></div>
            <div class="cs-instance-info">
              <div class="cs-instance-name">${inst.name}</div>
              <div class="cs-instance-status">${statusStr}</div>
            </div>
            <div class="cs-instance-badge">${inst.request_count} reqs</div>
          </div>
        `;
      }).join("");
  
  const pendingBadge = summary.pendingCount > 0 
    ? `<span class="cs-pending-badge">${summary.pendingCount} pending</span>` 
    : '';
  
  return `
    <div class="cs-connection-status">
      <div class="cs-connection-dot ${statusClass}"></div>
      <div class="cs-connection-info">
        <strong>Comfy-Swap Connection</strong>
        <div class="cs-connection-detail">${statusText} ${pendingBadge}</div>
      </div>
      <button class="cs-btn cs-btn-outline cs-btn-sm" id="cs-refresh-status" title="Refresh status">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>
    <div class="cs-instance-list">${instanceList}</div>
  `;
}

/**
 * Create and show a floating connection status badge
 */
export function createConnectionBadge() {
  ensureStyles();
  
  // Remove existing badge if any
  const existing = document.querySelector(".cs-connection-badge");
  if (existing) existing.remove();
  
  const cm = getConnectionManager();
  const badge = createEl("div", { class: "cs-connection-badge" });
  
  const updateBadge = () => {
    const state = cm.getOverallState();
    const activeCount = cm.getActiveCount();
    const pendingCount = cm.getConnectionSummary().pendingCount;
    
    let statusClass = "none";
    let text = "Waiting...";
    
    if (state === ConnectionState.ACTIVE) {
      statusClass = "connected";
      text = activeCount === 1 ? "1 instance" : `${activeCount} instances`;
    } else if (state === ConnectionState.STALE) {
      statusClass = "stale";
      text = "Idle";
    }
    
    const pendingText = pendingCount > 0 ? ` (${pendingCount} pending)` : '';
    
    badge.innerHTML = `
      <div class="cs-connection-dot ${statusClass}"></div>
      <span class="cs-connection-badge-text">ComfySwap: ${text}${pendingText}</span>
    `;
  };
  
  updateBadge();
  
  // Listen for connection changes
  cm.on(ConnectionEvents.INSTANCES_UPDATED, updateBadge);
  
  // Click to refresh and show brief status
  badge.addEventListener("click", async () => {
    await cm.refresh();
    updateBadge();
  });
  
  document.body.appendChild(badge);
  
  return badge;
}

/**
 * Remove the connection badge
 */
export function removeConnectionBadge() {
  const badge = document.querySelector(".cs-connection-badge");
  if (badge) badge.remove();
}

/**
 * Icons used in UI
 */
export const icons = {
  upload: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  swap: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  add: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  merge: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
  send: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
  refresh: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>'
};
