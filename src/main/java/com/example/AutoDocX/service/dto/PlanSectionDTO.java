package com.example.AutoDocX.service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlanSectionDTO {
    private String sectionName;
    private String focus;
    private List<String> nodes;
}
