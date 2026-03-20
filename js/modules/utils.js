/**
 * ComfySwap - Utility Functions Module
 * Contains helper functions for workflow processing and DOM manipulation
 */

/**
 * Convert a string to a URL-friendly slug
 * @param {string} value - The string to slugify
 * @returns {string} URL-friendly slug
 */
export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "workflow";
}

/**
 * Generate a meaningful workflow name from prompt object
 * @param {Object} promptObj - ComfyUI prompt object
 * @returns {string} Generated workflow name
 */
export function generateWorkflowName(promptObj) {
  const parts = [];
  let mainModel = "";
  let sampler = "";
  let resolution = "";
  let hasImg2Img = false;
  let hasControlNet = false;
  let hasUpscale = false;
  let hasInpaint = false;
  
  for (const node of Object.values(promptObj || {})) {
    const classType = (node.class_type || "").toLowerCase();
    const inputs = node.inputs || {};
    
    if (classType.includes("checkpointloader") && inputs.ckpt_name) {
      const ckpt = String(inputs.ckpt_name).replace(/\.(safetensors|ckpt|pt)$/i, "");
      const shortName = ckpt.split(/[\/\\]/).pop().slice(0, 20);
      mainModel = shortName;
    }
    if (classType.includes("ksampler") && inputs.sampler_name) {
      sampler = inputs.sampler_name;
    }
    if (classType.includes("emptylatent") && inputs.width && inputs.height) {
      resolution = `${inputs.width}x${inputs.height}`;
    }
    if (classType.includes("loadimage")) hasImg2Img = true;
    if (classType.includes("controlnet")) hasControlNet = true;
    if (classType.includes("upscale")) hasUpscale = true;
    if (classType.includes("inpaint")) hasInpaint = true;
  }
  
  if (mainModel) parts.push(mainModel);
  
  const tags = [];
  if (hasImg2Img) tags.push("i2i");
  if (hasControlNet) tags.push("cn");
  if (hasUpscale) tags.push("up");
  if (hasInpaint) tags.push("inp");
  
  if (tags.length) parts.push(tags.join("-"));
  if (sampler && sampler !== "euler") parts.push(sampler.slice(0, 8));
  if (resolution) parts.push(resolution);
  
  if (parts.length === 0) {
    const date = new Date();
    const ts = `${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
    return `workflow-${ts}`;
  }
  
  return slugify(parts.join("-")).slice(0, 50);
}

/**
 * Detect candidate parameters from a workflow prompt
 * @param {Object} prompt - ComfyUI prompt object
 * @returns {Array} List of detected parameters
 */
export function detectCandidateParams(prompt) {
  const PARAM_KEYS = [
    "text", "seed", "steps", "cfg", "scheduler", "sampler_name", 
    "denoise", "width", "height", "image", "positive", "negative", 
    "ckpt_name", "vae_name", "clip_skip", "batch_size"
  ];
  
  const list = [];
  for (const [nodeId, node] of Object.entries(prompt || {})) {
    const classType = node.class_type || "";
    const inputs = node.inputs || {};
    for (const key of Object.keys(inputs)) {
      const value = inputs[key];
      if (Array.isArray(value)) continue;
      
      if (PARAM_KEYS.includes(key)) {
        let type = "string";
        if (["seed", "steps", "width", "height", "batch_size", "clip_skip"].includes(key)) {
          type = "integer";
        } else if (["denoise", "cfg"].includes(key)) {
          type = "float";
        } else if (key === "image") {
          type = "image";
        }
        
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

/**
 * Get human-readable description for a parameter
 * @param {string} name - Parameter name
 * @param {string} type - Parameter type
 * @returns {string} Description
 */
export function getParamDescription(name, type) {
  const descriptions = {
    text: "Main prompt describing generated content",
    positive: "Positive prompt",
    negative: "Negative prompt, content to avoid",
    seed: "Random seed, -1 for random",
    steps: "Sampling steps, higher is more refined",
    cfg: "Prompt guidance strength",
    denoise: "Denoise strength (0-1)",
    width: "Image width (px)",
    height: "Image height (px)",
    batch_size: "Batch generation count",
    sampler_name: "Sampler algorithm",
    scheduler: "Scheduler type",
    ckpt_name: "Model checkpoint",
    vae_name: "VAE encoder",
    clip_skip: "CLIP skip layers",
    image: "Input image file",
  };
  return descriptions[name] || "";
}

/**
 * Merge candidate parameters with same name/type
 * @param {Array} candidates - List of detected candidates
 * @returns {Array} Merged parameter list
 */
export function mergeCandidates(candidates) {
  const map = new Map();
  for (const c of candidates) {
    const key = `${c.name}:${c.type}`;
    if (!map.has(key)) {
      map.set(key, {
        name: c.name,
        type: c.type,
        default: c.default ?? "",
        description: getParamDescription(c.name, c.type),
        targets: [],
      });
    }
    map.get(key).targets.push({ node_id: c.node_id, field: c.field });
  }
  return Array.from(map.values());
}

/**
 * Create a DOM element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set
 * @param {string} text - Text content
 * @returns {HTMLElement} Created element
 */
export function createEl(tag, attrs = {}, text = "") {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  if (text) el.textContent = text;
  return el;
}

/**
 * Get icon for parameter type
 * @param {string} type - Parameter type
 * @returns {string} Icon representation
 */
export function getTypeIcon(type) {
  const icons = {
    integer: "123",
    float: "1.5",
    string: "Aa",
    image: "🖼"
  };
  return icons[type] || "?";
}

/**
 * Build payload for API submission
 * @param {Object} state - Current state
 * @param {Object} promptObj - Workflow prompt object
 * @returns {Object} API payload
 */
export function buildPayload(state, promptObj) {
  const selectedParams = state.mapping.filter(m => m.selected !== false);
  const id = state.mode === "update" ? state.existingId : slugify(state.name);
  return {
    id,
    name: state.name,
    comfyui_workflow: promptObj,
    param_mapping: selectedParams.map(m => ({
      name: m.name,
      type: m.type,
      default: m.default,
      description: m.description || "",
      targets: m.targets,
    })),
  };
}
