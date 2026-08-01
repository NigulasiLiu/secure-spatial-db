package com.ssdb.storage;

import com.ssdb.entity.EdbKEntity;
import com.ssdb.entity.EdbPEntity;
import com.ssdb.entity.SsEntity;
import com.ssdb.mapper.EdbKMapper;
import com.ssdb.mapper.EdbPMapper;
import com.ssdb.mapper.SsMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigInteger;

@Repository
public class MySQLStorageAdapter implements StorageAdapter {

    private static final Logger log = LoggerFactory.getLogger(MySQLStorageAdapter.class);

    @Autowired
    private EdbPMapper edbPMapper;
    @Autowired
    private EdbKMapper edbKMapper;
    @Autowired
    private SsMapper ssMapper;
    @Autowired
    private MinioFileStorage minioFileStorage;

    @Override
    public void putEncryptedEntry(String table, String indexKey,
                                  byte[] chainLink, BigInteger eId, BigInteger eOp) {
        byte[] eIdBytes = eId.toByteArray();
        byte[] eOpBytes = eOp.toByteArray();
        if ("edb_p".equals(table)) {
            EdbPEntity entity = new EdbPEntity(indexKey, chainLink, eIdBytes, eOpBytes);
            edbPMapper.insert(entity);
            log.debug("inserted edb_p entry key={}", indexKey);
        } else {
            EdbKEntity entity = new EdbKEntity(indexKey, chainLink, eIdBytes, eOpBytes);
            edbKMapper.insert(entity);
            log.debug("inserted edb_k entry key={}", indexKey);
        }
    }

    @Override
    public CipherTextRecord getEncryptedEntry(String table, String indexKey) {
        if ("edb_p".equals(table)) {
            EdbPEntity entity = edbPMapper.selectByKey(indexKey);
            if (entity == null) return null;
            return new CipherTextRecord(
                    entity.getChainLink(),
                    new BigInteger(1, entity.getEId()),
                    new BigInteger(1, entity.getEOp())
            );
        } else {
            EdbKEntity entity = edbKMapper.selectByKey(indexKey);
            if (entity == null) return null;
            return new CipherTextRecord(
                    entity.getChainLink(),
                    new BigInteger(1, entity.getEId()),
                    new BigInteger(1, entity.getEOp())
            );
        }
    }

    @Override
    public void removeEncryptedEntry(String table, String indexKey) {
        if ("edb_p".equals(table)) {
            edbPMapper.deleteByKey(indexKey);
            log.debug("removed edb_p entry key={}", indexKey);
        } else {
            edbKMapper.deleteByKey(indexKey);
            log.debug("removed edb_k entry key={}", indexKey);
        }
    }

    @Override
    public BigInteger getServerState(String keyX) {
        SsEntity entity = ssMapper.selectByKey(keyX);
        if (entity == null) return BigInteger.ZERO;
        return new BigInteger(1, entity.getStateValue());
    }

    @Override
    public void putServerState(String keyX, BigInteger state) {
        SsEntity entity = new SsEntity(keyX, state.toByteArray());
        ssMapper.upsert(entity);
        log.debug("upserted server state key={}", keyX);
    }

    @Override
    public void uploadEncryptedFile(String objectKey, byte[] encryptedContent) {
        minioFileStorage.upload(objectKey, encryptedContent);
    }

    @Override
    public byte[] downloadEncryptedFile(String objectKey) {
        return minioFileStorage.download(objectKey);
    }

    @Override
    public void deleteEncryptedFile(String objectKey) {
        minioFileStorage.delete(objectKey);
    }
}
