package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.LossReport;
import com.arnold.autolibrary.services.LossReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/losses")
public class LossController {
    @Autowired
    private LossReportService service;

    @GetMapping
    public ResponseEntity<List<LossReport>>getAllLosses(){
        return ResponseEntity.ok(service.getAllReports());
    }

    /*
    Pending reports ,,Librarian to forward to the secretary
     */

    @GetMapping("/pending")
    public ResponseEntity<List<LossReport>>getPendingLosses(){
        return ResponseEntity.ok(service.getPendingReports());
    }

    @GetMapping("student/{studentId}")
    public ResponseEntity<List<LossReport>>getByStudent(@PathVariable int studentId){
        return ResponseEntity.ok(service.getReportByStudent(studentId));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?>resolveLoss(@PathVariable int id,@RequestBody ResolveRequest request){
        try{
            LossReport resolved = service.resolveReport(id,request.getNotes());

            return ResponseEntity.ok(resolved);
        } catch (RuntimeException e) {
            return  ResponseEntity.badRequest().body(e.getMessage());
        }

    }

    @PutMapping("/{id}/writeoff")
    public ResponseEntity<?>writeOff(@PathVariable int id,@RequestBody ResolveRequest request){
        try{
            LossReport writtenOff = service.writeOff(id,request.getNotes());

            return ResponseEntity.ok(writtenOff);
        } catch (RuntimeException e) {
            return  ResponseEntity.badRequest().body(e.getMessage());
        }

    }

    public static class ResolveRequest {
        private String notes;

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }



}
