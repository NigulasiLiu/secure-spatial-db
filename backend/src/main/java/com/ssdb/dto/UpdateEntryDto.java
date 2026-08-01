package com.ssdb.dto;

import java.util.List;

public class UpdateEntryDto {
    private String indexKey;
    private String chainLink;
    private String eId;
    private String eOp;
    private String targetTable;

    public String getIndexKey() { return indexKey; }
    public void setIndexKey(String indexKey) { this.indexKey = indexKey; }
    public String getChainLink() { return chainLink; }
    public void setChainLink(String chainLink) { this.chainLink = chainLink; }
    public String getEId() { return eId; }
    public void setEId(String eId) { this.eId = eId; }
    public String getEOp() { return eOp; }
    public void setEOp(String eOp) { this.eOp = eOp; }
    public String getTargetTable() { return targetTable; }
    public void setTargetTable(String targetTable) { this.targetTable = targetTable; }
}
