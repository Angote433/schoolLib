package com.arnold.autolibrary.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name ="borrow_record" )
public class BorrowRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int borrowId;

    @ManyToOne
    @JoinColumn(name = "book_id",nullable = false)
    private BookCopy bookCopy;

    @ManyToOne
    @JoinColumn(name = "student_id",nullable = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate dateBorrowed;
    @Column(nullable=false)
    private LocalDate dateDue;

    private LocalDate dateReturned;

    @ManyToOne
    @JoinColumn(name="issued_by")
    private UserDetails issuedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BorrowStatus status;

    public BorrowRecord() {}

    public BorrowRecord(BookCopy bookCopy, Student student,
                        LocalDate dateDue, UserDetails issuedBy) {
        this.bookCopy = bookCopy;
        this.student = student;
        this.dateDue = dateDue;
        this.issuedBy = issuedBy;
        this.dateBorrowed = LocalDate.now();
        this.status = BorrowStatus.ACTIVE;
    }

    public int getBorrowID() { return borrowId; }
    public void setBorrowID(int borrowId) { this.borrowId = borrowId; }

    public BookCopy getBookCopy() { return bookCopy; }
    public void setBookCopy(BookCopy bookCopy) { this.bookCopy = bookCopy; }

    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }

    public LocalDate getDateBorrowed() { return dateBorrowed; }
    public void setDateBorrowed(LocalDate dateBorrowed) { this.dateBorrowed = dateBorrowed; }

    public LocalDate getDateDue() { return dateDue; }
    public void setDateDue(LocalDate dateDue) { this.dateDue = dateDue; }

    public LocalDate getDateReturned() { return dateReturned; }
    public void setDateReturned(LocalDate dateReturned) { this.dateReturned = dateReturned; }

    public UserDetails getIssuedBy() { return issuedBy; }
    public void setIssuedBy(UserDetails issuedBy) { this.issuedBy = issuedBy; }

    public BorrowStatus getStatus() { return status; }
    public void setStatus(BorrowStatus status) { this.status = status; }


}
