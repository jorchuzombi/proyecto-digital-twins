package com.uniminuto.gemelodigital.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private String id;
    private String title;
    private String type;
    private String period;
    private String generatedDate;
    private Map<String, Object> data;
}