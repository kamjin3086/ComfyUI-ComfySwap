"""
ComfyUI-ComfySwap: A ComfyUI extension for Comfy-Swap workflow synchronization.

This plugin enables seamless workflow export from ComfyUI to Comfy-Swap,
allowing you to create API endpoints from your ComfyUI workflows.
"""

import time
import hashlib
import server
from aiohttp import web

__version__ = "1.1.0"

WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Pending workflows queue (in-memory storage for workflows awaiting sync)
pending_workflows = []

# Connected Comfy-Swap instances tracker
# Key: instance_id (hash), Value: {instance_num, last_seen, user_agent, first_seen}
connected_instances = {}
instance_counter = 0

# Instance timeout in seconds (consider disconnected if no request for this long)
INSTANCE_TIMEOUT = 60


def _get_instance_id(request):
    """Generate a unique ID for a Comfy-Swap instance based on request headers."""
    # Use combination of factors to identify unique instance
    # Comfy-Swap should send a unique identifier header
    swap_id = request.headers.get("X-ComfySwap-Instance", "")
    if swap_id:
        return swap_id
    
    # Fallback: use IP + User-Agent hash (less reliable but works)
    peername = request.transport.get_extra_info('peername')
    ip = peername[0] if peername else "unknown"
    ua = request.headers.get("User-Agent", "")
    raw = f"{ip}:{ua}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _track_instance(request):
    """Track a Comfy-Swap instance connection."""
    global instance_counter
    
    instance_id = _get_instance_id(request)
    now = time.time()
    
    if instance_id not in connected_instances:
        instance_counter += 1
        connected_instances[instance_id] = {
            "instance_num": instance_counter,
            "first_seen": now,
            "last_seen": now,
            "user_agent": request.headers.get("User-Agent", "Unknown"),
            "request_count": 1
        }
    else:
        connected_instances[instance_id]["last_seen"] = now
        connected_instances[instance_id]["request_count"] += 1
    
    return instance_id


def _cleanup_stale_instances():
    """Remove instances that haven't been seen recently."""
    now = time.time()
    stale = [k for k, v in connected_instances.items() 
             if now - v["last_seen"] > INSTANCE_TIMEOUT]
    for k in stale:
        del connected_instances[k]


def _get_active_instances():
    """Get list of active instances, sorted by instance number."""
    _cleanup_stale_instances()
    now = time.time()
    
    instances = []
    for inst_id, info in connected_instances.items():
        age = now - info["last_seen"]
        instances.append({
            "id": inst_id,
            "instance_num": info["instance_num"],
            "name": f"Instance {info['instance_num']}",
            "connected": age < INSTANCE_TIMEOUT,
            "last_seen": info["last_seen"],
            "last_seen_ago": int(age),
            "request_count": info["request_count"],
            "first_seen": info["first_seen"]
        })
    
    # Sort by instance number
    instances.sort(key=lambda x: x["instance_num"])
    return instances


# ============================================================
# API Routes
# ============================================================

@server.PromptServer.instance.routes.get("/comfyswap/status")
async def get_status(request):
    """Get plugin status and version information.
    This endpoint is polled by Comfy-Swap clients to check plugin status.
    """
    # Track this as an active instance (Comfy-Swap client polling)
    _track_instance(request)
    
    instances = _get_active_instances()
    return web.json_response({
        "installed": True,
        "version": __version__,
        "pending_count": len(pending_workflows),
        "connected_instances": len(instances),
        "instances": instances
    })


@server.PromptServer.instance.routes.get("/comfyswap/instances")
async def get_instances(request):
    """Get list of connected Comfy-Swap instances."""
    return web.json_response({
        "instances": _get_active_instances()
    })


@server.PromptServer.instance.routes.get("/comfyswap/pending")
async def get_pending(request):
    """Get the list of pending workflows awaiting synchronization.
    This endpoint is called by Comfy-Swap servers to poll for new workflows.
    """
    # Track this as an active instance
    _track_instance(request)
    
    return web.json_response({
        "workflows": pending_workflows
    })


@server.PromptServer.instance.routes.post("/comfyswap/pending")
async def add_pending(request):
    """Add a workflow to the pending queue. Updates if workflow ID already exists."""
    try:
        data = await request.json()
        if not data.get("id") or not data.get("name"):
            return web.json_response({"error": "Missing id or name"}, status=400)
        
        # Check if workflow already exists, update if so
        for i, wf in enumerate(pending_workflows):
            if wf.get("id") == data["id"]:
                pending_workflows[i] = data
                return web.json_response({"status": "updated", "id": data["id"]})
        
        pending_workflows.append(data)
        return web.json_response({"status": "added", "id": data["id"]})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=400)


@server.PromptServer.instance.routes.delete("/comfyswap/pending/{workflow_id}")
async def remove_pending(request):
    """Remove a specific workflow from the pending queue after successful sync."""
    # Track this as an active instance (Comfy-Swap confirms receipt)
    _track_instance(request)
    
    workflow_id = request.match_info.get("workflow_id")
    global pending_workflows
    pending_workflows = [wf for wf in pending_workflows if wf.get("id") != workflow_id]
    return web.json_response({"status": "removed", "id": workflow_id})


@server.PromptServer.instance.routes.delete("/comfyswap/pending")
async def clear_pending(request):
    """Clear all pending workflows from the queue."""
    global pending_workflows
    pending_workflows = []
    return web.json_response({"status": "cleared"})


@server.PromptServer.instance.routes.post("/comfyswap/heartbeat")
async def heartbeat(request):
    """Heartbeat endpoint for Comfy-Swap instances to maintain connection."""
    instance_id = _track_instance(request)
    info = connected_instances.get(instance_id, {})
    
    return web.json_response({
        "status": "ok",
        "instance_num": info.get("instance_num", 0),
        "name": f"Instance {info.get('instance_num', 0)}"
    })


__all__ = ["WEB_DIRECTORY", "NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
