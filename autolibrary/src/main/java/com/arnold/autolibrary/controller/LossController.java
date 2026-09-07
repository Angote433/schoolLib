package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.exception.ApiErrors;
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
    public ResponseEntity<?>getAllLosses(){
        try {
            return ResponseEntity.ok(service.getAllReports());
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }

    /*
    Pending reports ,,Librarian to forward to the secretary
     */

    @GetMapping("/pending")
    public ResponseEntity<?>getPendingLosses(){
        try {
            return ResponseEntity.ok(service.getPendingReports());
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }

    @GetMapping("student/{studentId}")
    public ResponseEntity<?>getByStudent(@PathVariable int studentId){
        try {
            return ResponseEntity.ok(service.getReportByStudent(studentId));
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<?>resolveLoss(@PathVariable int id,@RequestBody ResolveRequest request){
        try{
            LossReport resolved = service.resolveReport(id,request.getNotes());

            return ResponseEntity.ok(resolved);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }

    }

    @PutMapping("/{id}/writeoff")
    public ResponseEntity<?>writeOff(@PathVariable int id,@RequestBody ResolveRequest request){
        try{
            LossReport writtenOff = service.writeOff(id,request.getNotes());

            return ResponseEntity.ok(writtenOff);
        } catch (RuntimeException e) {
            return ApiErrors.toResponse(e);
        }

    }

    public static class ResolveRequest {
        private String notes;

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }



}
