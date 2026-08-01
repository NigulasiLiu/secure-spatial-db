#!/bin/bash
set -e

DEPLOY_DIR="/opt/secure-spatial-db"
REGISTRY="registry.cn-hangzhou.aliyuncs.com/ssdb"

echo "=== 1. Pull latest images ==="
docker pull ${REGISTRY}/backend:latest
docker pull ${REGISTRY}/frontend:latest

echo "=== 2. Stop old containers ==="
cd ${DEPLOY_DIR}
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "=== 3. Start new containers ==="
export IMAGE_BACKEND=${REGISTRY}/backend:latest
export IMAGE_FRONTEND=${REGISTRY}/frontend:latest
docker-compose -f docker-compose.prod.yml up -d --no-build

echo "=== 4. Wait for health check ==="
sleep 15

echo "=== 5. Check service status ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== Deploy complete ==="
echo "Frontend: http://$(hostname -I | awk '{print $1}'):80"
echo "Backend:  http://$(hostname -I | awk '{print $1}'):8080"
echo "MinIO:    http://$(hostname -I | awk '{print $1}'):9001"
