# 前后向隐私的空间密文检索系统 V1.0 — 阿里云部署指南

## 一、服务器规格评估

### 1.1 系统资源需求

| 组件 | 最低内存 | 推荐内存 | CPU需求 |
|------|---------|---------|---------|
| MySQL 8.0 | 300MB（调优后） | 1GB | 0.5核 |
| MinIO | 256MB | 512MB | 0.25核 |
| Spring Boot (Java 17) | 384MB（-Xmx384m） | 1GB | 1核 |
| Nginx (前端) | 20MB | 50MB | 0.1核 |
| Docker Daemon | 100MB | 150MB | 0.1核 |
| 操作系统 | 200MB | 300MB | 0.1核 |
| **合计** | **~1.26GB** | **~3GB** | **~2核** |

### 1.2 规格结论

| 服务器规格 | 评估 | 建议 |
|-----------|------|------|
| **2核 2GB ECS** | ⚠️ 勉强可用 | 需 aggressive 内存调优 + 2GB swap，仅适合演示/验证。MySQL innodb_buffer_pool=128M，JVM -Xmx384m。并发超过5个请求可能OOM |
| **4核 8GB（本地/华为云）** | ✅ 推荐使用 | 默认配置即可运行全部组件，可承载中等并发。建议优先使用此规格部署 |
| **4核 8GB（华为云开发者空间）** | ✅ 推荐使用 | 与本地同规格，适合开发调试 + 演示部署 |

**结论：2核2G可部署但需调优，建议用4核8G（本地或华为云）做首次完整部署验证。**

---

## 二、2核2G ECS 内存调优方案

若必须在2核2G ECS上部署，使用以下 docker-compose 覆盖文件：

文件：`docker-compose.lowmem.yml`

```yaml
version: '3.8'
services:
  mysql:
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb-buffer-pool-size=128M
      --innodb-log-file-size=32M
      --max-connections=50
      --thread-cache-size=4
      --table-open-cache=100
    mem_limit: 400m

  minio:
    mem_limit: 300m

  backend:
    environment:
      JAVA_OPTS: "-Xms128m -Xmx384m -XX:MaxMetaspaceSize=128m"
    mem_limit: 512m

  frontend:
    mem_limit: 64m
```

部署命令：
```bash
docker-compose -f docker-compose.yml -f docker-compose.lowmem.yml up -d --build
```

同时创建 2GB swap：
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 三、阿里云 Codeup CI/CD 流水线

### 3.1 前置准备

1. **阿里云 Codeup**：创建代码仓库 `secure-spatial-db`，推送代码
2. **阿里云容器镜像服务 ACR**：创建命名空间 `ssdb`，创建镜像仓库 `backend`、`frontend`
3. **ECS 服务器**：安装 Docker + Docker Compose
4. **RAM 访问密钥**：创建 AccessKey，授予 ACR 读写权限

### 3.2 ECS 服务器初始化（一次性）

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable docker && sudo systemctl start docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.26.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 配置 ACR 登录
sudo docker login --username=<ACR用户名> registry.cn-hangzhou.aliyuncs.com -p <ACR密码>

# 创建项目目录
sudo mkdir -p /opt/secure-spatial-db && cd /opt/secure-spatial-db
```

### 3.3 Codeup 流水线配置

在 Codeup 仓库根目录创建 `.codeup-ci.yml`：

```yaml
sources:
  default:
    type: codeup
    name: secure-spatial-db
    branch: master

envs:
  ACR_REGISTRY: "registry.cn-hangzhou.aliyuncs.com"
  ACR_NAMESPACE: "ssdb"
  IMAGE_BACKEND: "${ACR_REGISTRY}/${ACR_NAMESPACE}/backend:${CI_COMMIT_SHORT_SHA}"
  IMAGE_FRONTEND: "${ACR_REGISTRY}/${ACR_NAMESPACE}/frontend:${CI_COMMIT_SHORT_SHA}"
  ECS_HOST: "${ECS_HOST}"
  ECS_USER: "root"
  DEPLOY_DIR: "/opt/secure-spatial-db"

