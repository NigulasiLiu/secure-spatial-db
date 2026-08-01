package com.ssdb.service;

import com.ssdb.dto.*;
import com.ssdb.engine.RSKQServer;
import com.ssdb.util.ByteUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EdbService {

    private static final Logger log = LoggerFactory.getLogger(EdbService.class);

    @Autowired
    private RSKQServer rskqServer;

    public int processUpdate(UpdateRequestDto request) {
        int count = 0;
        for (UpdateEntryDto entry : request.getEntries()) {
            String table = entry.getTargetTable();
            String indexKey = entry.getIndexKey();
            byte[] chainLink = ByteUtil.base64ToBytes(entry.getChainLink());
            BigInteger eId = ByteUtil.base64ToBigInteger(entry.getEId());
            BigInteger eOp = ByteUtil.base64ToBigInteger(entry.getEOp());
            rskqServer.processUpdate(table, indexKey, chainLink, eId, eOp);
            count++;
        }
        log.info("processed {} update entries", count);
        return count;
    }

    public SearchResultDto executeSearch(SearchRequestDto request) {
        List<SearchResponseDto> results = new ArrayList<>();

        for (SearchTokenDto token : request.getTokens()) {
            byte[] kx = ByteUtil.base64ToBytes(token.getKx());
            byte[] rcnt = ByteUtil.base64ToBytes(token.getRcnt());
            int cntU = token.getCntU();
            int cnt = token.getCnt();
            String table = token.getTargetTable();

            RSKQServer.SearchExecutionResult execResult = rskqServer.executeSearch(table, kx, rcnt, cntU, cnt);

            SearchResponseDto dto = new SearchResponseDto();
            dto.setEncryptedState(ByteUtil.bigIntegerToBase64(execResult.encryptedState));

            Map<String, String[]> bitmapMap = new HashMap<>();
            for (Map.Entry<Integer, BigInteger[]> e : execResult.encryptedBitmaps.entrySet()) {
                String[] pair = new String[2];
                pair[0] = ByteUtil.bigIntegerToBase64(e.getValue()[0]);
                pair[1] = ByteUtil.bigIntegerToBase64(e.getValue()[1]);
                bitmapMap.put(String.valueOf(e.getKey()), pair);
            }
            dto.setEncryptedBitmaps(bitmapMap);
            results.add(dto);
        }

        SearchResultDto result = new SearchResultDto();
        result.setResults(results);
        log.info("executed search with {} tokens, returned {} results", request.getTokens().size(), results.size());
        return result;
    }

    public boolean syncState(SyncStateRequestDto request) {
        for (SyncStateEntryDto entry : request.getStates()) {
            BigInteger stateValue = ByteUtil.base64ToBigInteger(entry.getStateValue());
            rskqServer.syncState(entry.getKeyX(), stateValue);
        }
        log.info("synced {} state entries", request.getStates().size());
        return true;
    }
}
