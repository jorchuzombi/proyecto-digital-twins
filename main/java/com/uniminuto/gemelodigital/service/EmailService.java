package com.uniminuto.gemelodigital.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private TemplateEngine templateEngine;

    @Value("${app.email.mode:development}")
    private String emailMode;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @PostConstruct
    public void init() {
        if ("production".equals(emailMode)) {
            System.out.println("✅ EmailService inicializado - Modo PRODUCCIÓN");
            System.out.println("📧 Los emails se enviarán realmente a los destinatarios");
        } else {
            System.out.println("✅ EmailService inicializado - Modo DESARROLLO");
            System.out.println("📧 Los emails se mostrarán en consola para pruebas");
        }
    }

    public void sendPasswordResetEmail(String toEmail, String token, String username) {
        String resetLink = "http://localhost:4200/reset-password?token=" + token;

        if ("production".equals(emailMode)) {
            sendRealPasswordResetEmail(toEmail, resetLink, username);
        } else {
            // Modo desarrollo - mostrar en consola
            System.out.println("=" .repeat(60));
            System.out.println("📧 EMAIL DE RESET DE CONTRASEÑA (MODO DESARROLLO)");
            System.out.println("=" .repeat(60));
            System.out.println("Para: " + toEmail);
            System.out.println("Asunto: Restablecimiento de Contraseña - Gemelo Digital");
            System.out.println("Cuerpo:");
            System.out.println("Hola " + username + ",");
            System.out.println();
            System.out.println("Has solicitado restablecer tu contraseña.");
            System.out.println("Para crear una nueva contraseña, haz clic en el siguiente enlace:");
            System.out.println();
            System.out.println("🔗 " + resetLink);
            System.out.println();
            System.out.println("Este enlace expirará en 24 horas.");
            System.out.println();
            System.out.println("Si no solicitaste este cambio, ignora este mensaje.");
            System.out.println("=" .repeat(60));
        }
    }

    private void sendRealPasswordResetEmail(String toEmail, String resetLink, String username) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Restablecimiento de Contraseña - Gemelo Digital");

            // Crear contenido HTML del email
            Context context = new Context();
            context.setVariable("username", username);
            context.setVariable("resetLink", resetLink);
            context.setVariable("currentYear", java.time.Year.now().getValue());

            String htmlContent = templateEngine.process("email/password-reset", context);
            helper.setText(htmlContent, true);

            mailSender.send(message);

            System.out.println("✅ Email de reset enviado a: " + toEmail);

        } catch (MessagingException e) {
            System.err.println("❌ Error enviando email a " + toEmail + ": " + e.getMessage());
            throw new RuntimeException("Error enviando email de reset", e);
        }
    }

    // Método alternativo con email simple (sin HTML)
    private void sendSimplePasswordResetEmail(String toEmail, String resetLink, String username) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Restablecimiento de Contraseña - Gemelo Digital");

            String text = String.format(
                    "Hola %s,\n\n" +
                            "Has solicitado restablecer tu contraseña en Gemelo Digital.\n\n" +
                            "Para crear una nueva contraseña, haz clic en el siguiente enlace:\n" +
                            "%s\n\n" +
                            "Este enlace expirará en 24 horas.\n\n" +
                            "Si no solicitaste este cambio, ignora este mensaje.\n\n" +
                            "Saludos,\n" +
                            "Equipo Gemelo Digital",
                    username, resetLink
            );

            message.setText(text);
            mailSender.send(message);

            System.out.println("✅ Email simple enviado a: " + toEmail);

        } catch (Exception e) {
            System.err.println("❌ Error enviando email simple a " + toEmail + ": " + e.getMessage());
            throw new RuntimeException("Error enviando email de reset", e);
        }
    }
}