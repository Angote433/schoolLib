package com.arnold.autolibrary.dto;

// One row of a copy-registration preview.
// status = "OK" | "DUPLICATE_IN_DB" | "DUPLICATE_IN_BATCH" | "BLANK" | "TOO_LONG"
// conflictTitle is only set for DUPLICATE_IN_DB — the title the existing
// accession number already belongs to.
public class CopyPreviewEntry {

    private String accessionNumber;
    private String status;
    private String conflictTitle;

    public CopyPreviewEntry() {}

    public CopyPreviewEntry(String accessionNumber, String status) {
        this.accessionNumber = accessionNumber;
        this.status = status;
    }

    public String getAccessionNumber() { return accessionNumber; }
    public void setAccessionNumber(String accessionNumber) { this.accessionNumber = accessionNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getConflictTitle() { return conflictTitle; }
    public void setConflictTitle(String conflictTitle) { this.conflictTitle = conflictTitle; }
}
