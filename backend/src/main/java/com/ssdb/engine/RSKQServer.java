package com.ssdb.engine;

import com.ssdb.storage.StorageAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class RSKQServer {

    private static final Logger log = LoggerFactory.getLogger(RSKQServer.class);

    @Autowired
    private StorageAdapter storageAdapter;
    @Autowired
    private HashFunctions hashFunctions;

    public void processUpdate(String table, String indexKey,
                              byte[] chainLink, BigInteger eId, BigInteger eOp) {
        storageAdapter.putEncryptedEntry(table, indexKey, chainLink, eId, eOp);
    }

    public SearchExecutionResult executeSearch(String table, byte[] kx,
                                                byte[] rcnt, int cntU, int cnt) {
        SearchExecutionResult result = new SearchExecutionResult();
        String keyXStr = HashFunctions.bytesToHex(kx);
        BigInteger ex = storageAdapter.getServerState(keyXStr);
        result.encryptedState = ex;

        Map<Integer, BigInteger[]> encryptedBitmaps = new HashMap<>();
        byte[] ri = rcnt;

        for (int i = cnt; i >= cntU; i--) {
            byte[] indexBytes = hashFunctions.hashBytes(kx, ri);
            String indexKey = HashFunctions.bytesToHex(indexBytes);

            StorageAdapter.CipherTextRecord record = storageAdapter.getEncryptedEntry(table, indexKey);
            if (record == null) {
                log.warn("search chain break at i={} key={}", i, indexKey);
                continue;
            }

            encryptedBitmaps.put(i - cntU, new BigInteger[]{record.eId, record.eOp});
            storageAdapter.removeEncryptedEntry(table, indexKey);
            ri = hashFunctions.xorBytes(record.chainLink, hashFunctions.hashBytes(kx, ri));
        }

        result.encryptedBitmaps = encryptedBitmaps;
        return result;
    }

    public void syncState(String keyX, BigInteger stateValue) {
        storageAdapter.putServerState(keyX, stateValue);
    }

    public static class SearchExecutionResult {
        public BigInteger encryptedState;
        public Map<Integer, BigInteger[]> encryptedBitmaps;
    }
}
