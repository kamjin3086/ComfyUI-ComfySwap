# ComfyUI-ComfySwap

A ComfyUI extension that enables seamless workflow export to [Comfy-Swap](https://github.com/kamjin3086/comfy-swap), allowing you to create REST API endpoints from your ComfyUI workflows.

## Features

- **One-Click Export**: Export workflows directly from ComfyUI's interface
- **Parameter Mapping**: Automatically detect and configure API parameters
- **Multiple Export Options**: Save to queue, direct send, copy JSON, or download file
- **Seamless Sync**: Pending workflows are automatically synced to Comfy-Swap

## Installation

### Method 1: ComfyUI Manager (Recommended)

Search for "ComfySwap" in ComfyUI Manager and click Install.

### Method 2: Git Clone

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/kamjin3086/ComfyUI-ComfySwap.git
```

### Method 3: Manual Download

1. Download the latest release ZIP
2. Extract to `ComfyUI/custom_nodes/ComfyUI-ComfySwap`
3. Restart ComfyUI

## Usage

### Exporting a Workflow

1. Create or open a workflow in ComfyUI
2. Access the export dialog via:
   - **Menu**: `Workflow` → `Export to ComfySwap`
   - **Right-click**: Click on canvas → `Export to ComfySwap`
3. Configure your workflow:
   - Enter a workflow name
   - Select which parameters to expose as API inputs
   - Optionally merge related parameters
4. Click **Save** to add to the sync queue

### Export Options

| Option | Description |
|--------|-------------|
| **Save** | Add to pending queue (synced by Comfy-Swap) |
| **Direct Send** | Send directly to a Comfy-Swap server |
| **Copy JSON** | Copy workflow JSON to clipboard |
| **Download** | Download as a JSON file |

## API Endpoints

This plugin exposes the following endpoints on your ComfyUI server:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/comfyswap/status` | GET | Get plugin status and version |
| `/comfyswap/pending` | GET | List pending workflows |
| `/comfyswap/pending` | POST | Add workflow to queue |
| `/comfyswap/pending/{id}` | DELETE | Remove workflow from queue |

## Configuration

No configuration required. The plugin works out of the box with Comfy-Swap.

## Requirements

- ComfyUI (latest version recommended)
- Comfy-Swap server for full functionality

## Troubleshooting

### Export dialog doesn't appear

- Refresh the browser page
- Check browser console for errors
- Ensure the plugin is properly installed in `custom_nodes`

### Workflows not syncing

- Verify Comfy-Swap server is running and connected
- Check the pending queue via `/comfyswap/pending`
- Use "Direct Send" option as an alternative

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Links

- [Comfy-Swap](https://github.com/kamjin3086/comfy-swap) - Main application
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - The AI image generation platform
