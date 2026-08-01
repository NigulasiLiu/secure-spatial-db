package com.ssdb.service;

import com.ssdb.dto.DocMetaDto;
import com.ssdb.entity.DocMetaEntity;
import com.ssdb.mapper.DocMetaMapper;
import com.ssdb.storage.MinioFileStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocMetaMapper docMetaMapper;
    @Autowired
    private MinioFileStorage minioFileStorage;

    public Integer uploadEncryptedDocument(byte[] encryptedContent, String encryptedName) {
        Integer fileId = docMetaMapper.selectMaxFileId();
        if (fileId == null) fileId = 0;
        fileId = fileId + 1;

        String objectKey = "encrypted-files/" + String.format("%05d", fileId) + ".enc";
        minioFileStorage.upload(objectKey, encryptedContent);

        DocMetaEntity entity = new DocMetaEntity(fileId, objectKey, encryptedName, (long) encryptedContent.length);
        docMetaMapper.insert(entity);
        log.info("uploaded document file_id={} size={}", fileId, encryptedContent.length);
        return fileId;
    }

    public byte[] downloadEncryptedDocument(Integer fileId) {
        DocMetaEntity entity = docMetaMapper.selectByFileId(fileId);
        if (entity == null) {
            log.warn("download failed: file_id {} not found", fileId);
            return null;
        }
        return minioFileStorage.download(entity.getOssObjectKey());
    }

    public List<DocMetaDto> listDocuments() {
        List<DocMetaEntity> entities = docMetaMapper.selectAll();
        List<DocMetaDto> result = new ArrayList<>();
        for (DocMetaEntity e : entities) {
            DocMetaDto dto = new DocMetaDto();
            dto.setFileId(e.getFileId());
            dto.setEncryptedName(e.getEncryptedName());
            dto.setFileSize(e.getFileSize());
            Timestamp ts = e.getCreatedAt();
            dto.setCreatedAt(ts != null ? ts.toString() : null);
            result.add(dto);
        }
        return result;
    }

    public boolean deleteDocument(Integer fileId) {
        DocMetaEntity entity = docMetaMapper.selectByFileId(fileId);
        if (entity == null) return false;
        minioFileStorage.delete(entity.getOssObjectKey());
        docMetaMapper.deleteByFileId(fileId);
        log.info("deleted document file_id={}", fileId);
        return true;
    }
}
