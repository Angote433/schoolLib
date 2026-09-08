package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.DistributionRecord;
import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.security.AuthUtil;
import com.arnold.autolibrary.services.DistributionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/distributions")
public class DistributionController {
    @Autowired
    private DistributionService distService;

    @Autowired
    private AuthUtil authUtil;

    /*
    teacher scans book and assigns student a book from the list
    carries - qr code, student id, academic year. Who performed the
    assignment is always resolved from the caller's own JWT, never from
    the request body — a teacher could otherwise attribute the action
    to someone else.
     */

    @PostMapping
    public ResponseEntity<?>distributeBook(@RequestBody DistributionRequest request) {
        UserDetails caller = authUtil.getCurrentUser();

        DistributionRecord record = distService.distributeBook(
                request.getQrCode(),
                request.getStudentId(),
                request.getAcademicYear(),
                caller
                );

        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }


    /*
    Teacher scans a book and marks it as returned at the end of every year
    this api is called
     */
    @PutMapping("/return/{qrCode}")
    public ResponseEntity<?>returnBook(@PathVariable String qrCode){
        DistributionRecord record = distService.returnBook(qrCode);
        return ResponseEntity.ok(record);
    }

    /*
    Tacher flags book as lost here,,that is if the student does not bring book for scanning
    or QR scan fails and if the book is not returned at the end of the year.
     */
    @PostMapping("/loss")
    public ResponseEntity<?>markBookLost(@RequestBody LossRequest request){
        UserDetails caller = authUtil.getCurrentUser();

        LossReport report = distService.flagLost(
                request.getQrCode(),
                request.getReason(),
                caller
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(report);
    }

    //Dist records for a specific student over years
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?>getStudentDistributions(@PathVariable int studentId){
        return ResponseEntity.ok(distService.getStudentDistributions(studentId));
    }

    @GetMapping("/year/{academicYear}")
    public ResponseEntity<?>getYearlyDistRecords(@PathVariable int academicYear){
        return ResponseEntity.ok(distService.getByYear(academicYear));
    }

    /*
    Mobile app: Home "Books Out" stat card and the "Books Out" tab —
    every distribution record for the teacher's stream in a given year.
     */
    @GetMapping("/stream/{streamId}/year/{year}")
    public ResponseEntity<?>getStreamDistributions(
            @PathVariable int streamId, @PathVariable int year){
        return ResponseEntity.ok(distService.getByStreamAndYear(streamId, year));
    }

    /*
    Return flow: teacher scans ISBN on the book's back cover.
    Returns the table of students in their stream currently holding that title.
     */
    @GetMapping("/isbn/{isbn}/stream/{streamId}")
    public ResponseEntity<?>getActiveByIsbnAndStream(@PathVariable String isbn, @PathVariable int streamId){
        List<DistributionRecord> records = distService.getActiveByIsbnAndStream(isbn, streamId);
        return ResponseEntity.ok(records);
    }

    /*
    Assign flow: teacher types/scans the accession number written inside the book,
    confirms the title, selects the student, then this assigns the specific copy.
     */
    @PostMapping("/by-accession")
    public ResponseEntity<?>distributeByAccession(@RequestBody AccessionDistributionRequest request){
        UserDetails caller = authUtil.getCurrentUser();

        DistributionRecord record = distService.distributeByAccessionNumber(
                request.getAccessionNumber(),
                request.getStudentId(),
                request.getAcademicYear(),
                caller
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(record);
    }

    public static class AccessionDistributionRequest {
        private String accessionNumber;
        private int studentId;
        private int academicYear;
        private int teacherId;

        public String getAccessionNumber() { return accessionNumber; }
        public void setAccessionNumber(String accessionNumber) { this.accessionNumber = accessionNumber; }

        public int getStudentId() { return studentId; }
        public void setStudentId(int studentId) { this.studentId = studentId; }

        public int getAcademicYear() { return academicYear; }
        public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }

        public int getTeacherId() { return teacherId; }
        public void setTeacherId(int teacherId) { this.teacherId = teacherId; }
    }

    public static class DistributionRequest {
        private String qrCode;
        private int studentId;
        private int academicYear;
        private int userId;


        public String getQrCode() { return qrCode; }
        public void setQrCode(String qrCode) { this.qrCode = qrCode; }

        public int getStudentId() { return studentId; }
        public void setStudentId(int studentId) {
            this.studentId = studentId;
        }

        public int getAcademicYear() { return academicYear; }
        public void setAcademicYear(int academicYear) {
            this.academicYear = academicYear;
        }

        public int getUserId() { return userId; }
        public void setTeacherId(int userId) {
            this.userId = userId;
        }
    }

    public static class LossRequest {
        private String qrCode;
        private String reason;
        private int teacherId;

        public String getQrCode() { return qrCode; }
        public void setQrCode(String qrCode) { this.qrCode = qrCode; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public int getTeacherId() { return teacherId; }
        public void setTeacherId(int teacherId) {
            this.teacherId = teacherId;
        }
    }


}
