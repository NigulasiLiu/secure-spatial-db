package com.ssdb.mapper;

import com.ssdb.entity.DocMetaEntity;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface DocMetaMapper {

    @Insert("INSERT INTO doc_meta (file_id, oss_object_key, encrypted_name, file_size) " +
            "VALUES (#{fileId}, #{ossObjectKey}, #{encryptedName}, #{fileSize})")
    int insert(DocMetaEntity entity);

    @Select("SELECT id, file_id, oss_object_key, encrypted_name, file_size, created_at FROM doc_meta WHERE file_id = #{fileId}")
    DocMetaEntity selectByFileId(@Param("fileId") Integer fileId);

    @Select("SELECT id, file_id, oss_object_key, encrypted_name, file_size, created_at FROM doc_meta ORDER BY file_id ASC")
    List<DocMetaEntity> selectAll();

    @Delete("DELETE FROM doc_meta WHERE file_id = #{fileId}")
    int deleteByFileId(@Param("fileId") Integer fileId);

    @Select("SELECT COALESCE(MAX(file_id), 0) FROM doc_meta")
    Integer selectMaxFileId();
}
