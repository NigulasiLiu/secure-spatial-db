CREATE TABLE IF NOT EXISTS edb_p (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    index_key   VARCHAR(256) NOT NULL,
    chain_link  VARBINARY(128) NOT NULL,
    e_id        VARBINARY(512) NOT NULL,
    e_op        VARBINARY(512) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_index_key (index_key),
    INDEX idx_index_key (index_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS edb_k (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    index_key   VARCHAR(256) NOT NULL,
    chain_link  VARBINARY(128) NOT NULL,
    e_id        VARBINARY(512) NOT NULL,
    e_op        VARBINARY(512) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_index_key (index_key),
    INDEX idx_index_key (index_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ss (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    key_x       VARCHAR(256) NOT NULL,
    state_value VARBINARY(512) NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_key_x (key_x)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS doc_meta (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_id         INT NOT NULL,
    oss_object_key  VARCHAR(512) NOT NULL,
    encrypted_name  VARCHAR(512),
    file_size       BIGINT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_file_id (file_id),
    INDEX idx_oss_key (oss_object_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(128) NOT NULL,
    password_hash   VARCHAR(256) NOT NULL,
    jwt_version     INT DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
