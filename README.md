# figma-bridge-service

Small Node.js Express service that receives design briefs from n8n and stores them as pending Figma design jobs.

This MVP does not create real Figma files and does not return fake Figma URLs. It prepares the backend contract for a future Figma plugin that will pull pending jobs, create real Figma frames, and mark jobs completed.

Current flow:

```text
n8n sends design brief -> bridge stores pending job -> Figma plugin pulls pending jobs -> plugin creates real Figma frames -> plugin marks job completed
```

Jobs are stored in memory for now, so they reset when the service restarts. Add durable storage in a later step before relying on this for production job history.

## Install Dependencies

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

The service defaults to port `3005`.

## Build

```bash
npm run build
```

## Start Production Build

```bash
npm start
```

## Health Check

```bash
curl http://localhost:3005/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "figma-bridge-service"
}
```

## Create Design Draft Job

```bash
curl -X POST http://localhost:3005/figma/create-design-draft \
  -H "Content-Type: application/json" \
  -d '{
    "issueKey": "KAN-14",
    "briefTitle": "Design Instagram connection onboarding screen",
    "objective": "Design an onboarding screen that helps Instagram shop owners connect their Instagram page.",
    "targetUser": "Instagram shop owner",
    "requiredSections": "page title, short explanation, Instagram connection card, connect Instagram button, permission explanation",
    "requiredStates": "default, success, error",
    "uxNotes": "User should clearly understand why Instagram connection is needed.",
    "designConstraints": "SaaS dashboard onboarding flow.",
    "acceptanceCriteria": "User understands the goal | Connect button is visible | Success and error states are included",
    "figmaInstruction": "Create a Figma file with an onboarding screen..."
  }'
```

Expected response:

```json
{
  "success": true,
  "status": "pending",
  "jobId": "3b3fa02d-8020-4ebd-98f6-f2cf199dfe33",
  "issueKey": "KAN-14",
  "briefTitle": "Design Instagram connection onboarding screen",
  "message": "Design brief received. Waiting for Figma plugin to create the draft."
}
```

## List Pending Jobs

```bash
curl http://localhost:3005/figma/jobs/pending
```

Expected response:

```json
{
  "success": true,
  "jobs": [
    {
      "jobId": "3b3fa02d-8020-4ebd-98f6-f2cf199dfe33",
      "issueKey": "KAN-14",
      "briefTitle": "Design Instagram connection onboarding screen",
      "objective": "Design an onboarding screen that helps Instagram shop owners connect their Instagram page.",
      "targetUser": "Instagram shop owner",
      "figmaInstruction": "Create a Figma file with an onboarding screen...",
      "status": "pending",
      "createdAt": "2026-06-04T13:00:00.000Z",
      "updatedAt": "2026-06-04T13:00:00.000Z"
    }
  ]
}
```

## Get A Job

```bash
curl http://localhost:3005/figma/jobs/JOB_ID
```

If the job exists, the service returns:

```json
{
  "success": true,
  "job": {
    "jobId": "JOB_ID",
    "status": "pending"
  }
}
```

If the job does not exist, the service returns HTTP `404`.

## Complete A Job

This endpoint is for the future Figma plugin after it creates real Figma frames.

```bash
curl -X POST http://localhost:3005/figma/jobs/JOB_ID/complete \
  -H "Content-Type: application/json" \
  -d '{
    "figmaFileKey": "real-file-key",
    "figmaFileUrl": "https://www.figma.com/design/real-file-key/example",
    "figmaFrameId": "real-frame-id",
    "figmaFrameUrl": "https://www.figma.com/design/real-file-key/example?node-id=real-frame-id"
  }'
```

Expected response:

```json
{
  "success": true,
  "job": {
    "jobId": "JOB_ID",
    "status": "completed",
    "figmaFileKey": "real-file-key",
    "figmaFileUrl": "https://www.figma.com/design/real-file-key/example",
    "figmaFrameId": "real-frame-id",
    "figmaFrameUrl": "https://www.figma.com/design/real-file-key/example?node-id=real-frame-id"
  }
}
```

