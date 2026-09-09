package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.BookCopy;
import com.arnold.autolibrary.model.BookStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookCopyRepo extends JpaRepository<BookCopy,Integer> {
    Optional<BookCopy>findByQrCode(String qrCode);
    List<BookCopy> findByBookDetailsDetailsId(int detailsId);
    List<BookCopy>findByStatus(BookStatus status);

    List<BookCopy> findByBookDetailsDetailsIdAndStatus(int detailsId, BookStatus bookStatus);

    boolean existsByQrCode(String qrCode);

    Optional<BookCopy> findByAccessionNumber(String accessionNumber);
    boolean existsByAccessionNumber(String accessionNumber);
    int countByBookDetailsDetailsId(int detailsId);

    // One query for the whole batch — used by copy-registration preview
    // and the real registration's re-check, instead of a query per number.
    List<BookCopy> findByAccessionNumberIn(Collection<String> accessionNumbers);

    Optional<BookCopy> findFirstByBookDetailsDetailsIdAndStatus(int detailsId, BookStatus status);
    Optional<BookCopy> findFirstByBookDetailsIsbnAndStatus(String isbn, BookStatus status);
}
