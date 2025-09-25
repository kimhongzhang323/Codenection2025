package com.example.AutoDocX.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
public class Documentation {
    private String content;
    private Date lastUpdated;

    public Documentation() {
        this.lastUpdated = new Date();
    }

    public Documentation(String content) {
        this.content = content;
        this.lastUpdated = new Date();
    }

    public void setContent(String content) {
        this.content = content;
        this.lastUpdated = new Date();
    }

    @Override
    public String toString() {
        return content;
    }
}
