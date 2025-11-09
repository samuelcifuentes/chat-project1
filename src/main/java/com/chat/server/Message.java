package com.chat.server;

import org.json.JSONObject;

public class Message {
    private String id;
    private String from;
    private String fromName;
    private String to;
    private String toType;
    private String text;
    private String audioFile;
    private long ts;
    private String kind;
    
    public Message(String id, String from, String fromName, String to, String toType, 
                   String text, long ts, String kind) {
        this.id = id;
        this.from = from;
        this.fromName = fromName;
        this.to = to;
        this.toType = toType;
        this.text = text;
        this.ts = ts;
        this.kind = kind;
    }
    
    public Message(String id, String from, String fromName, String to, String toType, 
                   String audioFile, long ts, String kind, boolean isAudio) {
        this.id = id;
        this.from = from;
        this.fromName = fromName;
        this.to = to;
        this.toType = toType;
        this.audioFile = audioFile;
        this.ts = ts;
        this.kind = kind;
    }
    
    public JSONObject toJSON() {
        JSONObject json = new JSONObject();
        json.put("id", id);
        json.put("from", from);
        json.put("fromName", fromName);
        json.put("to", to);
        json.put("toType", toType);
        json.put("ts", ts);
        json.put("kind", kind);
        if (text != null) {
            json.put("text", text);
        }
        if (audioFile != null) {
            json.put("audioFile", audioFile);
        }
        return json;
    }
    
    public static Message fromJSON(JSONObject json) {
        String id = json.getString("id");
        String from = json.getString("from");
        String fromName = json.getString("fromName");
        String to = json.getString("to");
        String toType = json.getString("toType");
        long ts = json.getLong("ts");
        String kind = json.getString("kind");
        
        if ("text".equals(kind)) {
            String text = json.getString("text");
            return new Message(id, from, fromName, to, toType, text, ts, kind);
        } else {
            String audioFile = json.optString("audioFile", null);
            return new Message(id, from, fromName, to, toType, audioFile, ts, kind, true);
        }
    }
    
    // Getters
    public String getId() { return id; }
    public String getFrom() { return from; }
    public String getFromName() { return fromName; }
    public String getTo() { return to; }
    public String getToType() { return toType; }
    public String getText() { return text; }
    public String getAudioFile() { return audioFile; }
    public long getTs() { return ts; }
    public String getKind() { return kind; }
}

