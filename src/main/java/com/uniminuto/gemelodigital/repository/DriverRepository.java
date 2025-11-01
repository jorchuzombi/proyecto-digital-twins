// DriverRepository.java - CORREGIDO
package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.Driver;
import com.uniminuto.gemelodigital.entity.Driver.DriverStatus;
import com.uniminuto.gemelodigital.entity.Driver.DriverAvailability;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverRepository extends JpaRepository<Driver, String> {

    // ✅ Buscar por UUID convertido a String
    default Optional<Driver> findById(UUID uuid) {
        return findById(uuid.toString());
    }

    /**
     * Busca un conductor por licencia
     */
    Optional<Driver> findByLicencia(String licencia);

    /**
     * Verifica si existe una licencia
     */
    boolean existsByLicencia(String licencia);

    /**

     */
    @Query("SELECT d FROM Driver d WHERE " +
            "(:estado IS NULL OR d.estado = :estado) AND " +
            "(:disponibilidad IS NULL OR d.disponibilidad = :disponibilidad) AND " +
            "(:search IS NULL OR LOWER(d.nombre) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(d.apellido) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(d.licencia) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Driver> findAllWithFilters(
            @Param("estado") DriverStatus estado,
            @Param("disponibilidad") DriverAvailability disponibilidad,
            @Param("search") String search,
            Pageable pageable
    );

    /**
     * Obtiene conductores disponibles
     */
    @Query("SELECT d FROM Driver d WHERE " +
            "d.estado = 'ACTIVO' AND " +
            "d.disponibilidad = 'DISPONIBLE' AND " +
            "d.fechaVencimientoLicencia > :today")
    List<Driver> findAvailableDrivers(@Param("today") LocalDate today);

    /**
     * Obtiene conductores por estado
     */
    List<Driver> findByEstado(DriverStatus estado);

    /**

     */
    long countByEstado(DriverStatus estado);

    /**

     */
    long countByDisponibilidad(DriverAvailability disponibilidad);

    /**
     * Obtiene conductores con licencia próxima a vencer
     */
    @Query("SELECT d FROM Driver d WHERE " +
            "d.estado = 'ACTIVO' AND " +
            "d.fechaVencimientoLicencia BETWEEN :today AND :limitDate")
    List<Driver> findDriversWithExpiringLicense(
            @Param("today") LocalDate today,
            @Param("limitDate") LocalDate limitDate
    );
}