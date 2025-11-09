package com.chat.server;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.UUID;
import org.json.JSONObject;

public class ClientHandler implements Runnable {
    private Socket socket;
    private ChatServer server;
    private String clientId;
    private String clientName;
    private BufferedReader reader;
    private PrintWriter writer;
    
    private boolean clientIdSet = false;
    
    public ClientHandler(Socket socket, ChatServer server) {
        this.socket = socket;
        this.server = server;
        this.clientId = UUID.randomUUID().toString();
        this.clientName = "User-" + clientId.substring(0, 4);
    }
    
    @Override
    public void run() {
        try {
            reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), "UTF-8"));
            writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), "UTF-8"), true);
            
            String line;
            boolean firstRequest = true;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                
                try {
                    JSONObject request = new JSONObject(line);
                    
                    if (request.has("clientId")) {
                        String providedClientId = request.getString("clientId");
                        if (!providedClientId.equals(this.clientId)) {
                            if (clientIdSet) {
                                server.removeClient(this.clientId);
                            }
                            this.clientId = providedClientId;
                            this.clientName = request.optString("clientName", "User-" + clientId.substring(0, 4));
                        }
                    }
                    
                    if (!clientIdSet) {
                        server.addClient(clientId, this);
                        clientIdSet = true;
                    } else {
                        server.addClient(clientId, this);
                    }
                    
                    firstRequest = false;
                    
                    handleRequest(request);
           
                    if (!request.optBoolean("keepAlive", false)) {
                        break;
                    }
                } catch (Exception e) {
                    System.err.println("[CLIENT] Error parsing request: " + e.getMessage());
                    sendError("Invalid request format");
                    break;
                }
            }
        } catch (IOException e) {
            System.err.println("[CLIENT] Error handling client " + clientId + ": " + e.getMessage());
        } finally {
            try {
                server.removeClient(clientId);
                socket.close();
            } catch (IOException e) {
                System.err.println("[CLIENT] Error closing socket: " + e.getMessage());
            }
        }
    }
    
    private void handleRequest(JSONObject request) {
        String type = request.optString("type", "");
        JSONObject payload = request.optJSONObject("payload");
        
        if (payload == null) {
            payload = new JSONObject();
        }
        
        switch (type) {
            case "init":
                // Initialize/register client - always send welcome for init
                sendResponse("welcome", new JSONObject()
                    .put("id", clientId)
                    .put("name", clientName)
                    .toString());
                break;
                
            case "set_name":
                if (payload.has("name")) {
                    clientName = payload.getString("name");
                    sendResponse("name_set", new JSONObject().put("name", clientName).toString());
                }
                break;
                
            case "create_group":
                String groupName = payload.optString("name", "Grupo-" + UUID.randomUUID().toString().substring(0, 4));
                String groupId = UUID.randomUUID().toString();
                List<String> members = new ArrayList<>();
                if (payload.has("members")) {
                    org.json.JSONArray membersArray = payload.getJSONArray("members");
                    for (int i = 0; i < membersArray.length(); i++) {
                        members.add(membersArray.getString(i));
                    }
                }
                if (members.isEmpty()) {
                    members.add(clientId);
                }
                
                Group group = server.createGroup(groupId, groupName, members);
                sendResponse("group_created", group.toJSON().toString());
                break;
                
            case "text_message":
                String to = payload.optString("to");
                String toType = payload.optString("toType");
                String text = payload.optString("text");
                
                if (to != null && toType != null && text != null && !text.isEmpty()) {
                    Message message = new Message(
                        UUID.randomUUID().toString(),
                        clientId,
                        clientName,
                        to,
                        toType,
                        text,
                        System.currentTimeMillis(),
                        "text"
                    );
                    server.addMessage(message);
                    sendResponse("message_sent", message.toJSON().toString());
                } else {
                    sendError("Missing required fields: to, toType, text");
                }
                break;
                
            case "get_history":
                String targetId = payload.optString("targetId");
                String targetType = payload.optString("targetType");
                
                if (targetId != null && targetType != null) {
                    List<Message> history = server.getHistory(clientId, targetId, targetType);
                    org.json.JSONArray historyArray = new org.json.JSONArray();
                    for (Message msg : history) {
                        historyArray.put(msg.toJSON());
                    }
                    sendResponse("history", new JSONObject().put("messages", historyArray).toString());
                } else {
                    sendError("Missing required fields: targetId, targetType");
                }
                break;
                
            default:
                sendError("Unknown request type: " + type);
        }
    }
    
    public void sendMessage(Message message) {
        try {
            if (socket != null && !socket.isClosed() && writer != null) {
                JSONObject response = new JSONObject();
                response.put("type", "incoming_message");
                response.put("payload", message.toJSON());
                sendRaw(response.toString());
            }
        } catch (Exception e) {
        }
    }
    
    public void sendResponse(String type, String payload) {
        JSONObject response = new JSONObject();
        response.put("type", type);
        response.put("payload", new JSONObject(payload));
        sendRaw(response.toString());
    }
    
    public void sendError(String error) {
        JSONObject response = new JSONObject();
        response.put("type", "error");
        response.put("payload", new JSONObject().put("error", error));
        sendRaw(response.toString());
    }
    
    private void sendRaw(String message) {
        writer.println(message);
        writer.flush();
    }
    
    public String getClientId() {
        return clientId;
    }
    
    public String getClientName() {
        return clientName;
    }
}

