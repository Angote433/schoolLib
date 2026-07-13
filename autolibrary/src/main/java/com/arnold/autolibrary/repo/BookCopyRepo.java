package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookCopyRepo extends JpaRepository<BookCopy,Integer> {
    Optional<BookCopy>findByQrCode(String qrCode);
    List<BookCopy> findByBookDetailsDetailsId(int detailsId);
    List<BookCopy>findByStatus(BookStatus status);

    List<BookCopy> findByBookDetailsDetailsIdAndStatus(int detailsId, BookStatus bookStatus);

    boolean existsByQrCode(String qrCode);
}
