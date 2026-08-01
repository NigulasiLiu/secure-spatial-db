package com.ssdb.controller;

import com.ssdb.dto.*;
import com.ssdb.service.EdbService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/edb")
public class EdbController {

    @Autowired
    private EdbService edbService;

    @PostMapping("/update")
    public ResponseEntity<ApiResponseDto<Integer>> update(@RequestBody UpdateRequestDto request) {
        int count = edbService.processUpdate(request);
        return ResponseEntity.ok(ApiResponseDto.ok("update success", count));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponseDto<SearchResultDto>> search(@RequestBody SearchRequestDto request) {
        SearchResultDto result = edbService.executeSearch(request);
        return ResponseEntity.ok(ApiResponseDto.ok(result));
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponseDto<Void>> sync(@RequestBody SyncStateRequestDto request) {
        boolean success = edbService.syncState(request);
        if (success) {
            return ResponseEntity.ok(ApiResponseDto.ok("sync success", null));
        }
        return ResponseEntity.badRequest().body(ApiResponseDto.fail("sync failed"));
    }
}
