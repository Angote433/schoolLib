package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.DistributionRecord;
import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.services.DistributionService;
import com.arnold.autolibrary.services.UserDetailsService;
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
    private UserDetailsService userService;

    /*
    teacher scans book and assigns student a book from the list
    caries - qr code,student id,academic year, teacherid of the teacher doing assignment
     */

    @PostMapping
    public ResponseEntity<?>distributeBook(@RequestBody DistributionRequest request) {
        try {
            UserDetails user = userService.getUserById(request.getUserId());

            DistributionRecord record = distService.distributeBook(
                    request.getQrCode(),
                    request.getStudentId(),
                    request.getAcademicYear(),
                    user
                    );

            return ResponseEntity.status(HttpStatus.CREATED).body(record);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    /*
    Teacher scans a book and marks it as returned at the end of every year
    this api is called
     */
    @PutMapping("/return/{qrCode}")
    public ResponseEntity<?>returnBook(@PathVariable String qrCode){
        try{
            DistributionRecord record = distService.returnBook(qrCode);
            return ResponseEntity.ok(record);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /*
    Tacher flags book as lost here,,that is if the student does not bring book for scanning
    or QR scan fails and if the book is not returned at the end of the year.
     */
    @PostMapping("/loss")
    public ResponseEntity<?>markBookLost(@RequestBody LossRequest request){
        try{
            UserDetails teacher = userService.getUserById(request.getTeacherId());

            LossReport report = distService.flagLost(
                    request.getQrCode(),
                    request.getReason(),
                    teacher
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(report);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //Dist records for a specific student over years
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<DistributionRecord>>getStudentDistributions(@PathVariable int studentId){
        return ResponseEntity.ok(distService.getStudentDistributions(studentId));
    }

    @GetMapping("/year/{academicYear}")
    public ResponseEntity<List<DistributionRecord>>getYearlyDistRecords(@PathVariable int academicYear){
        return ResponseEntity.ok(distService.getByYear(academicYear));
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
