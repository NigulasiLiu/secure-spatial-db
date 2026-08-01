package com.ssdb.dto;

import java.util.List;

public class UpdateRequestDto {
    private List<UpdateEntryDto> entries;

    public List<UpdateEntryDto> getEntries() { return entries; }
    public void setEntries(List<UpdateEntryDto> entries) { this.entries = entries; }
}
