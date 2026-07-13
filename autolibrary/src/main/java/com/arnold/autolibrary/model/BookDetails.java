package com.arnold.autolibrary.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name="book_details")
public class BookDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int detailsId;

    @Column(nullable = false,length = 150 )
    private String titleName;

    @Column(nullable = false,length = 80)
    private String subject;

    @Column(nullable = false)
    private int gradeLevel;
    @Column(length = 100)//optional
    private String publisher;
    @Column(nullable = false)
    private int copies;

    @Column(nullable=false,updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public BookDetails() {}

    public BookDetails(String titleName, String subject,
                       int gradeLevel, String publisher) {
        this.titleName = titleName;
        this.subject = subject;
        this.gradeLevel = gradeLevel;
        this.publisher = publisher;
        this.copies = 0;
    }

    public int getDetailsId() { return detailsId; }
    public void setDetailsID(int detailsId) { this.detailsId = detailsId; }

    public String getTitleName() { return titleName; }
    public void setTitleName(String titleName) { this.titleName = titleName; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public int getGradeLevel() { return gradeLevel; }
    public void setGradeLevel(int gradeLevel) { this.gradeLevel = gradeLevel; }

    public String getPublisher() { return publisher; }
    public void setPublisher(String publisher) { this.publisher = publisher; }

    public int getCopies() { return copies; }
    public void setCopies(int copies) { this.copies = copies; }

    public LocalDateTime getCreatedAt() { return createdAt; }

}
