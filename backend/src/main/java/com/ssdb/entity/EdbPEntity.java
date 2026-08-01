package com.ssdb.entity;

import java.sql.Timestamp;

public class EdbPEntity {
    private Long id;
    private String indexKey;
    private byte[] chainLink;
    private byte[] eId;
    private byte[] eOp;
    private Timestamp createdAt;

    public EdbPEntity() {}

    public EdbPEntity(String indexKey, byte[] chainLink, byte[] eId, byte[] eOp) {
        this.indexKey = indexKey;
        this.chainLink = chainLink;
        this.eId = eId;
        this.eOp = eOp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getIndexKey() { return indexKey; }
    public void setIndexKey(String indexKey) { this.indexKey = indexKey; }
    public byte[] getChainLink() { return chainLink; }
    public void setChainLink(byte[] chainLink) { this.chainLink = chainLink; }
    public byte[] getEId() { return eId; }
    public void setEId(byte[] eId) { this.eId = eId; }
    public byte[] getEOp() { return eOp; }
    public void setEOp(byte[] eOp) { this.eOp = eOp; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