## Fail A Job

```bash
curl -X POST http://localhost:3005/figma/jobs/JOB_ID/fail \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Figma plugin could not create the required frame."
  }'
```

Expected response:

```json
{
  "success": true,
  "job": {
    "jobId": "JOB_ID",
    "status": "failed",
    "failureReason": "Figma plugin could not create the required frame."
  }
}
```

## Validation Errors

If required fields are missing or invalid, the API returns HTTP `400`:

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "details": []
}
```

## n8n Integration Notes

In n8n, set:

```text
figmaBridgeUrl = http://YOUR_VPS_IP:3005/figma/create-design-draft
```

The n8n HTTP Request node should send a JSON body:

```json
{
  "issueKey": "{{$json.issueKey}}",
  "briefTitle": "{{$json.brief.title}}",
  "objective": "{{$json.brief.objective}}",
  "targetUser": "{{$json.brief.target_user}}",
  "requiredSections": "{{$json.brief.required_sections.join(', ')}}",
  "requiredStates": "{{$json.brief.required_states.join(', ')}}",
  "uxNotes": "{{$json.brief.ux_notes}}",
  "designConstraints": "{{$json.brief.design_constraints}}",
  "acceptanceCriteria": "{{$json.brief.acceptance_criteria.join(' | ')}}",
  "figmaInstruction": "{{$json.brief.figma_instruction}}"
}
```

Use method `POST` and set `Content-Type` to `application/json`. The response contains a real `jobId` with `status: "pending"`. A future Figma plugin should pull `/figma/jobs/pending`, create real Figma frames, then call `/figma/jobs/:jobId/complete`.

## Manual Test Flow

This project does not currently include an automated test setup. Use this local smoke test flow:

```bash
npm install
npm run build
npm run dev
```

In another terminal:

```bash
curl http://localhost:3005/health
```

Create a job, copy the returned `jobId`, then list pending jobs:

```bash
curl http://localhost:3005/figma/jobs/pending
```

Complete the job:

```bash
curl -X POST http://localhost:3005/figma/jobs/JOB_ID/complete \
  -H "Content-Type: application/json" \
  -d '{
    "figmaFileKey": "real-file-key",
    "figmaFileUrl": "https://www.figma.com/design/real-file-key/example",
    "figmaFrameId": "real-frame-id"
  }'
```

Or fail a job:

```bash
curl -X POST http://localhost:3005/figma/jobs/JOB_ID/fail \
  -H "Content-Type: application/json" \
  -d '{"reason": "Plugin failed to create frames."}'
```

## Deployment

The repository is configured for CI/CD to an Ubuntu VPS with Docker Compose.

Image name:

```text
ghcr.io/shahabmosavi/figma-bridge-service:latest
```

VPS app directory:

```text
/home/projects/n8nflow
```

### Local Docker Build

```bash
docker build -t figma-bridge-service .
```

### Local Docker Run

Create a local `.env` first:

```env
PORT=3005
NODE_ENV=production
```

Then run:

```bash
docker run --rm -p 3005:3005 --env-file .env figma-bridge-service
```

### Docker Compose Usage

```bash
cp .env.example .env
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 figma-bridge-service
```

### GitHub Secrets

Add these in GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

Required:

```text
VPS_HOST = your server IP or domain
VPS_USER = SSH username, usually root or ubuntu
VPS_SSH_KEY = private SSH key that can access the VPS
VPS_APP_DIR = /home/projects/n8nflow
```

Optional:

```text
VPS_PORT = 22
```

The workflow uses `GITHUB_TOKEN` to push to GitHub Container Registry. It includes:

```yaml
permissions:
  contents: read
  packages: write
```

### VPS One-Time Setup

Run these once on the VPS:

```bash
sudo apt update
sudo apt install -y git
```

Install Docker and Docker Compose using Docker's official Ubuntu instructions.

Create the app directory:

```bash
sudo mkdir -p /home/projects/n8nflow
sudo chown -R $USER:$USER /home/projects/n8nflow
cd /home/projects/n8nflow
```

Clone or pull the repository into `/home/projects/n8nflow`:

```bash
git clone https://github.com/shahabmosavi/figma-bridge-service.git .
```

Create `.env`:

```bash
cat > .env <<'EOF'
PORT=3005
NODE_ENV=production
EOF
```

If the GHCR package is private, log in once on the VPS with a GitHub token that has package read access:

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u shahabmosavi --password-stdin
```

