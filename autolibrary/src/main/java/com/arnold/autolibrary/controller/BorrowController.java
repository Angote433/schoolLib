package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.BorrowRecord;
import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.services.BorrowService;
import com.arnold.autolibrary.services.UserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("api/borrows")
public class BorrowController {
    @Autowired
    private BorrowService borrowService;

    @Autowired
    private UserDetailsService  userDetailsService;

    @PostMapping
    public ResponseEntity<?>borrowBook(@RequestBody BorrowRequest borrowRequest){
        try{
            UserDetails librarian = userDetailsService.getUserById(borrowRequest.getLibrarianId());

            BorrowRecord record = borrowService.borrowBoook(
                    borrowRequest.getQrCode(),
                    borrowRequest.getStudentId(),
                    borrowRequest.getDateDue(),
                    librarian
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(record);
        }catch(RuntimeException e ){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /*
    Librarian will scn,and mark book as returned
     */
    @PutMapping("/return/{qrCode}")
    public ResponseEntity<?>returnBook(@PathVariable String qrCode){
        try{
            BorrowRecord record  = borrowService.returnBook(qrCode);
            return ResponseEntity.ok(record);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @GetMapping("/active")
    public ResponseEntity<List<BorrowRecord>>getActiveBorrows(){
        return ResponseEntity.ok(borrowService.getActiveBorrows());
    }

    @GetMapping("/overdue")
    public ResponseEntity<List<BorrowRecord>>getOverdueBorrows(){
        return ResponseEntity.ok(borrowService.getOverdueBorrows());
    }


    //Specific student
    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<BorrowRecord>>getStudentBorrows(@PathVariable int studentId){
        return ResponseEntity.ok(borrowService.getStudentBorrows(studentId));
    }

    //mark lost

    @PostMapping("/loss")
    public ResponseEntity<?>flagLost(@RequestBody BorrowLossRequest request){
        try{
            LossReport report = borrowService.flagAsLost(
                    request.getQrCode(),
                    request.getReason()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(report);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    public static class BorrowRequest {
        private String qrCode;
        private int studentId;
        private LocalDate dateDue;
        private int librarianId;

        public String getQrCode() { return qrCode; }
        public void setQrCode(String qrCode) { this.qrCode = qrCode; }

        public int getStudentId() { return studentId; }
        public void setStudentId(int studentId) {
            this.studentId = studentId;
        }

        public LocalDate getDateDue() { return dateDue; }
        public void setDateDue(LocalDate dateDue) {
            this.dateDue = dateDue;
        }

        public int getLibrarianId() { return librarianId; }
        public void setLibrarianId(int librarianId) {
            this.librarianId = librarianId;
        }
    }

    public static class BorrowLossRequest {
        private String qrCode;
        private String reason;

        public String getQrCode() { return qrCode; }
        public void setQrCode(String qrCode) { this.qrCode = qrCode; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
