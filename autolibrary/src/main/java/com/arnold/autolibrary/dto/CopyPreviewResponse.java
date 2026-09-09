package com.arnold.autolibrary.dto;

import java.util.List;

// Response body of POST /api/books/{detailsId}/copies/preview — read-only,
// never causes any insert. The librarian reviews this before the real
// registration call is made with the same request payload.
public class CopyPreviewResponse {

    private int totalRequested;
    private List<CopyPreviewEntry> entries;
    private int okCount;
    private int conflictCount;

    public int getTotalRequested() { return totalRequested; }
    public void setTotalRequested(int totalRequested) { this.totalRequested = totalRequested; }

    public List<CopyPreviewEntry> getEntries() { return entries; }
    public void setEntries(List<CopyPreviewEntry> entries) { this.entries = entries; }

    public int getOkCount() { return okCount; }
    public void setOkCount(int okCount) { this.okCount = okCount; }

    public int getConflictCount() { return conflictCount; }
    public void setConflictCount(int conflictCount) { this.conflictCount = conflictCount; }
}
