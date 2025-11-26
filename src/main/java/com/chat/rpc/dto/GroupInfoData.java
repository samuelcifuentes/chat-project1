package com.chat.rpc.dto;

import Chat.GroupInfo;
import java.util.List;

public class GroupInfoData {
    private final String id;
    private final String name;
    private final List<String> members;

    public GroupInfoData(String id, String name, List<String> members) {
        this.id = id;
        this.name = name;
        this.members = members;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<String> getMembers() {
        return members;
    }

    public GroupInfo toSlice() {
        return new GroupInfo(id, name, members.toArray(new String[0]));
    }
}

