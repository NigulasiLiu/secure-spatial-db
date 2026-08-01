package com.ssdb.service;

import com.ssdb.dto.LoginResponseDto;
import com.ssdb.entity.UserEntity;
import com.ssdb.mapper.UserMapper;
import com.ssdb.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserMapper userMapper;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    public boolean register(String username, String password) {
        if (userMapper.selectByUsername(username) != null) {
            log.warn("register failed: username {} already exists", username);
            return false;
        }
        String hash = passwordEncoder.encode(password);
        userMapper.insert(new UserEntity(username, hash));
        log.info("user registered: {}", username);
        return true;
    }

    public LoginResponseDto login(String username, String password) {
        UserEntity user = userMapper.selectByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            log.warn("login failed for username: {}", username);
            return null;
        }
        String token = jwtUtil.generateToken(username, user.getJwtVersion());
        log.info("user logged in: {}", username);
        return new LoginResponseDto(token, jwtUtil.getExpiration());
    }
}
