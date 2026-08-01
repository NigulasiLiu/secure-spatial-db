package com.ssdb.mapper;

import com.ssdb.entity.EdbKEntity;
import org.apache.ibatis.annotations.*;

@Mapper
public interface EdbKMapper {

    @Insert("INSERT INTO edb_k (index_key, chain_link, e_id, e_op) VALUES (#{indexKey}, #{chainLink}, #{eId}, #{eOp}) " +
            "ON DUPLICATE KEY UPDATE chain_link = VALUES(chain_link), e_id = VALUES(e_id), e_op = VALUES(e_op)")
    int insert(EdbKEntity entity);

    @Select("SELECT id, index_key, chain_link, e_id, e_op, created_at FROM edb_k WHERE index_key = #{indexKey}")
    EdbKEntity selectByKey(@Param("indexKey") String indexKey);

    @Delete("DELETE FROM edb_k WHERE index_key = #{indexKey}")
    int deleteByKey(@Param("indexKey") String indexKey);

    @Select("SELECT COUNT(*) FROM edb_k")
    long count();
}
