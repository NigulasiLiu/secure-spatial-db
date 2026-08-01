package com.ssdb.entity;

import java.sql.Timestamp;

public class DocMetaEntity {
    private Long id;
    private Integer fileId;
    private String ossObjectKey;
    private String encryptedName;
    private Long fileSize;
    private Timestamp createdAt;

    public DocMetaEntity() {}

    public DocMetaEntity(Integer fileId, String ossObjectKey, String encryptedName, Long fileSize) {
        this.fileId = fileId;
        this.ossObjectKey = ossObjectKey;
        this.encryptedName = encryptedName;
        this.fileSize = fileSize;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getFileId() { return fileId; }
    public void setFileId(Integer fileId) { this.fileId = fileId; }
    public String getOssObjectKey() { return ossObjectKey; }
    public void setOssObjectKey(String ossObjectKey) { this.ossObjectKey = ossObjectKey; }
    public String getEncryptedName() { return encryptedName; }
    public void setEncryptedName(String encryptedName) { this.encryptedName = encryptedName; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
