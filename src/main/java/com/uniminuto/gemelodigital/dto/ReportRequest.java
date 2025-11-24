package com.uniminuto.gemelodigital.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// DTO para solicitar generación de reporte
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {
    private String type;      // operational, drivers, vehicles, routes
    private String period;    // current, weekly, monthly, quarterly
    private String title;
}