package com.arnold.autolibrary.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "student")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int studentId;

    @Column(nullable = false , unique = true,length = 20)
    private String admissionNumber;

    @Column(nullable = false,length = 100 )
    private String fullName;

    @ManyToOne
    @JoinColumn(name = "stream_id",nullable = false)
    private Stream stream;

    @Column(nullable = false)
    private int yearEnrolled;

    @Column(nullable = false)
    private boolean isActive;

    @ManyToOne
    @JoinColumn(name="created_by")
    private UserDetails createdBy;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate(){
        this.createdAt= LocalDateTime.now();
    }
    public Student() {}

    public Student(String admissionNumber, String fullName,
                   Stream stream, int yearEnrolled) {
        this.admissionNumber = admissionNumber;
        this.fullName = fullName;
        this.stream = stream;
        this.yearEnrolled = yearEnrolled;
        this.isActive = true;
    }

    public int getStudentId() { return studentId; }
    public void setStudentId(int studentId) { this.studentId = studentId; }

    public String getAdmissionNumber() { return admissionNumber; }
    public void setAdmissionNumber(String admissionNumber) { this.admissionNumber = admissionNumber; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Stream getStream() { return stream; }
    public void setStream(Stream stream) { this.stream = stream; }

    public int getYearEnrolled() { return yearEnrolled; }
    public void setYearEnrolled(int yearEnrolled) { this.yearEnrolled = yearEnrolled; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }

    public UserDetails getCreatedBy() { return createdBy; }
    public void setCreatedBy(UserDetails createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }


}