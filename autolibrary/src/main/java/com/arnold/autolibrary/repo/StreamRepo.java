package com.arnold.autolibrary.repo;

import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StreamRepo extends JpaRepository<Stream,Integer> {
  List<Stream>findBySchoolClass(SchoolClass schoolClass);
  Optional<Stream> findByTeacher(UserDetails teacher);

  Stream getStreamByStreamId(int streamId);
  List<Stream>findStreamsBySchoolClass_ClassId(int classId);


  boolean existsByStreamNameAndSchoolClass(String streamName, SchoolClass schoolClass);



}
