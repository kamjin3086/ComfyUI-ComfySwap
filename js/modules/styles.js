/**
 * ComfySwap - Styles Module
 * Contains all CSS styles for the plugin UI
 */

export const modalStyle = `
  .cs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .cs-modal {
    width: min(840px, 95vw);
    max-height: 90vh;
    overflow: auto;
    background: #1a1a1a;
    border-radius: 6px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
    color: #e0e0e0;
  }
  .cs-header {
    padding: 16px 20px;
    background: #252525;
    border-bottom: 1px solid #333;
  }
  .cs-header h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cs-header h3 svg { opacity: 0.7; }
  .cs-header-desc {
    font-size: 12px;
    color: #888;
    margin: 0;
  }
  .cs-body {
    padding: 16px 20px;
  }
  .cs-form-row {
    margin-bottom: 14px;
  }
  .cs-form-row label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #aaa;
  }
  .cs-form-row label .cs-label-hint {
    font-weight: 400;
    color: #666;
    font-size: 11px;
  }
  .cs-form-row input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #444;
    border-radius: 4px;
    font-size: 13px;
    color: #fff;
    background: #2a2a2a;
    transition: border-color 0.2s;
  }
  .cs-form-row input:focus {
    outline: none;
    border-color: #0af;
  }
  .cs-name-preview {
    margin-top: 6px;
    font-size: 11px;
    color: #666;
  }
  .cs-name-preview code {
    background: #333;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    color: #0af;
  }
  .cs-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .cs-section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #aaa;
  }
  .cs-section-title svg { color: #888; }
  .cs-param-count {
    font-size: 11px;
    color: #666;
    background: #333;
    padding: 2px 8px;
    border-radius: 3px;
  }
  .cs-info-box {
    background: #252525;
    border: 1px solid #333;
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 14px;
    font-size: 11px;
    color: #888;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .cs-info-box svg { flex-shrink: 0; margin-top: 1px; color: #666; }
  .cs-info-box p { margin: 0; line-height: 1.5; }
  .cs-table-container {
    border: 1px solid #333;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .cs-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .cs-table th {
    background: #252525;
    padding: 8px 10px;
    text-align: left;
    font-weight: 500;
    color: #888;
    border-bottom: 1px solid #333;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .cs-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #2a2a2a;
    color: #ccc;
    vertical-align: middle;
  }
  .cs-table tr:last-child td { border-bottom: none; }
  .cs-table tr:hover { background: #222; }
  .cs-table tr.cs-row-disabled { opacity: 0.4; }
  .cs-table input[type="text"] {
    width: 100%;
    padding: 5px 7px;
    border: 1px solid #444;
    border-radius: 3px;
    font-size: 12px;
    background: #2a2a2a;
    color: #fff;
  }
  .cs-table input[type="text"]:focus {
    outline: none;
    border-color: #0af;
  }
  .cs-table input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: #0af;
    cursor: pointer;
  }
  .cs-type {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
  }
  .cs-type.integer { background: #1e3a5f; color: #5cb3ff; }
  .cs-type.float { background: #3d3012; color: #f5b642; }
  .cs-type.string { background: #1a3d2e; color: #4ade80; }
  .cs-type.image { background: #3d1f3d; color: #f472b6; }
  .cs-type-icon { font-size: 9px; }
  .cs-node { 
    font-size: 10px; 
    color: #666; 
    font-family: monospace;
    background: #2a2a2a;
    padding: 2px 5px;
    border-radius: 2px;
  }
  .cs-empty { text-align: center; padding: 24px; color: #666; font-size: 12px; }
  .cs-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  .cs-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cs-btn-sm {
    padding: 4px 8px;
    font-size: 11px;
  }
  .cs-btn-outline {
    background: #2a2a2a;
    color: #ccc;
    border: 1px solid #444;
  }
  .cs-btn-outline:hover { 
    background: #333;
    border-color: #555;
  }
  .cs-btn-primary {
    background: #0af;
    color: #000;
  }
  .cs-btn-primary:hover { 
    background: #0cf;
  }
  .cs-btn-danger {
    background: #dc2626;
    color: #fff;
  }
  .cs-btn-danger:hover { 
    background: #ef4444;
  }
  .cs-footer {
    padding: 12px 20px;
    background: #252525;
    border-top: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .cs-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 10px 16px;
    background: #333;
    color: #fff;
    border-radius: 4px;
    font-size: 13px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 100000;
    animation: cs-slideIn 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cs-toast.success { background: #059669; }
  .cs-toast.error { background: #dc2626; }
  .cs-toast.warning { background: #d97706; }
  @keyframes cs-slideIn {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .cs-footer-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .cs-btn-link {
    background: none;
    color: #666;
    font-size: 11px;
    padding: 4px 8px;
  }
  .cs-btn-link:hover { color: #888; }
  .cs-more-panel {
    display: none;
    position: absolute;
    bottom: 50px;
    right: 20px;
    width: 320px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 4px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    z-index: 10;
  }
  .cs-more-panel.show { display: block; }
  .cs-more-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid #333;
    font-size: 12px;
    font-weight: 500;
    color: #ccc;
  }
  .cs-more-close {
    background: none;
    border: none;
    font-size: 16px;
    color: #666;
    cursor: pointer;
    padding: 0 4px;
  }
  .cs-more-close:hover { color: #888; }
  .cs-more-body { padding: 6px; }
  .cs-more-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .cs-more-item:hover { background: #252525; }
  .cs-more-item-info {
    flex: 1;
    min-width: 0;
  }
  .cs-more-item-info strong {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #ccc;
    font-weight: 500;
  }
  .cs-more-item-info span {
    font-size: 10px;
    color: #666;
    margin-top: 2px;
    display: block;
  }
  .cs-more-item-action {
    display: flex;
    gap: 5px;
  }
  .cs-more-item-action input {
    width: 120px;
    padding: 5px 7px;
    border: 1px solid #444;
    border-radius: 3px;
    font-size: 11px;
    background: #2a2a2a;
    color: #fff;
  }
  .cs-stats {
    display: flex;
    gap: 16px;
    padding: 10px 14px;
    background: #252525;
    border-radius: 4px;
    margin-bottom: 14px;
    border: 1px solid #333;
  }
  .cs-stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #888;
  }
  .cs-stat-value {
    font-weight: 600;
    color: #fff;
  }
  .cs-stat-icon { color: #666; }
  .cs-mode-section {
    margin-bottom: 14px;
  }
  .cs-mode-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
  }
  .cs-mode-tab {
    flex: 1;
    padding: 8px 12px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #888;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cs-mode-tab:hover { background: #333; color: #aaa; }
  .cs-mode-tab.active {
    background: #0af;
    border-color: #0af;
    color: #000;
  }
  .cs-mode-panel.hidden { display: none; }
  .cs-form-row select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #444;
    border-radius: 4px;
    font-size: 13px;
    color: #fff;
    background: #2a2a2a;
  }
  .cs-form-row select:focus {
    outline: none;
    border-color: #0af;
  }
  .cs-metadata {
    margin-bottom: 14px;
  }
  .cs-metadata-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: #252525;
    border: 1px solid #333;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    color: #888;
    width: 100%;
    text-align: left;
  }
  .cs-metadata-toggle:hover { background: #2a2a2a; }
  .cs-metadata-toggle svg { transition: transform 0.2s; }
  .cs-metadata-toggle.open svg { transform: rotate(90deg); }
  .cs-metadata-content {
    display: none;
    margin-top: 8px;
    padding: 10px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 4px;
    max-height: 300px;
    overflow: auto;
  }
  .cs-metadata-content.show { display: block; }
  .cs-metadata-content pre {
    margin: 0;
    font-size: 10px;
    line-height: 1.4;
    color: #aaa;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: 'Consolas', 'Monaco', monospace;
  }
  
  /* Connection Status Indicator */
  .cs-connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #252525;
    border: 1px solid #333;
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .cs-connection-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #666;
  }
  .cs-connection-dot.connected { background: #22c55e; }
  .cs-connection-dot.disconnected { background: #ef4444; }
  .cs-connection-dot.stale { background: #f59e0b; }
  .cs-connection-dot.none { background: #6b7280; }
  .cs-connection-dot.connecting { 
    background: #eab308; 
    animation: cs-pulse 1s infinite;
  }
  @keyframes cs-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  .cs-connection-info {
    flex: 1;
    font-size: 11px;
    color: #888;
  }
  .cs-connection-info strong {
    color: #ccc;
    font-weight: 500;
  }
  .cs-connection-detail {
    font-size: 10px;
    color: #666;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .cs-pending-badge {
    background: #0ea5e9;
    color: #fff;
    padding: 1px 6px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 500;
  }
  
  /* Instance List */
  .cs-instance-list {
    max-height: 150px;
    overflow-y: auto;
    margin-bottom: 14px;
  }
  .cs-no-instances {
    padding: 12px;
    text-align: center;
    color: #666;
    font-size: 11px;
    background: #252525;
    border: 1px dashed #444;
    border-radius: 4px;
  }
  .cs-instance-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: #252525;
    border: 1px solid #333;
    border-radius: 4px;
    margin-bottom: 4px;
    transition: border-color 0.2s;
  }
  .cs-instance-item:last-child { margin-bottom: 0; }
  .cs-instance-item.connected { border-color: #22c55e33; }
  .cs-instance-item.stale { border-color: #f59e0b33; opacity: 0.7; }
  .cs-instance-item .cs-connection-dot { flex-shrink: 0; }
  .cs-instance-info {
    flex: 1;
    min-width: 0;
  }
  .cs-instance-name {
    font-size: 12px;
    color: #ccc;
    font-weight: 500;
  }
  .cs-instance-status {
    font-size: 10px;
    color: #666;
    margin-top: 1px;
  }
  .cs-instance-badge {
    font-size: 9px;
    color: #888;
    background: #333;
    padding: 2px 6px;
    border-radius: 3px;
  }
`;

export const connectionStatusStyles = `
  .cs-connection-badge {
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(26, 26, 26, 0.9);
    border: 1px solid #333;
    border-radius: 20px;
    font-size: 11px;
    color: #888;
    z-index: 9999;
    cursor: pointer;
    transition: all 0.2s;
  }
  .cs-connection-badge:hover {
    background: rgba(37, 37, 37, 0.95);
    border-color: #444;
  }
  .cs-connection-badge .cs-connection-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .cs-connection-badge-text {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;
