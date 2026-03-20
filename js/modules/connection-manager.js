/**
 * ComfySwap - Connection Manager Module
 * Tracks Comfy-Swap instances that are connecting to this plugin
 */

const POLL_INTERVAL = 5000; // Poll local status every 5 seconds

/**
 * Connection states
 */
export const ConnectionState = {
  ACTIVE: "active",
  STALE: "stale",
  NONE: "none"
};

/**
 * Instance info from backend
 * @typedef {Object} InstanceInfo
 * @property {string} id - Instance unique ID
 * @property {number} instance_num - Instance number (1, 2, 3...)
 * @property {string} name - Display name (Instance 1, Instance 2...)
 * @property {boolean} connected - Whether instance is actively connected
 * @property {number} last_seen_ago - Seconds since last request
 * @property {number} request_count - Total requests from this instance
 */

/**
 * Event types for connection manager
 */
export const ConnectionEvents = {
  INSTANCES_UPDATED: "instancesUpdated",
  INSTANCE_CONNECTED: "instanceConnected",
  INSTANCE_DISCONNECTED: "instanceDisconnected"
};

/**
 * ConnectionManager - Tracks Comfy-Swap instances connecting to this plugin
 */
class ConnectionManager {
  constructor() {
    /** @type {InstanceInfo[]} */
    this.instances = [];
    
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    
    /** @type {number|null} */
    this.pollTimer = null;
    
    /** @type {boolean} */
    this.initialized = false;
    
    /** @type {string} */
    this.pluginVersion = "";
    
    /** @type {number} */
    this.pendingCount = 0;
  }
  
  /**
   * Initialize the connection manager
   */
  async init() {
    if (this.initialized) return;
    
    // Initial fetch
    await this.refresh();
    
    // Start polling loop
    this._startPolling();
    
    this.initialized = true;
    console.log("[ComfySwap] ConnectionManager initialized");
  }
  
  /**
   * Start the polling loop
   */
  _startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    
    this.pollTimer = setInterval(() => {
      this.refresh();
    }, POLL_INTERVAL);
  }
  
  /**
   * Stop the polling loop
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
  
  /**
   * Add event listener
   * @param {string} event 
   * @param {Function} callback 
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }
  
  /**
   * Remove event listener
   * @param {string} event 
   * @param {Function} callback 
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }
  
  /**
   * Emit event to listeners
   * @param {string} event 
   * @param {*} data 
   */
  _emit(event, data) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(data);
        } catch (e) {
          console.error("[ComfySwap] Error in event listener:", e);
        }
      }
    }
  }
  
  /**
   * Refresh instance status from backend
   */
  async refresh() {
    try {
      const response = await fetch("/comfyswap/status");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      const oldInstances = new Map(this.instances.map(i => [i.id, i]));
      
      this.instances = data.instances || [];
      this.pluginVersion = data.version || "";
      this.pendingCount = data.pending_count || 0;
      
      // Check for new/disconnected instances
      for (const inst of this.instances) {
        if (!oldInstances.has(inst.id)) {
          this._emit(ConnectionEvents.INSTANCE_CONNECTED, inst);
        }
      }
      
      const currentIds = new Set(this.instances.map(i => i.id));
      for (const [id, inst] of oldInstances) {
        if (!currentIds.has(id)) {
          this._emit(ConnectionEvents.INSTANCE_DISCONNECTED, inst);
        }
      }
      
      this._emit(ConnectionEvents.INSTANCES_UPDATED, {
        instances: this.instances,
        version: this.pluginVersion,
        pendingCount: this.pendingCount
      });
      
    } catch (e) {
      console.warn("[ComfySwap] Failed to fetch status:", e);
    }
  }
  
  /**
   * Get all tracked instances
   * @returns {InstanceInfo[]}
   */
  getInstances() {
    return [...this.instances];
  }
  
  /**
   * Get active (recently seen) instances
   * @returns {InstanceInfo[]}
   */
  getActiveInstances() {
    return this.instances.filter(i => i.connected);
  }
  
  /**
   * Check if any instance is connected
   * @returns {boolean}
   */
  hasActiveInstance() {
    return this.instances.some(i => i.connected);
  }
  
  /**
   * Get instance count
   * @returns {number}
   */
  getInstanceCount() {
    return this.instances.length;
  }
  
  /**
   * Get active instance count
   * @returns {number}
   */
  getActiveCount() {
    return this.instances.filter(i => i.connected).length;
  }
  
  /**
   * Get connection summary
   * @returns {Object}
   */
  getConnectionSummary() {
    const active = this.getActiveInstances();
    return {
      total: this.instances.length,
      active: active.length,
      stale: this.instances.length - active.length,
      pendingCount: this.pendingCount,
      version: this.pluginVersion
    };
  }
  
  /**
   * Get overall connection state
   * @returns {string}
   */
  getOverallState() {
    if (this.instances.length === 0) {
      return ConnectionState.NONE;
    }
    if (this.instances.some(i => i.connected)) {
      return ConnectionState.ACTIVE;
    }
    return ConnectionState.STALE;
  }
  
  /**
   * Add a workflow to the pending queue (to be picked up by Comfy-Swap instances)
   * @param {Object} workflow - Workflow payload
   * @returns {Promise<Object>}
   */
  async addPendingWorkflow(workflow) {
    const response = await fetch("/comfyswap/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workflow)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }
    
    const result = await response.json();
    
    // Refresh to update pending count
    await this.refresh();
    
    return result;
  }
  
  /**
   * Get pending workflows
   * @returns {Promise<Array>}
   */
  async getPendingWorkflows() {
    try {
      const response = await fetch("/comfyswap/pending");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.workflows || [];
    } catch (e) {
      console.warn("[ComfySwap] Failed to fetch pending workflows:", e);
      return [];
    }
  }
  
  /**
   * Clear all pending workflows
   * @returns {Promise<void>}
   */
  async clearPendingWorkflows() {
    await fetch("/comfyswap/pending", { method: "DELETE" });
    await this.refresh();
  }
}

// Singleton instance
let instance = null;

/**
 * Get the ConnectionManager singleton instance
 * @returns {ConnectionManager}
 */
export function getConnectionManager() {
  if (!instance) {
    instance = new ConnectionManager();
  }
  return instance;
}

/**
 * Initialize the connection manager (call once on plugin load)
 * @returns {Promise<ConnectionManager>}
 */
export async function initConnectionManager() {
  const cm = getConnectionManager();
  await cm.init();
  return cm;
}

// Export the class for testing purposes
export { ConnectionManager };
