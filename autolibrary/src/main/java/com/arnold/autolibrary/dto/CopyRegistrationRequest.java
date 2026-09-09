package com.arnold.autolibrary.dto;

import java.time.LocalDate;

// Payload shared by both the preview and the real registration endpoint
// (POST /api/books/{detailsId}/copies/preview and .../copies) so the
// librarian can preview exactly what they are about to commit.
//
// mode = "AUTO" | "RANGE" | "LIST" — only the fields relevant to the
// chosen mode need to be set; the rest are ignored.
public class CopyRegistrationRequest {

    private String mode;
    private LocalDate dateAcquired;

    // Mode A — AUTO
    private Integer quantity;

    // Mode B — RANGE
    private String prefix;
    private Integer start;
    private Integer count;
    private Integer padWidth;
    private String suffix;

    // Mode C — LIST
    private String rawList;

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public LocalDate getDateAcquired() { return dateAcquired; }
    public void setDateAcquired(LocalDate dateAcquired) { this.dateAcquired = dateAcquired; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }

    public Integer getStart() { return start; }
    public void setStart(Integer start) { this.start = start; }

    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }

    public Integer getPadWidth() { return padWidth; }
    public void setPadWidth(Integer padWidth) { this.padWidth = padWidth; }

    public String getSuffix() { return suffix; }
    public void setSuffix(String suffix) { this.suffix = suffix; }

    public String getRawList() { return rawList; }
    public void setRawList(String rawList) { this.rawList = rawList; }
}
