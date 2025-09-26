package com.example.AutoDocX.model;

import lombok.Getter;
import lombok.Setter;

import java.util.Date;

@Getter
@Setter
public class Documentation {
    private String content;
    private Date lastUpdated;
    private int expandedCounter = 0;

    public Documentation() {
        this.lastUpdated = new Date();
    }

    public Documentation(String content) {
        this.content = content;
        this.lastUpdated = new Date();
    }

    public Documentation(String content, int expandedCounter) {
        this.content = content;
        this.lastUpdated = new Date();
        this.expandedCounter = expandedCounter;
    }

    public void setContent(String content) {
        this.content = content;
        this.lastUpdated = new Date();
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
