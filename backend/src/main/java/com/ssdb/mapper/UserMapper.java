package com.ssdb.mapper;

import com.ssdb.entity.UserEntity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface UserMapper {

    @Insert("INSERT INTO user (username, password_hash, jwt_version) VALUES (#{username}, #{passwordHash}, 1)")
    int insert(UserEntity entity);

    @Select("SELECT id, username, password_hash, jwt_version, created_at FROM user WHERE username = #{username}")
    UserEntity selectByUsername(@Param("username") String username);

    @Update("UPDATE user SET jwt_version = jwt_version + 1 WHERE username = #{username}")
    int incrementJwtVersion(@Param("username") String username);

    @Select("SELECT COUNT(*) FROM user")
    long count();
}
