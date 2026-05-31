package com.smartwallet.api.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String profession;
    private boolean invests;
    private BigDecimal salary;
    private boolean onboardingCompleted = false;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getProfession() { return profession; }
    public void setProfession(String profession) { this.profession = profession; }

    public boolean isInvests() { return invests; }
    public void setInvests(boolean invests) { this.invests = invests; }

    public BigDecimal getSalary() { return salary; }
    public void setSalary(BigDecimal salary) { this.salary = salary; }

    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }
}