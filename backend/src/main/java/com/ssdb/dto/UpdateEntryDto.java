package com.ssdb.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

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
    // 注意: getEId()/getEOp() 因首两个字母连续大写(EI/EO)，
    // Jackson 默认推导属性名为 "EId"/"EOp"，而前端发送 "eId"/"eOp"，
    // 导致反序列化时两字段为 null(NPE)。这里强制指定 JSON 字段名匹配前端。
    @JsonProperty("eId")
    public String getEId() { return eId; }
    public void setEId(String eId) { this.eId = eId; }
    @JsonProperty("eOp")
    public String getEOp() { return eOp; }
    public void setEOp(String eOp) { this.eOp = eOp; }
    public String getTargetTable() { return targetTable; }
    public void setTargetTable(String targetTable) { this.targetTable = targetTable; }
}
