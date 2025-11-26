package com.chat.rpc.dto;

public class UserInfoData {
    private final String id;
    private final String displayName;

    public UserInfoData(String id, String displayName) {
        this.id = id;
        this.displayName = displayName;
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }
}

