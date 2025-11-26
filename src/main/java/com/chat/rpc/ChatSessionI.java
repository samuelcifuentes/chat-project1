package com.chat.rpc;

import Chat.CallEvent;
import Chat.ChatSession;
import Chat.GroupInfo;
import Chat.MessagePayload;
import Chat.RealtimePushPrx;
import Chat.UserInfo;
import com.chat.core.ChatServiceDelegate;
import com.chat.rpc.dto.CallEventData;
import com.chat.rpc.dto.GroupInfoData;
import com.chat.rpc.dto.MessagePayloadData;
import com.chat.rpc.dto.UserInfoData;
import java.io.IOException;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;

public class ChatSessionI implements ChatSession {
    private final ChatServiceDelegate delegate;
    private final RealtimePushManager pushManager;

    public ChatSessionI(ChatServiceDelegate delegate, RealtimePushManager pushManager) {
        this.delegate = delegate;
        this.pushManager = pushManager;
    }

    @Override
    public UserInfo registerUser(String desiredName, com.zeroc.Ice.Current current) {
        UserInfoData data = delegate.registerUser(desiredName);
        return new UserInfo(data.getId(), data.getDisplayName());
    }

    @Override
    public GroupInfo createGroup(String userId, String name, String[] members, com.zeroc.Ice.Current current) {
        try {
            GroupInfoData data = delegate.createGroup(userId, name, Arrays.asList(members));
            pushManager.emitGroupCreated(data);
            return data.toSlice();
        } catch (IOException ex) {
            throw new RuntimeException("Unable to persist group", ex);
        }
    }

    @Override
    public void sendText(
        String userId,
        String toId,
        String toType,
        String text,
        com.zeroc.Ice.Current current
    ) {
        try {
            MessagePayloadData payload = delegate.sendText(userId, toId, toType, text);
            broadcastMessage(payload, toType, toId, userId);
        } catch (IOException ex) {
            throw new RuntimeException("Unable to send text message", ex);
        }
    }

    @Override
    public void sendAudio(
        String userId,
        String toId,
        String toType,
        byte[] audioData,
        String mimeType,
        com.zeroc.Ice.Current current
    ) {
        try {
            MessagePayloadData payload = delegate.sendAudio(userId, toId, toType, audioData, mimeType);
            broadcastMessage(payload, toType, toId, userId);
        } catch (IOException ex) {
            throw new RuntimeException("Unable to send audio message", ex);
        }
    }

    @Override
    public MessagePayload[] getHistory(
        String userId,
        String targetId,
        String targetType,
        com.zeroc.Ice.Current current
    ) {
        List<MessagePayloadData> history = delegate.getHistory(userId, targetId, targetType);
        MessagePayload[] payloads = new MessagePayload[history.size()];
        for (int i = 0; i < history.size(); i++) {
            payloads[i] = toSliceMessage(history.get(i));
        }
        return payloads;
    }

    @Override
    public void subscribePush(String userId, RealtimePushPrx client, com.zeroc.Ice.Current current) {
        Objects.requireNonNull(client, "Realtime push proxy cannot be null");
        pushManager.subscribe(userId, client);
    }

    @Override
    public void unsubscribePush(String userId, RealtimePushPrx client, com.zeroc.Ice.Current current) {
        pushManager.unsubscribe(userId);
    }

    @Override
    public CallEvent startCall(String userId, String targetId, String targetType, com.zeroc.Ice.Current current) {
        CallEventData data = delegate.startCall(userId, targetId, targetType);
        Collection<String> recipients = resolveRecipients(targetType, targetId, userId);
        pushManager.emitCallEvent(data, recipients);
        return new CallEvent(data.getType(), data.getFrom(), data.getFromName(), data.getTargetId(), data.getTargetType());
    }

    @Override
    public CallEvent endCall(String userId, String targetId, String targetType, com.zeroc.Ice.Current current) {
        CallEventData data = delegate.endCall(userId, targetId, targetType);
        Collection<String> recipients = resolveRecipients(targetType, targetId, userId);
        pushManager.emitCallEvent(data, recipients);
        return new CallEvent(data.getType(), data.getFrom(), data.getFromName(), data.getTargetId(), data.getTargetType());
    }

    private void broadcastMessage(MessagePayloadData payload, String toType, String toId, String senderId) {
        Collection<String> recipients = resolveRecipients(toType, toId, senderId);
        pushManager.emitMessage(payload, recipients);
    }

    private Collection<String> resolveRecipients(String toType, String toId, String senderId) {
        if ("group".equals(toType)) {
            GroupInfoData group = delegate.findGroup(toId);
            if (group == null) {
                return Collections.singleton(senderId);
            }
            return group.getMembers();
        }

        Collection<String> recipients = new LinkedHashSet<>();
        if (senderId != null) {
            recipients.add(senderId);
        }
        if (toId != null) {
            recipients.add(toId);
        }
        return recipients;
    }

    private MessagePayload toSliceMessage(MessagePayloadData data) {
        return new MessagePayload(
            data.getId(),
            data.getFrom(),
            data.getFromName(),
            data.getTo(),
            data.getToType(),
            data.getKind(),
            data.getText(),
            data.getMediaPath(),
            data.getMediaMime(),
            data.getTimestamp()
        );
    }
}