stages:
  build:
    name: "构建镜像"
    jobs:
      build_backend:
        steps:
          - step: Script
            name: "构建后端镜像"
            script:
              - docker build -t ${IMAGE_BACKEND} ./backend
              - docker push ${IMAGE_BACKEND}
          - step: Script
            name: "构建前端镜像"
            script:
              - docker build -t ${IMAGE_FRONTEND} ./frontend
              - docker push ${IMAGE_FRONTEND}

  deploy:
    name: "部署到ECS"
    depends_on: build
    jobs:
      deploy_job:
        steps:
          - step: Script
            name: "SSH部署"
            script:
              - ssh -o StrictHostKeyChecking=no ${ECS_USER}@${ECS_HOST} "
                  cd ${DEPLOY_DIR} &&
                  docker pull ${IMAGE_BACKEND} &&
                  docker pull ${IMAGE_FRONTEND} &&
                  export IMAGE_BACKEND=${IMAGE_BACKEND} &&
                  export IMAGE_FRONTEND=${IMAGE_FRONTEND} &&
                  docker-compose -f docker-compose.prod.yml up -d --no-build &&
                  docker image prune -f
                "
```

### 3.4 生产环境 docker-compose

文件：`docker-compose.prod.yml`（放在 ECS 的 `/opt/secure-spatial-db/` 下）

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    container_name: ssdb-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ssdb
      MYSQL_USER: ssdb
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
      - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --innodb-buffer-pool-size=256M

  minio:
    image: minio/minio:latest
    container_name: ssdb-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"

  backend:
    image: ${IMAGE_BACKEND}
    container_name: ssdb-backend
    restart: unless-stopped
    depends_on:
      - mysql
      - minio
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/ssdb?useSSL=false&serverTimezone=Asia/Shanghai
      SPRING_DATASOURCE_USERNAME: ssdb
      SPRING_DATASOURCE_PASSWORD: ${MYSQL_PASSWORD}
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY}
      MINIO_BUCKET: encrypted-files
      JWT_SECRET: ${JWT_SECRET}
      JAVA_OPTS: "-Xmx512m"
    ports:
      - "8080:8080"

  frontend:
    image: ${IMAGE_FRONTEND}
    container_name: ssdb-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  mysql-data:
  minio-data:
```

---

## 四、一键部署脚本

### 4.1 ECS 一键部署（手动触发）

文件：`deploy-ecs.sh`

```bash
#!/bin/bash
set -e

DEPLOY_DIR="/opt/secure-spatial-db"
REGISTRY="registry.cn-hangzhou.aliyuncs.com/ssdb"

echo "=== 1. 拉取最新镜像 ==="
docker pull ${REGISTRY}/backend:latest
docker pull ${REGISTRY}/frontend:latest

echo "=== 2. 停止旧容器 ==="
cd ${DEPLOY_DIR}
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "=== 3. 启动新容器 ==="
export IMAGE_BACKEND=${REGISTRY}/backend:latest
export IMAGE_FRONTEND=${REGISTRY}/frontend:latest
docker-compose -f docker-compose.prod.yml up -d --no-build

echo "=== 4. 等待健康检查 ==="
sleep 15

echo "=== 5. 检查服务状态 ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== 部署完成 ==="
echo "前端: http://$(hostname -I | awk '{print $1}'):80"
echo "后端: http://$(hostname -I | awk '{print $1}'):8080"
echo "MinIO控制台: http://$(hostname -I | awk '{print $1}'):9001"
```

### 4.2 本地/华为云4核8G一键部署

```bash
cd secure-spatial-db
docker-compose up -d --build
```

等待约2-3分钟完成构建和启动。访问 http://localhost 即可使用。

---

## 五、部署架构

```
                    Internet
                       |
              +------------------+
              |   ECS / 本地服务器  |
              |  +------------+  |
              |  |  Nginx:80  |  |  ← 前端静态资源 + 反向代理
              |  +-----+------+  |
              |        |         |
              |  +-----v------+  |
              |  | Backend:8080|  |  ← Spring Boot API
              |  +--+-----+---+  |
              |     |     |      |
              |  +--v-+ +--v--+  |
              |  |MySQL| |MinIO|  |  ← 数据存储
              |  +-----+ +-----+  |
              +------------------+
```

所有组件运行在同一台服务器上，通过 Docker 网络互通。MySQL 和 MinIO 仅绑定 127.0.0.1，不对外暴露。

---

## 六、安全注意事项

1. **修改默认密码**：docker-compose 中的所有密码必须替换为强密码
2. **防火墙配置**：仅开放 80（前端）和 22（SSH），8080/3306/9000/9001 仅内网访问
3. **HTTPS**：建议在 Nginx 前加 SLB 或配置 Let's Encrypt 证书
4. **数据库备份**：定期 `docker exec ssdb-mysql mysqldump -u root -p ssdb > backup.sql`
5. **MinIO 数据备份**：定期备份 Docker volume `minio-data`
