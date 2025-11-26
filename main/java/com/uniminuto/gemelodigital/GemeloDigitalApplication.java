package com.uniminuto.gemelodigital;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

@SpringBootApplication
public class GemeloDigitalApplication {

    public static void main(String[] args) {
        ApplicationContext ctx = SpringApplication.run(GemeloDigitalApplication.class, args);

        System.out.println("\n========== DIAGNÓSTICO ==========");

        // Listar TODOS los controllers
        String[] controllers = ctx.getBeanNamesForAnnotation(
                org.springframework.web.bind.annotation.RestController.class
        );
        System.out.println("📋 Controllers encontrados: " + controllers.length);
        for (String controller : controllers) {
            System.out.println("  ✅ " + controller);
        }

        // Buscar AuthController específicamente
        try {
            Object bean = ctx.getBean("authController");
            System.out.println("\n✅ AuthController EXISTE!");
            System.out.println("   Clase: " + bean.getClass().getName());
        } catch (Exception e) {
            System.err.println("\n❌ AuthController NO ENCONTRADO");
            System.err.println("   Error: " + e.getMessage());
        }

        System.out.println("=================================\n");
    }
}