package com.chat.rpc;

import Chat.CallEvent;
import Chat.MessagePayload;
import Chat.RealtimePushPrx;
import com.chat.rpc.dto.CallEventData;
import com.chat.rpc.dto.GroupInfoData;
import com.chat.rpc.dto.MessagePayloadData;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

public class RealtimePushManager {
    private final Map<String, RealtimePushPrx> subscribers = new ConcurrentHashMap<>();

    public void subscribe(String userId, RealtimePushPrx client) {
        subscribers.put(userId, client);
    }

    public void unsubscribe(String userId) {
        subscribers.remove(userId);
    }

    public void emitMessage(MessagePayloadData payload, Collection<String> recipients) {
        MessagePayload slicePayload = toSliceMessage(payload);
        for (String recipient : recipients) {
            RealtimePushPrx client = subscribers.get(recipient);
            if (client != null) {
                CompletableFuture
                    .runAsync(() -> client.onIncomingMessage(slicePayload))
                    .exceptionally(ex -> null);
            }
        }
    }

    public void emitGroupCreated(GroupInfoData group) {
        for (RealtimePushPrx client : subscribers.values()) {
            CompletableFuture
                .runAsync(() -> client.onGroupCreated(group.toSlice()))
                .exceptionally(ex -> null);
        }
    }

    public void emitCallEvent(CallEventData data, Collection<String> recipients) {
        CallEvent event = new CallEvent(data.getType(), data.getFrom(), data.getFromName(), data.getTargetId(), data.getTargetType());
        for (String recipient : recipients) {
            RealtimePushPrx client = subscribers.get(recipient);
            if (client != null) {
                CompletableFuture
                    .runAsync(() -> client.onCallEvent(event))
                    .exceptionally(ex -> null);
            }
        }
    }

    private MessagePayload toSliceMessage(MessagePayloadData payload) {
        return new MessagePayload(
            payload.getId(),
            payload.getFrom(),
            payload.getFromName(),
            payload.getTo(),
            payload.getToType(),
            payload.getKind(),
            payload.getText(),
            payload.getMediaPath(),
            payload.getMediaMime(),
            payload.getTimestamp()
        );
    }
}

