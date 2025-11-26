package com.chat.core;

import com.chat.domain.Group;
import com.chat.domain.Message;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Handles persistence of messages, groups, and audio assets on disk.
 */
public class ChatRepository {
    private static final Path DATA_DIR = Paths.get("data");
    private static final Path AUDIO_DIR = DATA_DIR.resolve("audio");
    private static final Path MESSAGES_FILE = DATA_DIR.resolve("messages.json");
    private static final Path GROUPS_FILE = DATA_DIR.resolve("groups.json");

    private final Map<String, Group> groups = new ConcurrentHashMap<>();
    private final List<Message> messages = Collections.synchronizedList(new ArrayList<>());

    public ChatRepository() throws IOException {
        Files.createDirectories(DATA_DIR);
        Files.createDirectories(AUDIO_DIR);
        loadGroups();
        loadMessages();
    }

    public List<Message> getHistory(String userId, String targetId, String targetType) {
        synchronized (messages) {
            List<Message> filtered = new ArrayList<>();
            for (Message msg : messages) {
                switch (targetType) {
                    case "user":
                        boolean match =
                            (msg.getFrom().equals(userId) && msg.getTo().equals(targetId)) ||
                            (msg.getFrom().equals(targetId) && msg.getTo().equals(userId));
                        if (match) {
                            filtered.add(msg);
                        }
                        break;
                    case "group":
                        if ("group".equals(msg.getToType()) && msg.getTo().equals(targetId)) {
                            filtered.add(msg);
                        }
                        break;
                    default:
                        break;
                }
            }
            return filtered;
        }
    }

    public void persistMessage(Message message) throws IOException {
        synchronized (messages) {
            messages.add(message);
            saveMessages();
        }
    }

    public Group saveGroup(Group group) throws IOException {
        groups.put(group.getId(), group);
        saveGroups();
        return group;
    }

    public Group findGroup(String groupId) {
        return groups.get(groupId);
    }

    public Map<String, Group> getGroups() {
        return groups;
    }

    public String saveAudio(byte[] audio, String mimeType) throws IOException {
        String extension = mimeTypeToExtension(mimeType);
        String fileName = String.format("audio-%s.%s", UUID.randomUUID(), extension);
        Path filePath = AUDIO_DIR.resolve(fileName);
        Files.write(filePath, audio);
        String base64 = Base64.getEncoder().encodeToString(audio);
        String resolvedMime = mimeType != null ? mimeType : "audio/webm";
        return String.format("data:%s;base64,%s", resolvedMime, base64);
    }

    private void loadMessages() throws IOException {
        if (Files.notExists(MESSAGES_FILE)) {
            return;
        }
        String content = new String(Files.readAllBytes(MESSAGES_FILE), StandardCharsets.UTF_8);
        JSONArray jsonArray = new JSONArray(content);
        messages.clear();
        for (int i = 0; i < jsonArray.length(); i++) {
            JSONObject obj = jsonArray.getJSONObject(i);
            String kind = obj.optString("kind", "text");
            Message message;
            if ("audio".equals(kind)) {
                String mediaRef = obj.optString("audioFile", null);
                String mime = obj.optString("mimeType", "audio/webm");
                message = Message.audio(
                    obj.getString("id"),
                    obj.getString("from"),
                    obj.getString("fromName"),
                    obj.getString("to"),
                    obj.getString("toType"),
                    ensureDataUri(mediaRef, mime),
                    mime,
                    obj.getLong("ts")
                );
            } else {
                message = Message.text(
                    obj.getString("id"),
                    obj.getString("from"),
                    obj.getString("fromName"),
                    obj.getString("to"),
                    obj.getString("toType"),
                    obj.optString("text", ""),
                    obj.getLong("ts")
                );
            }
            messages.add(message);
        }
    }

    private void saveMessages() throws IOException {
        JSONArray jsonArray = new JSONArray();
        for (Message message : messages) {
            jsonArray.put(message.toJSON());
        }
        Files.write(MESSAGES_FILE, jsonArray.toString(2).getBytes(StandardCharsets.UTF_8));
    }

    private void loadGroups() throws IOException {
        if (Files.notExists(GROUPS_FILE)) {
            return;
        }
        String content = new String(Files.readAllBytes(GROUPS_FILE), StandardCharsets.UTF_8);
        JSONObject jsonObject = new JSONObject(content);
        groups.clear();
        Iterator<String> keys = jsonObject.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            groups.put(key, Group.fromJSON(jsonObject.getJSONObject(key)));
        }
    }

    private void saveGroups() throws IOException {
        JSONObject jsonObject = new JSONObject();
        for (Map.Entry<String, Group> entry : groups.entrySet()) {
            jsonObject.put(entry.getKey(), entry.getValue().toJSON());
        }
        Files.write(GROUPS_FILE, jsonObject.toString(2).getBytes(StandardCharsets.UTF_8));
    }

    private String ensureDataUri(String stored, String mimeType) throws IOException {
        if (stored == null || stored.startsWith("data:")) {
            return stored;
        }
        Path candidate = Paths.get(stored);
        if (!Files.exists(candidate)) {
            candidate = DATA_DIR.resolve(stored).normalize();
        }
        if (Files.exists(candidate)) {
            byte[] bytes = Files.readAllBytes(candidate);
            return String.format("data:%s;base64,%s", mimeType, Base64.getEncoder().encodeToString(bytes));
        }
        return stored;
    }

    private String mimeTypeToExtension(String mimeType) {
        if (mimeType == null) {
            return "webm";
        }
        if (mimeType.contains("/")) {
            return mimeType.substring(mimeType.indexOf('/') + 1);
        }
        return "bin";
    }
}

