package com.example.AutoDocX.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
public class Documentation {
    private String content;
    private int expandedCounter = 0; // How many more turns this doc stays expanded
    private Date lastModified;

    public Documentation(String content) {
        this.content = content;
        this.lastModified = new Date();
    }

    public Documentation(String content, Date lastModified) {
        this.content = content;
        this.lastModified = lastModified;
    }

    public void setContent(String content) {
        this.content = content;
        this.lastModified = new Date();
    }

    public boolean isExpanded() {
        return expandedCounter > 0;
    }

    public void decrementExpandedCounter() {
        if (expandedCounter > 0) {
            expandedCounter--;
        }
    }

    @Override
    public String toString() {
        return content;
    }
}
