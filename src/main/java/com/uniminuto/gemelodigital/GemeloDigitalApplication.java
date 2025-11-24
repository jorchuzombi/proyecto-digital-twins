package com.uniminuto.gemelodigital;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // ⭐ NUEVO - Habilita @Scheduled en RealTimeTrackingService
public class GemeloDigitalApplication {

    public static void main(String[] args) {
        ApplicationContext ctx = SpringApplication.run(GemeloDigitalApplication.class, args);

        System.out.println("\n" + "=".repeat(70));
        System.out.println("🚀 GEMELO DIGITAL - SISTEMA DE TRACKING EN TIEMPO REAL");
        System.out.println("=".repeat(70));

        // Verificar scheduling
        System.out.println("\n⏰ SCHEDULING:");
        System.out.println("   ✅ @EnableScheduling activo");
        System.out.println("   ✅ Actualización automática cada 5 segundos");

        // Listar TODOS los controllers
        String[] controllers = ctx.getBeanNamesForAnnotation(
                org.springframework.web.bind.annotation.RestController.class
        );
        System.out.println("\n📋 REST CONTROLLERS REGISTRADOS: " + controllers.length);
        for (String controller : controllers) {
            System.out.println("   ✅ " + controller);
        }

        // Verificar controllers específicos
        System.out.println("\n🔍 VERIFICACIÓN DE CONTROLLERS CLAVE:");

        checkController(ctx, "authController", "AuthController");
        checkController(ctx, "realTimeTrackingController", "RealTimeTrackingController");
        checkController(ctx, "routeController", "RouteController");
        checkController(ctx, "driverController", "DriverController");
        checkController(ctx, "vehicleController", "VehicleController");

        // Verificar servicios
        System.out.println("\n🔧 SERVICIOS REGISTRADOS:");
        checkService(ctx, "realTimeTrackingService", "RealTimeTrackingService");
        checkService(ctx, "routeService", "RouteService");
        checkService(ctx, "driverService", "DriverService");
        checkService(ctx, "vehicleService", "VehicleService");

        // Verificar repositories
        System.out.println("\n💾 REPOSITORIES REGISTRADOS:");
        checkRepository(ctx, "vehiclePositionRepository", "VehiclePositionRepository");
        checkRepository(ctx, "routeProgressRepository", "RouteProgressRepository");
        checkRepository(ctx, "routeRepository", "RouteRepository");
        checkRepository(ctx, "routeStopRepository", "RouteStopRepository");

        // Endpoints disponibles
        System.out.println("\n🌐 ENDPOINTS DE TRACKING DISPONIBLES:");
        System.out.println("   📍 GET  http://localhost:8000/api/tracking/health");
        System.out.println("   📍 GET  http://localhost:8000/api/tracking/positions");
        System.out.println("   📍 GET  http://localhost:8000/api/tracking/positions/active");
        System.out.println("   📍 POST http://localhost:8000/api/tracking/assign-route");
        System.out.println("   📍 POST http://localhost:8000/api/tracking/start-route/{id}");
        System.out.println("   📍 GET  http://localhost:8000/api/tracking/progress/{id}");

        System.out.println("\n✅ Aplicación iniciada correctamente en: http://localhost:8000");
        System.out.println("=".repeat(70) + "\n");
    }

    private static void checkController(ApplicationContext ctx, String beanName, String displayName) {
        try {
            Object bean = ctx.getBean(beanName);
            System.out.println("   ✅ " + displayName + " - " + bean.getClass().getSimpleName());
        } catch (Exception e) {
            System.out.println("   ❌ " + displayName + " - NO ENCONTRADO");
        }
    }

    private static void checkService(ApplicationContext ctx, String beanName, String displayName) {
        try {
            Object bean = ctx.getBean(beanName);
            System.out.println("   ✅ " + displayName + " - " + bean.getClass().getSimpleName());
        } catch (Exception e) {
            System.out.println("   ❌ " + displayName + " - NO ENCONTRADO");
        }
    }

    private static void checkRepository(ApplicationContext ctx, String beanName, String displayName) {
        try {
            Object bean = ctx.getBean(beanName);
            System.out.println("   ✅ " + displayName);
        } catch (Exception e) {
            System.out.println("   ❌ " + displayName + " - NO ENCONTRADO");
        }
    }
}