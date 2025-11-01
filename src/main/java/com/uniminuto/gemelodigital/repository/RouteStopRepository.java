// RouteStopRepository.java
package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, String> {

    // ✅ Encontrar paradas por ID de ruta, ordenadas
    List<RouteStop> findByRoute_IdOrderByStopOrder(String routeId);

    // ✅ Eliminar todas las paradas de una ruta
    void deleteByRoute_Id(String routeId);

    // ✅ Contar paradas de una ruta
    long countByRoute_Id(String routeId);
}