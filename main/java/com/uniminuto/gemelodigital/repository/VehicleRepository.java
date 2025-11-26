package com.uniminuto.gemelodigital.repository;

import com.uniminuto.gemelodigital.entity.Vehicle;
import com.uniminuto.gemelodigital.entity.Vehicle.VehicleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    /**
     * Busca un vehículo por placa (para validar duplicados)
     */
    Optional<Vehicle> findByPlaca(String placa);

    /**
     * Verifica si existe una placa (para validaciones rápidas)
     */
    boolean existsByPlaca(String placa);

    /**
     * Lista todos los vehículos con filtros opcionales
     */
    @Query("SELECT v FROM Vehicle v WHERE " +
            "(:estado IS NULL OR v.estado = :estado) AND " +
            "(:tipo IS NULL OR v.tipo = :tipo) AND " +
            "(:search IS NULL OR LOWER(v.placa) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(v.marca) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Vehicle> findAllWithFilters(
            @Param("estado") VehicleStatus estado,
            @Param("tipo") String tipo,
            @Param("search") String search,
            Pageable pageable
    );

    /**
     * Obtiene solo vehículos activos (para optimización de rutas)
     */
    List<Vehicle> findByEstado(VehicleStatus estado);

    /**
     * Cuenta vehículos por estado
     */
    long countByEstado(VehicleStatus estado);

    /**
     * Busca vehículos por tipo y estado
     */
    List<Vehicle> findByTipoAndEstado(String tipo, VehicleStatus estado);

    /**
     * ✅ BUSCA VEHÍCULOS POR ESTADO QUE NO ESTÉN ELIMINADOS (SOFT DELETE)
     * Este es el método que usa el endpoint /available
     */
    List<Vehicle> findByEstadoAndDeletedAtIsNull(VehicleStatus estado);

    /**
     * ✅ BUSCA VEHÍCULOS DISPONIBLES (ACTIVOS + DISPONIBLES) - Opcional
     */
    @Query("SELECT v FROM Vehicle v WHERE v.estado IN ('ACTIVO', 'DISPONIBLE') AND v.deletedAt IS NULL")
    List<Vehicle> findAvailableVehicles();

    /**
     * ✅ CUENTA VEHÍCULOS POR ESTADO QUE NO ESTÉN ELIMINADOS
     */
    long countByEstadoAndDeletedAtIsNull(VehicleStatus estado);

    /**
     * ✅ BUSCA VEHÍCULOS POR TIPO Y ESTADO QUE NO ESTÉN ELIMINADOS
     */
    List<Vehicle> findByTipoAndEstadoAndDeletedAtIsNull(String tipo, VehicleStatus estado);
}