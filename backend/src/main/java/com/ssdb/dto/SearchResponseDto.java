package com.ssdb.dto;

import java.util.Map;

public class SearchResponseDto {
    private String encryptedState;
    private Map<String, String[]> encryptedBitmaps;

    public String getEncryptedState() { return encryptedState; }
    public void setEncryptedState(String encryptedState) { this.encryptedState = encryptedState; }
    public Map<String, String[]> getEncryptedBitmaps() { return encryptedBitmaps; }
    public void setEncryptedBitmaps(Map<String, String[]> encryptedBitmaps) { this.encryptedBitmaps = encryptedBitmaps; }
}
