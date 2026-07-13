package com.arnold.autolibrary.model;

import jakarta.persistence.*;

import java.time.LocalDate;


@Entity
@Table(name = "book_copy")
public class BookCopy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int bookId;

    @ManyToOne
    @JoinColumn(name="details_id",nullable = false)
    private BookDetails bookDetails;

    @Column(nullable = false,unique = true, length = 50)
    private String qrCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookStatus status;

    @Column(nullable = false)
    private boolean isActive;

    @Column(nullable = false)
    private LocalDate dateAcquired;

    public BookCopy() {}

    public BookCopy(BookDetails bookDetails, String qrCode, LocalDate dateAcquired) {
        this.bookDetails = bookDetails;
        this.qrCode = qrCode;
        this.dateAcquired = dateAcquired;
        this.status = BookStatus.AVAILABLE; // every new copy starts as available
        this.isActive = true;
    }

    public int getBookId() { return bookId; }
    public void setBookID(int bookId) { this.bookId = bookId; }

    public BookDetails getBookDetails() { return bookDetails; }
    public void setBookDetails(BookDetails bookDetails) { this.bookDetails = bookDetails; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }

    public BookStatus getStatus() { return status; }
    public void setStatus(BookStatus status) { this.status = status; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }

    public LocalDate getDateAcquired() { return dateAcquired; }
    public void setDateAcquired(LocalDate dateAcquired) { this.dateAcquired = dateAcquired; }



}
