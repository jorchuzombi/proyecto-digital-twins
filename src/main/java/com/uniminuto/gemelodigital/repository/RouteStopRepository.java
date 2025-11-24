package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, String> { // Cambiar a String

    /**
     * ✅ Buscar paradas por ID de ruta ordenadas
     */
    List<RouteStop> findByRoute_IdOrderByStopOrder(String routeId);

    /**
     * ✅ Contar paradas de una ruta
     */
    long countByRoute_Id(String routeId);

    /**
     * ✅ Buscar primera parada
     */
    @Query("SELECT rs FROM RouteStop rs WHERE rs.route.id = :routeId ORDER BY rs.stopOrder ASC LIMIT 1")
    Optional<RouteStop> findFirstStopByRouteId(@Param("routeId") String routeId);

    /**
     * ✅ Buscar última parada
     */
    @Query("SELECT rs FROM RouteStop rs WHERE rs.route.id = :routeId ORDER BY rs.stopOrder DESC LIMIT 1")
    Optional<RouteStop> findLastStopByRouteId(@Param("routeId") String routeId);

    /**
     * ✅ Buscar por nombre de parada - CORREGIDO: usar 'name' no 'stopName'
     */
    @Query("SELECT rs FROM RouteStop rs WHERE rs.route.id = :routeId AND rs.name = :name")
    Optional<RouteStop> findByRouteIdAndName(
            @Param("routeId") String routeId,
            @Param("name") String name
    );

    /**
     * ✅ Buscar siguiente parada
     */
    @Query("SELECT rs FROM RouteStop rs WHERE rs.route.id = :routeId AND rs.stopOrder > :currentOrder ORDER BY rs.stopOrder ASC")
    List<RouteStop> findNextStops(
            @Param("routeId") String routeId,
            @Param("currentOrder") Integer currentOrder
    );

    /**
     * ✅ Eliminar todas las paradas de una ruta
     */
    void deleteByRoute_Id(String routeId);

    /**
     * ✅ Buscar parada por orden específico
     */
    Optional<RouteStop> findByRoute_IdAndStopOrder(String routeId, Integer stopOrder);
}