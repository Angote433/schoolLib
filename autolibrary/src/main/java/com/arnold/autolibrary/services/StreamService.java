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

        return streamRepo.save(stream);




    }

    //reassingning / assigning a classteacher
    public Stream assignTeacher(int streamId,int userId){
        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new RuntimeException("Stream not found with id "+ streamId)
        );
        UserDetails teacher = userDetailsRepo.findById(userId).orElseThrow(()->
                new RuntimeException("Teacher not found with id "+ userId));

        //teacher running another stream?
        streamRepo.findByTeacher(teacher).ifPresent(existingStream ->
        {if(existingStream.getStreamId() != streamId){
        throw new RuntimeException("Teacher manages another stream "+ existingStream.getStreamName());}
        });

        stream.setTeacher(teacher);
        return streamRepo.save(stream);

    }

    public List<Stream> getAllStreams(){
        return streamRepo.findAll();
    }
    public List<Stream>getBySchoolClass(int classId){
        return streamRepo.findStreamsBySchoolClass_ClassId(classId);
    }

    public Stream deactivateStream(int streamId){
        Stream stream = streamRepo.getStreamByStreamId(streamId);
        stream.setActive(false);

        return streamRepo.save(stream);

    }




}
