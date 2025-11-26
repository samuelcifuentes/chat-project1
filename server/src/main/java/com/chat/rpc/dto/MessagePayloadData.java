package com.chat.rpc.dto;

import com.chat.domain.Message;

public class MessagePayloadData {
    private final String id;
    private final String from;
    private final String fromName;
    private final String to;
    private final String toType;
    private final String kind;
    private final String text;
    private final String mediaPath;
    private final String mediaMime;
    private final long timestamp;

    public MessagePayloadData(
        String id,
        String from,
        String fromName,
        String to,
        String toType,
        String kind,
        String text,
        String mediaPath,
        String mediaMime,
        long timestamp
    ) {
        this.id = id;
        this.from = from;
        this.fromName = fromName;
        this.to = to;
        this.toType = toType;
        this.kind = kind;
        this.text = text;
        this.mediaPath = mediaPath;
        this.mediaMime = mediaMime;
        this.timestamp = timestamp;
    }

    public static MessagePayloadData from(Message message) {
        return new MessagePayloadData(
            message.getId(),
            message.getFrom(),
            message.getFromName(),
            message.getTo(),
            message.getToType(),
            message.getKind(),
            message.getText(),
            message.getMediaPath(),
            message.getMediaMime(),
            message.getTimestamp()
        );
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

    public String getKind() {
        return kind;
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
}

