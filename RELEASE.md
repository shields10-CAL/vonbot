# VonBot 1.0.0 — GitHub & Portainer deployment

**Source basis:** VonBot v0.22.1 Docker Build Fix.
**GitHub repository:** https://github.com/shields10-CAL/vonbot
**Latest image:** `ghcr.io/shields10-cal/vonbot:latest`
**Pinned release image:** `ghcr.io/shields10-cal/vonbot:1.0.0`

## First upload
1. Unzip this archive. Open the `VonBot` folder.
2. Upload the **contents inside** `VonBot` to the root of the GitHub repository,
   keeping `.github/workflows/docker.yml` and other dotfiles.
   If uploading via the GitHub website, ensure that hidden `.github` files are included.
3. Commit to `main`.
4. Check GitHub → Actions → **Publish VonBot Docker Image** for a successful run.
5. In GitHub Packages, make the GHCR container package public, or give Portainer
   access with GitHub registry credentials.

## Mark the first release
From a locally cloned copy of the repository:
    git tag v1.0.0
    git push origin v1.0.0
Wait for the tag-triggered build to finish. The immutable version *name* 1.0.0
then refers to that release image. Do not move this Git tag after publishing.

## First Portainer migration
1. Back up the current Portainer stack Compose file and settings.
2. In Portainer, edit the current VonBot stack and replace the local build
   with the image settings from `docker-compose.portainer.yml`.
3. Preserve any custom ports, networks, reverse proxies, and persistent volumes
   from your existing stack.
4. Update the stack with image pull enabled, and verify the web UI and
   `/api/health` endpoint. The example maps host port 2003 to container port 3000.

## Every later update
    git add .
    git commit -m "Describe change"
    git push

After GitHub Actions finishes successfully, in Portainer select the VonBot
stack → Editor → Update the stack (pull latest image). No npm install, Docker
build, or copied ZIP is needed on the Linux server.

## Roll back
Temporarily change `image:` in Portainer to
`ghcr.io/shields10-cal/vonbot:1.0.0` and update the stack.

## Notes
- Existing historical references such as old test names and CSS class names
  are intentionally preserved to prevent behavioral regressions.
- `package.json` and `/api/health` identify the current release as 1.0.0.
- The original `docker-compose.yml` remains available for local-source builds.
- First deployment may briefly interrupt access while the container is recreated.
