package com.ssdb.entity;

import java.sql.Timestamp;

public class UserEntity {
    private Long id;
    private String username;
    private String passwordHash;
    private Integer jwtVersion;
    private Timestamp createdAt;

    public UserEntity() {}

    public UserEntity(String username, String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.jwtVersion = 1;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Integer getJwtVersion() { return jwtVersion; }
    public void setJwtVersion(Integer jwtVersion) { this.jwtVersion = jwtVersion; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
