package com.ssdb.dto;

import java.util.List;

public class SearchResultDto {
    private List<SearchResponseDto> results;

    public List<SearchResponseDto> getResults() { return results; }
    public void setResults(List<SearchResponseDto> results) { this.results = results; }
}
