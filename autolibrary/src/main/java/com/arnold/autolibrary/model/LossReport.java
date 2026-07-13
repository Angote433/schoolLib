package com.arnold.autolibrary.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "loss_report")
public class LossReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int reportId;

    @ManyToOne
    @JoinColumn(name="copy_id",nullable = false)
    private BookCopy bookCopy;

    @ManyToOne
    @JoinColumn(name="student_id",nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate dateFlagged;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private LossSource source;

    @Column(nullable = false,length = 255)
    private String reason;//reason for flagging loss

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResolutionStatus resolutionStatus;

    private LocalDate dateResolved;
    @Column(columnDefinition = "TEXT")
    private String notes;

    public LossReport() {}

    public LossReport(BookCopy bookCopy, Student student,
                      LossSource source, String reason) {
        this.bookCopy = bookCopy;
        this.student = student;
        this.source = source;
        this.reason = reason;
        this.dateFlagged = LocalDate.now();
        this.resolutionStatus = ResolutionStatus.PENDING;
    }

    public int getReportId() { return reportId; }
    public void setReportId(int reportId) { this.reportId = reportId; }

    public BookCopy getBookCopy() { return bookCopy; }
    public void setBookCopy(BookCopy bookCopy) { this.bookCopy = bookCopy; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public LocalDate getDateFlagged() { return dateFlagged; }
    public void setDateFlagged(LocalDate dateFlagged) { this.dateFlagged = dateFlagged; }

    public LossSource getSource() { return source; }
    public void setSource(LossSource source) { this.source = source; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public ResolutionStatus getResolutionStatus() { return resolutionStatus; }
    public void setResolutionStatus(ResolutionStatus resolutionStatus) { this.resolutionStatus = resolutionStatus; }

    public LocalDate getDateResolved() { return dateResolved; }
    public void setDateResolved(LocalDate dateResolved) { this.dateResolved = dateResolved; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }



}
