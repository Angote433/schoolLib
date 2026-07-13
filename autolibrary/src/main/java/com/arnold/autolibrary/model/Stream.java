package com.arnold.autolibrary.model;

import jakarta.persistence.*;

@Entity
@Table(name = "stream")
public class Stream {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int streamId;

    @Column(nullable = false , length = 10)
    private String streamName;

    @ManyToOne
    @JoinColumn(name="class_id",nullable = false)
    private SchoolClass schoolClass;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private boolean isActive;

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private UserDetails teacher;

    public Stream(){}
    public Stream(String streamName,SchoolClass schoolClass,int capacity,boolean isActive){
        this.streamName = streamName;
        this.schoolClass = schoolClass;
        this.capacity = capacity;
        this.isActive = isActive;
    }
    public int getStreamId() { return streamId; }
    public void setStreamId(int streamId) { this.streamId = streamId; }

    public String getStreamName() { return streamName; }
    public void setStreamName(String streamName) { this.streamName = streamName; }

    public SchoolClass getSchoolClass() { return schoolClass; }
    public void setSchoolClass(SchoolClass schoolClass) { this.schoolClass = schoolClass; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public UserDetails getTeacher(){return teacher;}
    public void setTeacher(UserDetails teacher){this.teacher = teacher;}

    public boolean isActive() { return isActive; }
    public void setActive(boolean isActive) { this.isActive = isActive; }


}
