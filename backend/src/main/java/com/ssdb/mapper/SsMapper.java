package com.ssdb.mapper;

import com.ssdb.entity.SsEntity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface SsMapper {

    @Insert("INSERT INTO ss (key_x, state_value) VALUES (#{keyX}, #{stateValue}) " +
            "ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)")
    int upsert(SsEntity entity);

    @Select("SELECT id, key_x, state_value, updated_at FROM ss WHERE key_x = #{keyX}")
    SsEntity selectByKey(@Param("keyX") String keyX);

    @Delete("DELETE FROM ss WHERE key_x = #{keyX}")
    int deleteByKey(@Param("keyX") String keyX);
}
