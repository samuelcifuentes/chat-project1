package com.chat.rpc.dto;

public class CallEventData {
    private final String type;
    private final String from;
    private final String fromName;
    private final String targetId;
    private final String targetType;

    public CallEventData(String type, String from, String fromName, String targetId, String targetType) {
        this.type = type;
        this.from = from;
        this.fromName = fromName;
        this.targetId = targetId;
        this.targetType = targetType;
    }

    public String getType() {
        return type;
    }

    public String getFrom() {
        return from;
    }

    public String getFromName() {
        return fromName;
    }

    public String getTargetId() {
        return targetId;
    }

    public String getTargetType() {
        return targetType;
    }
}

