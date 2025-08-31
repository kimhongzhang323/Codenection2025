package com.example.AutoDocX.service.memory;

import java.util.ArrayList;
import java.util.List;

public class Memory {
    private static final int MIN_OVERLAP_LENGTH = 100; // Minimum length of common substring to consider for deduplication

    private final List<MemoryEntry> entries = new ArrayList<>();

    public void addEntry(String query, String result) {
        MemoryEntry newEntry = new MemoryEntry(query, result);

        List<MemoryEntry> entriesToRemove = new ArrayList<>();

        for (int i = entries.size() - 1; i >= 0; i--) {
            MemoryEntry existingEntry = entries.get(i);
            String existingResult = existingEntry.getResult();
            String newResult = newEntry.getResult();

            // Case 1: New entry completely subsumes an old entry, remove the old one
            if (newResult.contains(existingResult) && !newResult.equals(existingResult)) {
                entriesToRemove.add(existingEntry);
            }
            // Case 2: Old entry contains the new entry (unlikely if new is more comprehensive, but for partial overlaps)
            else {
                String commonSubstring = findLongestCommonSubstring(existingResult, newResult);
                if (!commonSubstring.isEmpty() && commonSubstring.length() >= MIN_OVERLAP_LENGTH) {
                    // Remove the common substring from the OLDER entry
                    String updatedResult = newResult.replace(commonSubstring, commonSubstring.substring(0, MIN_OVERLAP_LENGTH) + "... [REPEATED CONTENT]").trim();
                    newEntry.setResult(updatedResult);
                }
            }
        }

        entries.removeAll(entriesToRemove);
        entries.add(newEntry);
    }

    public List<MemoryEntry> getEntries() {
        return new ArrayList<>(entries);
    }

    private String findLongestCommonSubstring(String s1, String s2) {
        String longest = "";
        int m = s1.length();
        int n = s2.length();
        int[][] dp = new int[m + 1][n + 1];
        int maxLength = 0;
        int endIndex = 0;

        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                    if (dp[i][j] > maxLength) {
                        maxLength = dp[i][j];
                        endIndex = i - 1;
                    }
                } else {
                    dp[i][j] = 0;
                }
            }
        }
        if (maxLength > 0) {
            longest = s1.substring(endIndex - maxLength + 1, endIndex + 1);
        }
        return longest;
    }

    public static class MemoryEntry {
        private final String query;
        private String result; // Made mutable

        public MemoryEntry(String query, String result) {
            this.query = query;
            this.result = result;
        }

        public String getQuery() {
            return query;
        }

        public String getResult() {
            return result;
        }

        public void setResult(String result) { // Added setter
            this.result = result;
        }
    }
}
