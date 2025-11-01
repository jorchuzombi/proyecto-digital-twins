package com.uniminuto.gemelodigital.dto;

import lombok.Data;
import java.util.List;

@Data
public class DriverListResponse {
    private List<DriverResponse> drivers;
    private int totalPages;
    private long totalElements;
    private int currentPage;
    private int pageSize;

    // Constructor para facilitar la creación
    public DriverListResponse(List<DriverResponse> drivers, int totalPages,
                              long totalElements, int currentPage, int pageSize) {
        this.drivers = drivers;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
        this.currentPage = currentPage;
        this.pageSize = pageSize;
    }

    public DriverListResponse() {
        // Constructor por defecto
    }
}