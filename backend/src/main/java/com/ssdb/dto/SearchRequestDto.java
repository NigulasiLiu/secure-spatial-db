package com.ssdb.dto;

import java.util.List;

public class SearchRequestDto {
    private List<SearchTokenDto> tokens;

    public List<SearchTokenDto> getTokens() { return tokens; }
    public void setTokens(List<SearchTokenDto> tokens) { this.tokens = tokens; }
}