### Manual VPS Deployment

Manual deployment without GitHub Actions:

```bash
cd /home/projects/n8nflow
git pull origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail=80 figma-bridge-service
```

Deployment with the published GHCR image:

```bash
cd /home/projects/n8nflow
export VPS_APP_DIR=/home/projects/n8nflow
export FIGMA_BRIDGE_IMAGE=ghcr.io/shahabmosavi/figma-bridge-service:latest
bash deploy/deploy.sh
```

### GitHub Actions Deployment

On every push to `main`, `.github/workflows/deploy.yml` will:

1. Install dependencies with `npm ci`.
2. Run the TypeScript build.
3. Build the Docker image.
4. Push `ghcr.io/shahabmosavi/figma-bridge-service:latest`.
5. SSH into the VPS.
6. Pull the latest image.
7. Restart the Docker Compose service.

### Nginx Reverse Proxy

Copy the example config:

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/figma-bridge-service
sudo ln -s /etc/nginx/sites-available/figma-bridge-service /etc/nginx/sites-enabled/figma-bridge-service
sudo nginx -t
sudo systemctl reload nginx
```

Edit `server_name figma-bridge.example.com;` to your real domain first.

SSL is not included in the example. After DNS points to the VPS, add HTTPS with Certbot:

```bash
sudo certbot --nginx -d figma-bridge.example.com
```

### Test After Deployment

Health:

```bash
curl http://VPS_HOST:3005/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "figma-bridge-service"
}
```

Create a draft:

```bash
curl -X POST http://VPS_HOST:3005/figma/create-design-draft \
  -H "Content-Type: application/json" \
  -d '{
    "issueKey": "KAN-14",
    "briefTitle": "Design Instagram connection onboarding screen",
    "objective": "Design onboarding screen",
    "targetUser": "Instagram shop owner",
    "figmaInstruction": "Create onboarding frames"
  }'
```

Expected: a successful pending job response containing `jobId` and `status: "pending"`.

### n8n URL

Use the direct VPS endpoint:

```text
figmaBridgeUrl = http://VPS_HOST:3005/figma/create-design-draft
```

Or the domain endpoint:

```text
figmaBridgeUrl = https://YOUR_DOMAIN/figma/create-design-draft
```

## Debugging Figma Plugin Network Issues

If the Figma plugin shows `Backend request failed: Failed to fetch`, first confirm the public tunnel works from a browser:

```text
https://drinking-ragged-dense.ngrok-free.dev/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "figma-bridge-service"
}
```

Inside the Figma plugin, use the `Test Health` button. The plugin UI includes a debug panel that logs the backend URL, exact request URL, fetch start and resolution, HTTP status, response text, parsed JSON, and full fetch errors.

Check ngrok logs on the VPS:

```bash
journalctl -u ngrok-figma-bridge -f
```

Check backend logs:

```bash
docker compose logs -f figma-bridge-service
```

The backend logs request metadata for every request, including method, URL, origin, user-agent, and timestamp. It also logs `/health`, `/figma/jobs/pending`, and the number of pending jobs returned.

Use this endpoint to inspect request headers reaching the backend:

```text
https://drinking-ragged-dense.ngrok-free.dev/debug/request-info
```

Debugging guide:

- If the browser works but plugin requests do not appear in ngrok logs, suspect Figma `manifest.json` `networkAccess.allowedDomains` or the plugin runtime.
- If ngrok receives the request but the backend rejects it, inspect CORS logs and the response status.
- If the backend receives the request and returns `200` but the plugin still fails, inspect the plugin debug panel for response parsing and UI errors.
- After changing `manifest.json`, re-import the plugin in Figma from `figma-plugin/manifest.json` so network permissions refresh.
