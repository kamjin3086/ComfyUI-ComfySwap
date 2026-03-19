import json
import server
from aiohttp import web

WEB_DIRECTORY = "./js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# 待同步的工作流队列
pending_workflows = []

@server.PromptServer.instance.routes.get("/comfyswap/status")
async def get_status(request):
    """返回插件状态"""
    return web.json_response({
        "installed": True,
        "version": "1.0.0",
        "pending_count": len(pending_workflows)
    })

@server.PromptServer.instance.routes.get("/comfyswap/pending")
async def get_pending(request):
    """返回待同步的工作流列表"""
    return web.json_response({
        "workflows": pending_workflows
    })

@server.PromptServer.instance.routes.post("/comfyswap/pending")
async def add_pending(request):
    """添加工作流到待同步队列"""
    try:
        data = await request.json()
        if not data.get("id") or not data.get("name"):
            return web.json_response({"error": "Missing id or name"}, status=400)
        
        # 检查是否已存在，如果存在则更新
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
    """从队列中移除已同步的工作流"""
    workflow_id = request.match_info.get("workflow_id")
    global pending_workflows
    pending_workflows = [wf for wf in pending_workflows if wf.get("id") != workflow_id]
    return web.json_response({"status": "removed", "id": workflow_id})

@server.PromptServer.instance.routes.delete("/comfyswap/pending")
async def clear_pending(request):
    """清空待同步队列"""
    global pending_workflows
    pending_workflows = []
    return web.json_response({"status": "cleared"})

__all__ = ["WEB_DIRECTORY", "NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
