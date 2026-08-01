package com.ssdb.entity;

import java.sql.Timestamp;

public class SsEntity {
    private Long id;
    private String keyX;
    private byte[] stateValue;
    private Timestamp updatedAt;

    public SsEntity() {}

    public SsEntity(String keyX, byte[] stateValue) {
        this.keyX = keyX;
        this.stateValue = stateValue;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getKeyX() { return keyX; }
    public void setKeyX(String keyX) { this.keyX = keyX; }
    public byte[] getStateValue() { return stateValue; }
    public void setStateValue(byte[] stateValue) { this.stateValue = stateValue; }
    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
