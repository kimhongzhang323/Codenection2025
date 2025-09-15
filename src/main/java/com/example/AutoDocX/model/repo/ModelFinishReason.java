package com.example.AutoDocX.model.repo;

public enum ModelFinishReason {
    TOOL_CALL,       // when model issues one or more function/tool calls
    FINAL,           // final natural answer text (no more tools)
    OUTPUT_ERROR,    // error from Gemini side (e.g. internal errors, server faults, etc.)
    INPUT_ERROR,     // error due to bad input, e.g. malformed request, exceeding input limits
    UNKNOWN          // any unknown or unhandled finish reason
}
