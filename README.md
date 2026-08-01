# 前后向隐私的空间密文检索系统 V1.0

## 系统概述

基于 DSSE-RSKQ（Dual-Bitmap-Based Dynamic Searchable Symmetric Encryption for Spatial Keyword Queries）算法实现的端到端加密检索系统。

- 前向隐私：支持（计数器链）
- 后向隐私：Type-I⁻（状态树）
- 安全参数：λ = 128 bit
- 空间编码：Hilbert 曲线（12阶，4096×4096 网格）
- 空间分解：BPC（二进制前缀覆盖）
- PRF：HMAC-SHA256
- 哈希函数：Blake2b-128（H1-H5）

## 技术栈

| 组件 | 技术 | 版本 | 许可证 |
|------|------|------|--------|
| 后端框架 | Spring Boot | 3.x | Apache 2.0 |
| ORM | MyBatis | 3.x | Apache 2.0 |
| 数据库 | MySQL | 8.0 | GPL |
| 对象存储 | MinIO | latest | AGPL v3 |
| 前端框架 | Vue | 3.4 | MIT |
| 构建工具 | Vite | 5.x | MIT |
| UI 组件 | Element Plus | 2.7 | MIT |
| 地图 | Leaflet | 1.9 | BSD-2 |
| 加密 | Web Crypto API + blake2b-wasm | - | MIT |
| 大整数 | jsbn | 1.1 | BSD |
| 容器 | Docker | - | Apache 2.0 |

## 项目结构

```
secure-spatial-db/
├── backend/                    # 后端 Spring Boot 工程
│   ├── src/main/java/com/ssdb/
│   │   ├── entity/             # 实体层
│   │   ├── dto/                # 数据传输对象
│   │   ├── mapper/             # MyBatis Mapper
│   │   ├── storage/            # 存储适配层（MySQL + MinIO）
│   │   ├── engine/             # 算法引擎（RSKQServer + Hash + Hilbert）
│   │   ├── service/            # 业务逻辑层
│   │   ├── controller/         # REST 控制器
│   │   ├── config/             # 安全与跨域配置
│   │   └── util/               # JWT 与字节工具
│   ├── src/main/resources/
│   │   ├── application.yml     # Spring Boot 配置
│   │   └── db/                 # 数据库 DDL
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                   # 前端 Vue 3 工程
│   ├── src/
│   │   ├── crypto/             # 加密引擎（RSKQClient + WebCrypto + Hilbert）
│   │   ├── views/              # 页面组件
│   │   ├── stores/             # Pinia 状态管理
│   │   ├── api/                # Axios API 封装
│   │   └── router/             # 路由配置
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml          # 容器编排
└── README.md
```

## 部署方式

### Docker Compose 一键部署

```bash
docker-compose up -d --build
```

服务端口：
- 前端：http://localhost (80)
- 后端 API：http://localhost:8080
- MySQL：localhost:3306
- MinIO API：http://localhost:9000
- MinIO 控制台：http://localhost:9001

### 本地开发

后端：
```bash
cd backend
mvn spring-boot:run
```

前端：
```bash
cd frontend
npm install
npm run dev
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/document/upload | POST | 上传加密文档 |
| /api/document/download/{id} | GET | 下载加密文档 |
| /api/document/list | GET | 文档列表 |
| /api/document/{id} | DELETE | 删除文档 |
| /api/edb/update | POST | 加密索引更新 |
| /api/edb/search | POST | 密文检索 |
| /api/edb/sync | POST | 状态同步 |

## 安全特性

1. 客户端加密：所有加密/解密在浏览器端完成，服务器仅存储密文
2. 前向隐私：删除后新增的更新不泄露历史信息
3. 后向隐私：已删除文档不出现在检索结果中
4. IND-CPA 安全：在安全参数下可证明安全
5. JWT 认证：HS256 签名，24小时过期
