package com.uniminuto.gemelodigital.entity;

import java.time.LocalDateTime;

public class PasswordResetToken {
    private String email;
    private LocalDateTime expirationTime;

    public PasswordResetToken() {}

    public PasswordResetToken(String email, LocalDateTime expirationTime) {
        this.email = email;
        this.expirationTime = expirationTime;
    }

    // Getters y setters
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDateTime getExpirationTime() {
        return expirationTime;
    }

    public void setExpirationTime(LocalDateTime expirationTime) {
        this.expirationTime = expirationTime;
    }
}