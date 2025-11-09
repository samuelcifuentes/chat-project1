package com.chat.server;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.JSONArray;
import org.json.JSONObject;

public class ChatServer {
    private static final int PORT = 8888;
    private static final String DATA_DIR = "data";
    private static final String MESSAGES_FILE = DATA_DIR + "/messages.json";
    private static final String GROUPS_FILE = DATA_DIR + "/groups.json";
    
    private ServerSocket serverSocket;
    private ExecutorService clientThreadPool;
    private Map<String, ClientHandler> clients = new ConcurrentHashMap<>();
    private Map<String, Group> groups = new ConcurrentHashMap<>();
    private List<Message> messages = new ArrayList<>();
    
    public static void main(String[] args) {
        ChatServer server = new ChatServer();
        server.start();
    }
    
    public void start() {
        try {
            // Create data directory if it doesn't exist
            Files.createDirectories(Paths.get(DATA_DIR));
            
            // Load existing data
            loadMessages();
            loadGroups();
            
            serverSocket = new ServerSocket(PORT);
            clientThreadPool = Executors.newCachedThreadPool();
            
            System.out.println("[SERVER] Chat server started on port " + PORT);
            System.out.println("[SERVER] Waiting for clients...");
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                ClientHandler handler = new ClientHandler(clientSocket, this);
                clientThreadPool.execute(handler);
            }
        } catch (IOException e) {
            System.err.println("[SERVER] Error starting server: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public synchronized void addClient(String clientId, ClientHandler handler) {
        // Remove old handler if it exists (for session reuse)
        ClientHandler oldHandler = clients.get(clientId);
        if (oldHandler != null && oldHandler != handler) {
            System.out.println("[SERVER] Replacing handler for client: " + clientId);
        }
        clients.put(clientId, handler);
        System.out.println("[SERVER] Client connected: " + clientId);
    }
    
    public synchronized void removeClient(String clientId) {
        clients.remove(clientId);
        System.out.println("[SERVER] Client disconnected: " + clientId);
    }
    
    public synchronized boolean hasClient(String clientId) {
        return clients.containsKey(clientId);
    }
    
    public synchronized Group createGroup(String groupId, String name, List<String> members) {
        Group group = new Group(groupId, name, members);
        groups.put(groupId, group);
        saveGroups();
        System.out.println("[SERVER] Group created: " + name + " (" + groupId + ")");
        return group;
    }
    
    public synchronized void addMessage(Message message) {
        messages.add(message);
        saveMessages();
        
        // Broadcast to recipients
        if ("user".equals(message.getToType())) {
            ClientHandler recipient = clients.get(message.getTo());
            if (recipient != null) {
                recipient.sendMessage(message);
            }
            // Also send to sender
            ClientHandler sender = clients.get(message.getFrom());
            if (sender != null) {
                sender.sendMessage(message);
            }
        } else if ("group".equals(message.getToType())) {
            Group group = groups.get(message.getTo());
            if (group != null) {
                for (String memberId : group.getMembers()) {
                    ClientHandler member = clients.get(memberId);
                    if (member != null) {
                        member.sendMessage(message);
                    }
                }
            }
        }
    }
    
    public synchronized List<Message> getHistory(String userId, String targetId, String targetType) {
        List<Message> filtered = new ArrayList<>();
        for (Message msg : messages) {
            if ("user".equals(targetType)) {
                // Return messages between userId and targetId
                if ((userId.equals(msg.getFrom()) && targetId.equals(msg.getTo())) ||
                    (targetId.equals(msg.getFrom()) && userId.equals(msg.getTo()))) {
                    filtered.add(msg);
                }
            } else if ("group".equals(targetType)) {
                // Return messages to this group
                if (targetId.equals(msg.getTo()) && "group".equals(msg.getToType())) {
                    filtered.add(msg);
                }
            }
        }
        return filtered;
    }
    
    public Map<String, Group> getGroups() {
        return groups;
    }
    
    private void loadMessages() {
        try {
            if (Files.exists(Paths.get(MESSAGES_FILE))) {
                String content = new String(Files.readAllBytes(Paths.get(MESSAGES_FILE)), StandardCharsets.UTF_8);
                JSONArray jsonArray = new JSONArray(content);
                messages.clear();
                for (int i = 0; i < jsonArray.length(); i++) {
                    messages.add(Message.fromJSON(jsonArray.getJSONObject(i)));
                }
                System.out.println("[SERVER] Loaded " + messages.size() + " messages");
            }
        } catch (Exception e) {
            System.err.println("[SERVER] Error loading messages: " + e.getMessage());
        }
    }
    
    private void saveMessages() {
        try {
            JSONArray jsonArray = new JSONArray();
            for (Message msg : messages) {
                jsonArray.put(msg.toJSON());
            }
            Files.write(Paths.get(MESSAGES_FILE), jsonArray.toString(2).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            System.err.println("[SERVER] Error saving messages: " + e.getMessage());
        }
    }
    
    private void loadGroups() {
        try {
            if (Files.exists(Paths.get(GROUPS_FILE))) {
                String content = new String(Files.readAllBytes(Paths.get(GROUPS_FILE)), StandardCharsets.UTF_8);
                JSONObject jsonObject = new JSONObject(content);
                groups.clear();
                Iterator<String> keys = jsonObject.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    groups.put(key, Group.fromJSON(jsonObject.getJSONObject(key)));
                }
                System.out.println("[SERVER] Loaded " + groups.size() + " groups");
            }
        } catch (Exception e) {
            System.err.println("[SERVER] Error loading groups: " + e.getMessage());
        }
    }
    
    private void saveGroups() {
        try {
            JSONObject jsonObject = new JSONObject();
            for (Map.Entry<String, Group> entry : groups.entrySet()) {
                jsonObject.put(entry.getKey(), entry.getValue().toJSON());
            }
            Files.write(Paths.get(GROUPS_FILE), jsonObject.toString(2).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            System.err.println("[SERVER] Error saving groups: " + e.getMessage());
        }
    }
}

