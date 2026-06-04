# figma-bridge-service

Small Node.js Express service that receives design briefs from n8n and returns a mock Figma draft result.

This is a clean backend foundation for the future Figma API or Figma MCP integration. It does not create real Figma files yet.

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

## Create Figma Design Draft

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
  "issueKey": "KAN-14",
  "figma_url": "https://figma.com/file/mock-ai-design-draft",
  "figma_file_id": "mock-file-id",
  "figma_frame_id": "mock-frame-id",
  "briefTitle": "Design Instagram connection onboarding screen",
  "message": "Mock Figma draft created successfully."
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

Use method `POST`, set `Content-Type` to `application/json`, and pass the response fields back into later Jira or Figma workflow steps as needed.

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

Expected: a successful mock Figma response containing `figma_url`.

### n8n URL

Use the direct VPS endpoint:

```text
figmaBridgeUrl = http://VPS_HOST:3005/figma/create-design-draft
```

Or the domain endpoint:

```text
figmaBridgeUrl = https://YOUR_DOMAIN/figma/create-design-draft
```
