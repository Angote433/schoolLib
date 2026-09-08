package com.arnold.autolibrary.services;

import com.arnold.autolibrary.exception.BusinessRuleException;
import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.repo.SchoolClassRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SchoolClassService {

    private static final Logger log = LoggerFactory.getLogger(SchoolClassService.class);

    @Autowired
    SchoolClassRepository schoolClassRepository;
    public SchoolClass addClass(SchoolClass schoolClass){
        SchoolClass existing = schoolClassRepository.findByGradeLevelAndAcademicYear(
                schoolClass.getGradeLevel(),schoolClass.getAcademicYear()
        );
        if(existing != null){
            throw new BusinessRuleException(
                "A class already exists for grade "+ schoolClass.getGradeLevel()
                +" in academic year "+ schoolClass.getAcademicYear()
            );
        }
        SchoolClass saved = schoolClassRepository.save(schoolClass);
        log.info("Class added: grade={} academicYear={}", saved.getGradeLevel(), saved.getAcademicYear());
        return saved;

    }

    public List<SchoolClass>viewAllClasses(){
        return schoolClassRepository.findAll();
    }


}
