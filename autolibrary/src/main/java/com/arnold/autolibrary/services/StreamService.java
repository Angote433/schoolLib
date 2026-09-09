package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.exception.ResourceNotFoundException;
import com.arnold.autolibrary.model.Role;
import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.model.Stream;
import com.arnold.autolibrary.model.UserDetails;
import com.arnold.autolibrary.repo.SchoolClassRepository;
import com.arnold.autolibrary.repo.StreamRepo;
import com.arnold.autolibrary.repo.UserDetailsRepo;
import com.arnold.autolibrary.security.AuthUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StreamService {

    private static final Logger log = LoggerFactory.getLogger(StreamService.class);

    @Autowired
    private StreamRepo streamRepo;
    @Autowired
    private SchoolClassRepository schoolClassRepository;
    @Autowired
    private UserDetailsRepo userDetailsRepo;
    @Autowired
    private AuthUtil authUtil;
    //in a class

    @org.springframework.transaction.annotation.Transactional
    public Stream createStream(Stream stream,int classId){
        SchoolClass schoolClass = schoolClassRepository.findById(classId).orElseThrow(
                ()-> new ResourceNotFoundException("Class not found with id "+ classId)
        );

        stream.setSchoolClass(schoolClass);
        stream.setActive(true);

        // Teacher assignment always goes through assignTeacher() below —
        // that is the one place the teacher_id/stream_id pair gets
        // written, so it is never possible for the two columns to drift
        // out of sync (see FEATURES_BATCH_2_PROMPT.md Feature 3.1).
        stream.setTeacher(null);

        Stream saved = streamRepo.save(stream);

        log.info("Stream created: id={} name='{}' class={}",
                saved.getStreamId(), saved.getStreamName(), schoolClass.getClassName());

        return saved;

    }

    // The single method that ever writes stream.teacher_id /
    // user_details.stream_id — every other write path (createStream, the
    // legacy UserDetailsService.assignStream) delegates here so the two
    // columns can never be written independently and drift apart.
    //
    // Assigning teacher T to stream B when T already holds stream A, or
    // when B already has a different teacher S, displaces an existing
    // link. That is never done silently or refused outright — a warning
    // is returned (as a 409) unless the caller passes confirm=true, in
    // which case the whole reassignment happens in one transaction.
    @org.springframework.transaction.annotation.Transactional
    public Stream assignTeacher(int streamId, int userId, boolean confirm){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id "+ streamId)
        );
        UserDetails teacher = userDetailsRepo.findById(userId).orElseThrow(()->
                new ResourceNotFoundException("Teacher not found with id "+ userId));

        if(teacher.getRole() != Role.TEACHER){
            log.warn("Stream assign rejected: stream={} user={} reason=NOT_A_TEACHER",
                    stream.getStreamName(), teacher.getUserName());
            throw new BusinessRuleException("Only teacher accounts can be assigned to a stream");
        }
        if(!teacher.isActive()){
            log.warn("Stream assign rejected: stream={} user={} reason=INACTIVE_ACCOUNT",
                    stream.getStreamName(), teacher.getUserName());
            throw new BusinessRuleException("Cannot assign a deactivated teacher to a stream");
        }

        Stream teachersCurrentStream = streamRepo.findByTeacher(teacher).orElse(null);
        UserDetails streamsCurrentTeacher = stream.getTeacher();

        boolean displacesTeachersOtherStream =
                teachersCurrentStream != null && teachersCurrentStream.getStreamId() != streamId;
        boolean displacesStreamsOtherTeacher =
                streamsCurrentTeacher != null && streamsCurrentTeacher.getUserId() != userId;

        if((displacesTeachersOtherStream || displacesStreamsOtherTeacher) && !confirm){
            StringBuilder warning = new StringBuilder();
            if(displacesTeachersOtherStream){
                warning.append(teacher.getFullName())
                        .append(" is currently assigned to stream ")
                        .append(teachersCurrentStream.getStreamName())
                        .append(". Continuing will leave stream ")
                        .append(teachersCurrentStream.getStreamName())
                        .append(" without a teacher.");
            }
            if(displacesStreamsOtherTeacher){
                if(warning.length() > 0) warning.append(" ");
                warning.append(streamsCurrentTeacher.getFullName())
                        .append(" will be unassigned from stream ")
                        .append(stream.getStreamName())
                        .append(".");
            }
            throw new BusinessRuleException(warning.toString());
        }

        // Clear whichever links are being displaced before writing the
        // new ones, so the pair is never briefly inconsistent.
        if(displacesTeachersOtherStream){
            teachersCurrentStream.setTeacher(null);
            streamRepo.save(teachersCurrentStream);
        }
        if(displacesStreamsOtherTeacher){
            streamsCurrentTeacher.setStream(null);
            userDetailsRepo.save(streamsCurrentTeacher);
        }

        stream.setTeacher(teacher);
        teacher.setStream(stream);
        userDetailsRepo.save(teacher);
        Stream saved = streamRepo.save(stream);

        if(displacesTeachersOtherStream || displacesStreamsOtherTeacher){
            log.info("Stream teacher reassigned: stream={} from={} to={} by={}",
                    saved.getStreamName(),
                    streamsCurrentTeacher != null ? streamsCurrentTeacher.getUserName() : "none",
                    teacher.getUserName(), caller.getUserName());
        } else {
            log.info("Stream teacher assigned: stream={} teacher={} by={}",
                    saved.getStreamName(), teacher.getUserName(), caller.getUserName());
        }

        return saved;
    }

    // Unassigns whoever currently holds the stream — the stream itself,
    // its students, and its distribution/borrow history are untouched.
    @org.springframework.transaction.annotation.Transactional
    public Stream removeTeacher(int streamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertLibrarian(caller);

        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id "+ streamId)
        );

        UserDetails previousTeacher = stream.getTeacher();
        if(previousTeacher != null){
            previousTeacher.setStream(null);
            userDetailsRepo.save(previousTeacher);
        }
        stream.setTeacher(null);
        Stream saved = streamRepo.save(stream);

        log.info("Stream teacher removed: stream={} previous={} by={}",
                saved.getStreamName(),
                previousTeacher != null ? previousTeacher.getUserName() : "none",
                caller.getUserName());

        return saved;
    }

    // Both roles — a teacher may only read their own stream's assignment
    // (enforced by assertCanAccessStream, same as getStreamById).
    public UserDetails getTeacher(int streamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertCanAccessStream(caller, streamId);
        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id "+ streamId));
        return stream.getTeacher();
    }

    public List<Stream> getAllStreams(){
        return streamRepo.findAll();
    }
    public List<Stream>getBySchoolClass(int classId){
        return streamRepo.findStreamsBySchoolClass_ClassId(classId);
    }

    // Teacher may read only their own stream — used by the teacher
    // dashboard/students page to load "their" stream without a selector.
    public Stream getStreamById(int streamId){
        UserDetails caller = authUtil.getCurrentUser();
        authUtil.assertCanAccessStream(caller, streamId);
        return streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id "+ streamId));
    }

    public Stream deactivateStream(int streamId){
        Stream stream = streamRepo.findById(streamId).orElseThrow(
                ()->new ResourceNotFoundException("Stream not found with id "+ streamId)
        );
        stream.setActive(false);

        return streamRepo.save(stream);

    }




}
