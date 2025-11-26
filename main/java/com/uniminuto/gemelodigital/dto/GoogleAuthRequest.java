package com.uniminuto.gemelodigital.dto;

public class GoogleAuthRequest {
    private String token;
    private String email;
    private String name;
    private String profileImage;

    // Constructores
    public GoogleAuthRequest() {}

    public GoogleAuthRequest(String token, String email, String name, String profileImage) {
        this.token = token;
        this.email = email;
        this.name = name;
        this.profileImage = profileImage;
    }

    // Getters y Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
}