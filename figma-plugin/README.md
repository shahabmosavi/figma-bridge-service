# AI Design Jobs Figma Plugin

Local Figma plugin MVP for the Jira -> n8n -> AI -> Figma Bridge workflow.

The plugin fetches pending design jobs from `figma-bridge-service`, shows them in a small Figma plugin UI, creates a scaffold frame in the currently open Figma file, and then calls the backend to mark the selected job completed.

## How It Fits The Bridge

```text
Jira issue -> n8n workflow -> AI brief -> figma-bridge-service pending job -> Figma plugin -> real Figma frame
```

The backend owns job intake and job status. This plugin owns the Figma-side work: it uses the Figma Plugin API to create nodes in the file the designer already has open.

## Build

Install dependencies from this folder:

```bash
cd figma-plugin
npm install
npm run build
```

The build creates `code.js`, which is the plugin entry file referenced by `manifest.json`.

## Import Into Figma

1. Open the Figma desktop app.
2. Go to `Plugins -> Development -> Import plugin from manifest`.
3. Select this plugin's `manifest.json`.
4. Run the plugin from `Plugins -> Development -> AI Design Jobs`.

After any change to `manifest.json`, re-import the plugin from this same `figma-plugin/manifest.json` file so Figma refreshes network access permissions.

## Test

1. Make sure `figma-bridge-service` is running.
2. Make sure the plugin `BACKEND_BASE_URL` in `ui.html` points to the HTTPS ngrok tunnel:

```text
https://drinking-ragged-dense.ngrok-free.dev
```

3. Create or fetch a pending job.
4. Open a Figma file.
5. Run the plugin.
6. Click `Refresh pending jobs`.
7. Click `Create Figma Draft` on a pending job.
8. Confirm a new frame appears in the current Figma file.
9. Confirm the backend job status becomes `completed`.

## Debugging Network Issues

The plugin UI includes a visible debug panel and a `Test Health` button.

Use these checks when the plugin shows `Backend request failed: Failed to fetch`:

- Browser test: `https://drinking-ragged-dense.ngrok-free.dev/health`
- Plugin test: click `Test Health` and inspect the debug panel.
- Manifest check: `manifest.json` must include the ngrok domain in `networkAccess.allowedDomains`.
- ngrok logs: `journalctl -u ngrok-figma-bridge -f`
- Backend logs: `docker compose logs -f figma-bridge-service`

If browser requests work but ngrok shows no plugin request, suspect Figma manifest network access or plugin runtime restrictions. After changing `manifest.json`, re-import the plugin from manifest in Figma.

## What The Draft Creates

The generated frame is named:

```text
AI Draft - {issueKey} - {briefTitle}
```

It is a `1440 x 1024` auto-layout frame with a neutral background, title, issue and target-user subtitle, section cards for the brief fields, and a final review note.

## Known Limitations

- No authentication yet.
- No real AI layout generation inside the plugin yet.
- In-memory backend jobs disappear if the backend restarts.
- Generated frame is a scaffold, not final product design.
- Requires the Figma file to be open and the plugin running.
