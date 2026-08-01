package com.ssdb.dto;

public class SearchTokenDto {
    private String kx;
    private String rcnt;
    private int cntU;
    private int cnt;
    private String targetTable;

    public String getKx() { return kx; }
    public void setKx(String kx) { this.kx = kx; }
    public String getRcnt() { return rcnt; }
    public void setRcnt(String rcnt) { this.rcnt = rcnt; }
    public int getCntU() { return cntU; }
    public void setCntU(int cntU) { this.cntU = cntU; }
    public int getCnt() { return cnt; }
    public void setCnt(int cnt) { this.cnt = cnt; }
    public String getTargetTable() { return targetTable; }
    public void setTargetTable(String targetTable) { this.targetTable = targetTable; }
}
