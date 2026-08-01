package com.ssdb.storage;

import java.math.BigInteger;

public interface StorageAdapter {

    void putEncryptedEntry(String table, String indexKey,
                           byte[] chainLink, BigInteger eId, BigInteger eOp);

    CipherTextRecord getEncryptedEntry(String table, String indexKey);

    void removeEncryptedEntry(String table, String indexKey);

    BigInteger getServerState(String keyX);

    void putServerState(String keyX, BigInteger state);

    void uploadEncryptedFile(String objectKey, byte[] encryptedContent);

    byte[] downloadEncryptedFile(String objectKey);

    void deleteEncryptedFile(String objectKey);

    class CipherTextRecord {
        public final byte[] chainLink;
        public final BigInteger eId;
        public final BigInteger eOp;

        public CipherTextRecord(byte[] chainLink, BigInteger eId, BigInteger eOp) {
            this.chainLink = chainLink;
            this.eId = eId;
            this.eOp = eOp;
        }
    }
}
