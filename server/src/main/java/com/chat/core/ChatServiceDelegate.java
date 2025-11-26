package com.chat.core;

import com.chat.domain.Group;
import com.chat.domain.Message;
import com.chat.domain.UserProfile;
import com.chat.rpc.dto.CallEventData;
import com.chat.rpc.dto.GroupInfoData;
import com.chat.rpc.dto.MessagePayloadData;
import com.chat.rpc.dto.UserInfoData;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Contains the business logic and acts as the delegate for the Ice servants.
 */
public class ChatServiceDelegate {
    private final ChatRepository repository;
    private final Map<String, UserProfile> users = new ConcurrentHashMap<>();

    public ChatServiceDelegate(ChatRepository repository) {
        this.repository = repository;
    }

    public UserInfoData registerUser(String desiredName) {
        String id = UUID.randomUUID().toString();
        String displayName = Optional.ofNullable(desiredName)
            .filter(name -> !name.trim().isEmpty())
            .orElse("User-" + id.substring(0, 6));
        UserProfile profile = new UserProfile(id, displayName);
        users.put(id, profile);
        return new UserInfoData(profile.getId(), profile.getDisplayName());
    }

    public GroupInfoData createGroup(String requesterId, String name, List<String> members) throws IOException {
        ensureUserExists(requesterId);
        List<String> safeMembers = members != null ? members : new ArrayList<>();
        String groupId = UUID.randomUUID().toString();
        Set<String> uniqueMembers = new HashSet<>(safeMembers);
        uniqueMembers.add(requesterId);
        Group group = new Group(groupId, name, new ArrayList<>(uniqueMembers));
        repository.saveGroup(group);
        return new GroupInfoData(group.getId(), group.getName(), group.getMembers());
    }

    public MessagePayloadData sendText(String userId, String toId, String toType, String text) throws IOException {
        UserProfile author = ensureUserExists(userId);
        Message message = Message.text(
            UUID.randomUUID().toString(),
            author.getId(),
            author.getDisplayName(),
            toId,
            toType,
            text,
            System.currentTimeMillis()
        );
        repository.persistMessage(message);
        return MessagePayloadData.from(message);
    }

    public MessagePayloadData sendAudio(
        String userId,
        String toId,
        String toType,
        byte[] audio,
        String mimeType
    ) throws IOException {
        UserProfile author = ensureUserExists(userId);
        String audioPath = repository.saveAudio(audio, mimeType);
        Message message = Message.audio(
            UUID.randomUUID().toString(),
            author.getId(),
            author.getDisplayName(),
            toId,
            toType,
            audioPath,
            mimeType,
            System.currentTimeMillis()
        );
        repository.persistMessage(message);
        return MessagePayloadData.from(message);
    }

    public List<MessagePayloadData> getHistory(String userId, String targetId, String targetType) {
        ensureUserExists(userId);
        List<MessagePayloadData> result = new ArrayList<>();
        for (Message message : repository.getHistory(userId, targetId, targetType)) {
            result.add(MessagePayloadData.from(message));
        }
        return result;
    }

    public GroupInfoData findGroup(String groupId) {
        Group group = repository.findGroup(groupId);
        if (group == null) {
            return null;
        }
        return new GroupInfoData(group.getId(), group.getName(), group.getMembers());
    }

    public CallEventData startCall(String userId, String targetId, String targetType) {
        UserProfile caller = ensureUserExists(userId);
        return new CallEventData("start", caller.getId(), caller.getDisplayName(), targetId, targetType);
    }

    public CallEventData endCall(String userId, String targetId, String targetType) {
        UserProfile caller = ensureUserExists(userId);
        return new CallEventData("end", caller.getId(), caller.getDisplayName(), targetId, targetType);
    }

    public UserProfile ensureUserExists(String userId) {
        UserProfile profile = users.get(userId);
        if (profile == null) {
            throw new IllegalArgumentException("Unknown user: " + userId);
        }
        return profile;
    }

    public Map<String, UserProfile> getUsers() {
        return users;
    }
}

