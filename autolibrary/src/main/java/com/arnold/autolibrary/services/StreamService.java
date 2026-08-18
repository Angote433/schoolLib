package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.SchoolClassRepository;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

import java.util.List;

@Service
public class StreamService {
    @Autowired
    private StreamRepo streamRepo;
    @Autowired
    private SchoolClassRepository schoolClassRepository;
    @Autowired
    private UserDetailsRepo userDetailsRepo;
    //in a class

    @org.springframework.transaction.annotation.Transactional
    public Stream createStream(Stream stream,int classId){
        SchoolClass schoolClass = schoolClassRepository.findById(classId).orElseThrow(
                ()-> new RuntimeException("Class not found with id "+ classId)
        );

        stream.setSchoolClass(schoolClass);
        stream.setActive(true);

        //teacher manages only one stream
        //check if assigned another stream
        if(stream.getTeacher() != null){
            streamRepo.findByTeacher(stream.getTeacher()).ifPresent(existingStream
            ->{throw new RuntimeException("This teacher is already assigned to another stream");});

        }

        Stream saved = streamRepo.save(stream);

        //keep the reverse relationship in sync so the teacher's
        //login response reflects the stream immediately
        if(saved.getTeacher() != null){
            UserDetails teacher = saved.getTeacher();
            teacher.setStream(saved);
            userDetailsRepo.save(teacher);
        }

        return saved;

    }

    //reassingning / assigning a classteacher
    @org.springframework.transaction.annotation.Transactional
    public Stream assignTeacher(int streamId,int userId){
        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new RuntimeException("Stream not found with id "+ streamId)
        );
        UserDetails teacher = userDetailsRepo.findById(userId).orElseThrow(()->
                new RuntimeException("Teacher not found with id "+ userId));

        if(teacher.getRole() != com.arnold.autolibrary.model.Role.TEACHER){
            throw new RuntimeException("Only teachers can be assigned to a stream");
        }

        //teacher running another stream?
        streamRepo.findByTeacher(teacher).ifPresent(existingStream ->
        {if(existingStream.getStreamId() != streamId){
        throw new RuntimeException("Teacher manages another stream "+ existingStream.getStreamName());}
        });

        //clear the previous teacher of this stream (if being reassigned)
        //so their user account no longer points at this stream
        UserDetails previousTeacher = stream.getTeacher();
        if(previousTeacher != null && previousTeacher.getUserId() != userId){
            previousTeacher.setStream(null);
            userDetailsRepo.save(previousTeacher);
        }

        //keep both sides of the relationship in sync —
        //stream.teacher (who manages the stream) and
        //user.stream (which stream the teacher belongs to, used at login)
        stream.setTeacher(teacher);
        teacher.setStream(stream);
        userDetailsRepo.save(teacher);

        return streamRepo.save(stream);

    }

    public List<Stream> getAllStreams(){
        return streamRepo.findAll();
    }
    public List<Stream>getBySchoolClass(int classId){
        return streamRepo.findStreamsBySchoolClass_ClassId(classId);
    }

    public Stream deactivateStream(int streamId){
        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new RuntimeException("Stream not found with id "+ streamId)
        );
        stream.setActive(false);

        return streamRepo.save(stream);

    }




}
