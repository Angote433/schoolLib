package com.arnold.autolibrary.services;

import com.arnold.autolibrary.model.SchoolClass;
import com.arnold.autolibrary.repo.SchoolClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SchoolClassService {
    @Autowired
    SchoolClassRepository schoolClassRepository;
    public SchoolClass addClass(SchoolClass schoolClass){
        SchoolClass existing = schoolClassRepository.findByGradeLevelAndAcademicYear(
                schoolClass.getGradeLevel(),schoolClass.getAcademicYear()
        );
        return schoolClassRepository.save(schoolClass);

    }

    public List<SchoolClass>viewAllClasses(){
        return schoolClassRepository.findAll();
    }


}
