/**
 * ComfySwap - ComfyUI Extension
 * 
 * Main entry point for the ComfySwap plugin.
 * Enables workflow export to Comfy-Swap servers.
 * 
 * Architecture:
 * - Comfy-Swap servers connect TO this plugin (plugin is passive)
 * - Plugin tracks which instances are connected via their polling requests
 * - Workflows are queued locally, Comfy-Swap instances poll and fetch them
 */

import { app } from "../../scripts/app.js";
import { openComfySwapExport } from "./modules/export-panel.js";
import { createConnectionBadge, ensureStyles } from "./modules/ui-components.js";
import { initConnectionManager, ConnectionEvents } from "./modules/connection-manager.js";

console.log("[ComfySwap] Plugin loading...");

/**
 * Initialize the plugin
 */
async function initPlugin() {
  ensureStyles();
  
  // Initialize connection manager (starts polling for instance status)
  const cm = await initConnectionManager();
  
  // Create the floating connection status badge
  createConnectionBadge();
  
  // Log instance connection changes
  cm.on(ConnectionEvents.INSTANCE_CONNECTED, (inst) => {
    console.log(`[ComfySwap] ${inst.name} connected`);
  });
  
  cm.on(ConnectionEvents.INSTANCE_DISCONNECTED, (inst) => {
    console.log(`[ComfySwap] ${inst.name} disconnected`);
  });
  
  cm.on(ConnectionEvents.INSTANCES_UPDATED, ({ instances }) => {
    const activeCount = instances.filter(i => i.connected).length;
    if (instances.length > 0) {
      console.log(`[ComfySwap] Status: ${activeCount}/${instances.length} instances active`);
    }
  });
  
  console.log("[ComfySwap] Plugin initialized");
}

/**
 * Handle export action
 */
async function handleExport() {
  await openComfySwapExport(() => app.graphToPrompt());
}

// Register the extension
app.registerExtension({
  name: "ComfySwap",
  
  async setup() {
    // Initialize after ComfyUI is ready
    await initPlugin();
  },
  
  commands: [
    { 
      id: "comfyswap.export", 
      label: "Export to ComfySwap", 
      function: handleExport 
    }
  ],
  
  menuCommands: [
    { 
      path: ["Workflow"], 
      commands: ["comfyswap.export"] 
    }
  ],
  
  getCanvasMenuItems() {
    return [
      null, // separator
      { 
        content: "Export to ComfySwap", 
        callback: handleExport 
      }
    ];
  },
});

console.log("[ComfySwap] Plugin loaded. Access: Workflow menu or right-click canvas.");
