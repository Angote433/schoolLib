package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookDetails;
import com.arnold.autolibrary.services.BookService;
import com.arnold.autolibrary.util.BarCodeGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/books")
public class BookController {
    @Autowired
   private  BookService bookService;

    @Autowired
    private BarCodeGenerator qrGenerator;

    //Librarian registers book but not as a copy,a title

    @PostMapping
    public ResponseEntity<?> registerBook(@RequestBody BookDetails bookDetails){
        try{
            BookDetails registered = bookService.registerTitle(bookDetails);
            return  ResponseEntity.status(HttpStatus.CREATED).body(registered);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<BookDetails>>getAllBooks(){
        return  ResponseEntity.ok(bookService.getAllBooks());
    }

    //One book
    @GetMapping("/{id}")
    public ResponseEntity<?>getBookById(@PathVariable int id){
        try{
            BookDetails book = bookService.getBookByID(id);
            return ResponseEntity.ok(book);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

    }

    @GetMapping("/grade/{gradeLevel}")
    public ResponseEntity<List<BookDetails>>getBooksByGrade(@PathVariable int gradeLevel){
            return ResponseEntity.ok(bookService.getBooksByGradeLevel(gradeLevel));
    }

    //Register multiple copies of book-each copy getsunique codes generated
    @PostMapping("/{id}/copies")
    public ResponseEntity<?>registerCopies(
            @PathVariable int id, @RequestParam int quantity,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)LocalDate dateAcquired
            ){

        try{
           List<BookCopy> copies = bookService.registerMultipleCopies(id,quantity,dateAcquired);
           return ResponseEntity.status(HttpStatus.CREATED).body(copies);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

    }


    //get copies of a specific book title
    @GetMapping("/copies/{bookId}")
    public ResponseEntity<?>getCopiesByBook(@PathVariable int bookId){
        try{
            List<BookCopy>copies = bookService.getCopiesByByBook(bookId);
            return ResponseEntity.ok(copies);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //available copies
    @GetMapping("/copies/{bookId}/available")
    public ResponseEntity<List<BookCopy>>getAvailableCopies(@PathVariable int bookId){
            return ResponseEntity.ok(bookService.getAvailableCopies(bookId));
    }

    //Scan code
    @GetMapping("/scan/{qrCode}")
    public ResponseEntity<?>scanBook(@PathVariable String qrCode){
        try{
            BookCopy book = bookService.findByQR(qrCode);
            return ResponseEntity.ok(book);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    //Generates and returns qr as image-Librarian to use this to print the stickers
    @GetMapping("/copies/{copyId}/qr-image")
    public ResponseEntity<?>getQrCodeImage(@PathVariable int copyId){
        try{
            BookCopy bookCopy = bookService.getCopyById(copyId);
            //generate the image
            byte[]qrImage = qrGenerator.generateQrCode(bookCopy.getQrCode(),300,300);
            HttpHeaders header = new HttpHeaders();
            header.setContentType(MediaType.IMAGE_PNG);

            return new ResponseEntity<>(qrImage,header, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}
