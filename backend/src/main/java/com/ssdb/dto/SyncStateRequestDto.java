package com.ssdb.dto;

import java.util.List;

public class SyncStateRequestDto {
    private List<SyncStateEntryDto> states;

    public List<SyncStateEntryDto> getStates() { return states; }
    public void setStates(List<SyncStateEntryDto> states) { this.states = states; }
}
