package com.chat.domain;

import org.json.JSONObject;

/**
 * Represents a chat message that can contain plain text or a reference to an audio file.
 */
public class Message {
    private final String id;
    private final String from;
    private final String fromName;
    private final String to;
    private final String toType;
    private final String text;
    private final String mediaPath;
    private final String mediaMime;
    private final long timestamp;
    private final String kind;

    private Message(
        String id,
        String from,
        String fromName,
        String to,
        String toType,
        String text,
        String mediaPath,
        String mediaMime,
        long timestamp,
        String kind
    ) {
        this.id = id;
        this.from = from;
        this.fromName = fromName;
        this.to = to;
        this.toType = toType;
        this.text = text;
        this.mediaPath = mediaPath;
        this.mediaMime = mediaMime;
        this.timestamp = timestamp;
        this.kind = kind;
    }

    public static Message text(
        String id,
        String from,
        String fromName,
        String to,
        String toType,
        String text,
        long timestamp
    ) {
        return new Message(id, from, fromName, to, toType, text, null, null, timestamp, "text");
    }

    public static Message audio(
        String id,
        String from,
        String fromName,
        String to,
        String toType,
        String mediaPath,
        String mediaMime,
        long timestamp
    ) {
        return new Message(id, from, fromName, to, toType, null, mediaPath, mediaMime, timestamp, "audio");
    }

    public JSONObject toJSON() {
        JSONObject json = new JSONObject();
        json.put("id", id);
        json.put("from", from);
        json.put("fromName", fromName);
        json.put("to", to);
        json.put("toType", toType);
        json.put("ts", timestamp);
        json.put("kind", kind);
        if (text != null) {
            json.put("text", text);
        }
        if (mediaPath != null) {
            json.put("audioFile", mediaPath);
        }
        if (mediaMime != null) {
            json.put("mimeType", mediaMime);
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
        String kind = json.optString("kind", "text");

        if ("audio".equals(kind)) {
            String audioPath = json.optString("audioFile", null);
            String mimeType = json.optString("mimeType", "audio/webm");
            return Message.audio(id, from, fromName, to, toType, audioPath, mimeType, ts);
        }

        String text = json.optString("text", "");
        return Message.text(id, from, fromName, to, toType, text, ts);
    }

    public String getId() {
        return id;
    }

    public String getFrom() {
        return from;
    }

    public String getFromName() {
        return fromName;
    }

    public String getTo() {
        return to;
    }

    public String getToType() {
        return toType;
    }

    public String getText() {
        return text;
    }

    public String getMediaPath() {
        return mediaPath;
    }

    public String getMediaMime() {
        return mediaMime;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public String getKind() {
        return kind;
    }
}

