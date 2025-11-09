package com.chat.server;

import java.util.*;
import org.json.JSONObject;
import org.json.JSONArray;

public class Group {
    private String id;
    private String name;
    private List<String> members;
    
    public Group(String id, String name, List<String> members) {
        this.id = id;
        this.name = name;
        this.members = new ArrayList<>(members);
    }
    
    public JSONObject toJSON() {
        JSONObject json = new JSONObject();
        json.put("id", id);
        json.put("name", name);
        JSONArray membersArray = new JSONArray();
        for (String member : members) {
            membersArray.put(member);
        }
        json.put("members", membersArray);
        return json;
    }
    
    public static Group fromJSON(JSONObject json) {
        String id = json.getString("id");
        String name = json.getString("name");
        List<String> members = new ArrayList<>();
        JSONArray membersArray = json.getJSONArray("members");
        for (int i = 0; i < membersArray.length(); i++) {
            members.add(membersArray.getString(i));
        }
        return new Group(id, name, members);
    }
    
    // Getters
    public String getId() { return id; }
    public String getName() { return name; }
    public List<String> getMembers() { return new ArrayList<>(members); }
}

