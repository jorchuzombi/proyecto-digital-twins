package com.uniminuto.gemelodigital.dto;

import java.util.List;

public class LoginResponse {

    private String token;
    private String username;
    private String email; // ✅ CAMPO AGREGADO
    private List<String> roles;

    public LoginResponse() {}

    public LoginResponse(String token, String username, List<String> roles) {
        this.token = token;
        this.username = username;
        this.roles = roles;
    }

    // ✅ NUEVO CONSTRUCTOR CON EMAIL
    public LoginResponse(String token, String username, String email, List<String> roles) {
        this.token = token;
        this.username = username;
        this.email = email;
        this.roles = roles;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    // ✅ GETTER Y SETTER PARA EMAIL
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}