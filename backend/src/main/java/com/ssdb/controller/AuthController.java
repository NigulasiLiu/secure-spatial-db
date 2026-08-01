package com.ssdb.controller;

import com.ssdb.dto.ApiResponseDto;
import com.ssdb.dto.AuthRequestDto;
import com.ssdb.dto.LoginResponseDto;
import com.ssdb.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponseDto<Void>> register(@Valid @RequestBody AuthRequestDto request) {
        boolean success = authService.register(request.getUsername(), request.getPassword());
        if (success) {
            return ResponseEntity.ok(ApiResponseDto.ok("register success", null));
        }
        return ResponseEntity.badRequest().body(ApiResponseDto.fail("username already exists"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponseDto<LoginResponseDto>> login(@Valid @RequestBody AuthRequestDto request) {
        LoginResponseDto response = authService.login(request.getUsername(), request.getPassword());
        if (response != null) {
            return ResponseEntity.ok(ApiResponseDto.ok(response));
        }
        return ResponseEntity.badRequest().body(ApiResponseDto.fail("invalid username or password"));
    }
}
