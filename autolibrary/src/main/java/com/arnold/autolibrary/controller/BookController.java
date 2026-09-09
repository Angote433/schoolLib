package com.arnold.autolibrary.controller;

import com.arnold.autolibrary.dto.CopyPreviewResponse;
import com.arnold.autolibrary.dto.CopyRegistrationRequest;
import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookDetails;
import com.arnold.autolibrary.services.BookService;
import com.arnold.autolibrary.util.BarCodeGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        BookDetails registered = bookService.registerTitle(bookDetails);
        return  ResponseEntity.status(HttpStatus.CREATED).body(registered);
    }

    @GetMapping
    public ResponseEntity<List<BookDetails>>getAllBooks(){
        return  ResponseEntity.ok(bookService.getAllBooks());
    }

    //One book
    @GetMapping("/{id}")
    public ResponseEntity<?>getBookById(@PathVariable int id){
        BookDetails book = bookService.getBookByID(id);
        return ResponseEntity.ok(book);
    }

    @GetMapping("/grade/{gradeLevel}")
    public ResponseEntity<List<BookDetails>>getBooksByGrade(@PathVariable int gradeLevel){
            return ResponseEntity.ok(bookService.getBooksByGradeLevel(gradeLevel));
    }

    //Register multiple copies of a book — mode-based: AUTO (generated
    //sequence, the default), RANGE (a consecutive hand-written range) or
    //LIST (a pasted, possibly non-sequential list). All-or-nothing —
    //see BookService.registerCopies.
    @PostMapping("/{id}/copies")
    public ResponseEntity<?>registerCopies(
            @PathVariable int id, @RequestBody CopyRegistrationRequest request
            ){
        List<BookCopy> copies = bookService.registerCopies(id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(copies);
    }

    //Read-only — previews the accession numbers a registration request
    //would produce, flagging any that already exist or repeat within the
    //batch, without writing anything to the database.
    @PostMapping("/{id}/copies/preview")
    public ResponseEntity<?>previewCopies(
            @PathVariable int id, @RequestBody CopyRegistrationRequest request
            ){
        CopyPreviewResponse preview = bookService.previewCopyRegistration(id, request);
        return ResponseEntity.ok(preview);
    }


    //get copies of a specific book title
    @GetMapping("/copies/{bookId}")
    public ResponseEntity<?>getCopiesByBook(@PathVariable int bookId){
        List<BookCopy>copies = bookService.getCopiesByByBook(bookId);
        return ResponseEntity.ok(copies);
    }

    //available copies
    @GetMapping("/copies/{bookId}/available")
    public ResponseEntity<List<BookCopy>>getAvailableCopies(@PathVariable int bookId){
            return ResponseEntity.ok(bookService.getAvailableCopies(bookId));
    }

    //Scan code — a query param, not a path variable: a hand-written
    //accession number (mirrored into qrCode) may now contain a "/"
    //(e.g. "LIB/2019/045"), which the servlet container rejects as an
    //encoded slash in a path segment.
    @GetMapping("/scan")
    public ResponseEntity<?>scanBook(@RequestParam String code){
        BookCopy book = bookService.findByQR(code);
        return ResponseEntity.ok(book);
    }

    //Teacher scans ISBN barcode on book back cover - returns the title details
    @GetMapping("/isbn/{isbn}")
    public ResponseEntity<?>getBookByIsbn(@PathVariable String isbn){
        BookDetails book = bookService.getByIsbn(isbn);
        return ResponseEntity.ok(book);
    }

    //Teacher types the accession number written inside the book cover.
    //Query param for the same reason as /scan above.
    @GetMapping("/accession")
    public ResponseEntity<?>getByAccessionNumber(@RequestParam String number){
        BookCopy copy = bookService.findByAccessionNumber(number);
        return ResponseEntity.ok(copy);
    }

    //Generates and returns qr as image-Librarian to use this to print the stickers
    @GetMapping("/copies/{copyId}/qr-image")
    public ResponseEntity<?>getQrCodeImage(@PathVariable int copyId)
            throws com.google.zxing.WriterException, java.io.IOException {
        BookCopy bookCopy = bookService.getCopyById(copyId);
        //generate the image
        byte[]qrImage = qrGenerator.generateQrCode(bookCopy.getQrCode(),300,300);
        HttpHeaders header = new HttpHeaders();
        header.setContentType(MediaType.IMAGE_PNG);

        return new ResponseEntity<>(qrImage,header, HttpStatus.OK);
    }

}
