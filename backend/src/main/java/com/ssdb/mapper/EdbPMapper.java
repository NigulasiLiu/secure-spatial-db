package com.ssdb.mapper;

import com.ssdb.entity.EdbPEntity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface EdbPMapper {

    @Insert("INSERT INTO edb_p (index_key, chain_link, e_id, e_op) VALUES (#{indexKey}, #{chainLink}, #{eId}, #{eOp}) " +
            "ON DUPLICATE KEY UPDATE chain_link = VALUES(chain_link), e_id = VALUES(e_id), e_op = VALUES(e_op)")
    int insert(EdbPEntity entity);

    @Select("SELECT id, index_key, chain_link, e_id, e_op, created_at FROM edb_p WHERE index_key = #{indexKey}")
    EdbPEntity selectByKey(@Param("indexKey") String indexKey);

    @Delete("DELETE FROM edb_p WHERE index_key = #{indexKey}")
    int deleteByKey(@Param("indexKey") String indexKey);

    @Select("SELECT COUNT(*) FROM edb_p")
    long count();
}
