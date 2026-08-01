package com.ssdb.dto;

public class DocMetaDto {
    private Integer fileId;
    private String encryptedName;
    private Long fileSize;
    private String createdAt;

    public Integer getFileId() { return fileId; }
    public void setFileId(Integer fileId) { this.fileId = fileId; }
    public String getEncryptedName() { return encryptedName; }
    public void setEncryptedName(String encryptedName) { this.encryptedName = encryptedName; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
