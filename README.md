# Chat System - HTTP Proxy Architecture

This project is a chat system that has been transitioned from a TCP-based architecture to an HTTP-based architecture. The system consists of three main components:

1. **Java TCP Backend Server** - Handles chat logic, message storage, and group management
2. **Node.js/Express HTTP Proxy** - Translates HTTP requests from the client into TCP messages for the backend
3. **Web Client** - HTML/CSS/JavaScript client that communicates via HTTP

## 🏗️ Architecture Overview

```
┌─────────────┐         HTTP          ┌──────────────┐         TCP          ┌─────────────┐
│   Browser   │ ◄──────────────────► │ HTTP Proxy   │ ◄──────────────────► │ Java Server │
│   Client    │   (REST API)         │  (Express)   │   (JSON over TCP)   │  (TCP:8888)  │
└─────────────┘                       └──────────────┘                       └─────────────┘
```

### Communication Flow

1. **Client → Proxy**: The web client makes HTTP requests (POST/GET) to the Express proxy server
2. **Proxy → Backend**: The proxy translates HTTP requests into TCP messages and sends them to the Java backend
3. **Backend → Proxy**: The Java backend processes requests and sends JSON responses over TCP
4. **Proxy → Client**: The proxy translates TCP responses back to HTTP responses and returns them to the client

## 📦 Components

### Java Backend Server (`src/main/java/com/chat/server/`)

- **ChatServer.java**: Main server class that listens on TCP port 8888
- **ClientHandler.java**: Handles individual client connections and requests
- **Message.java**: Data model for chat messages
- **Group.java**: Data model for chat groups

**Features:**
- Creates and manages chat groups
- Sends and stores text messages
- Retrieves message history (text and audio)
- Persistent storage in JSON files (`data/messages.json`, `data/groups.json`)

### HTTP Proxy Server (`server.js`)

- Express server running on port 3000 (default)
- Translates HTTP REST API calls to TCP messages
- Manages client sessions
- Serves static files (HTML, CSS, JS)

**API Endpoints:**
- `POST /api/init` - Initialize a client session
- `POST /api/groups` - Create a new chat group
- `POST /api/messages` - Send a text message
- `GET /api/history` - Get message history for a user or group
- `GET /api/health` - Health check endpoint

### Web Client (`public/`)

- **Index.html**: Main HTML structure
- **App.js**: Client-side JavaScript that makes HTTP requests
- **Style.css**: Styling for the chat interface
- **VoiceRecorder.js**, **AudioPlayer.js**: Components for audio (not used in HTTP version)

**Features:**
- Create chat groups
- Send text messages to groups
- View message history
- Modern, responsive UI

## 🚀 Setup and Execution

### Prerequisites

- **Java JDK 11 or higher**
- **Node.js 20.11.0 or higher**
- **Gradle** (included via Gradle Wrapper)

### Step 1: Install Dependencies

#### Node.js Dependencies
```bash
npm install
```

#### Java Dependencies
Java dependencies are managed by Gradle and will be downloaded automatically when building.

### Step 2: Build Java Backend

```bash
# Build the Java project (Linux/Mac)
./gradlew build

# On Windows (Command Prompt):
gradlew.bat build

# On Windows (PowerShell):
.\gradlew.bat build
```

**Note:** If you get an error about `gradle-wrapper.jar`, it may need to be downloaded. The first time you run Gradle, it will automatically download the required version (Gradle 6.9.4).

### Step 3: Start the Java Backend Server

In one terminal:

```bash
# Run the Java server (Linux/Mac)
./gradlew runServer

# On Windows (Command Prompt):
gradlew.bat runServer

# On Windows (PowerShell):
.\gradlew.bat runServer
```

The Java server will start on **port 8888**. You should see:
```
[SERVER] Chat server started on port 8888
[SERVER] Waiting for clients...
```

### Step 4: Start the HTTP Proxy Server

In another terminal:

```bash
# Start the proxy server
npm start

# Or:
node server.js
```

The proxy server will start on **port 3000** (default). You should see:
```
[PROXY] HTTP proxy server listening on http://localhost:3000
[PROXY] Java backend expected at localhost:8888
```

### Step 5: Open the Web Client

Open your web browser and navigate to:
```
http://localhost:3000
```

The chat interface should load and automatically initialize a session.

## 🎯 Usage

### Creating a Group

1. Click the **"+"** button in the sidebar
2. Select **"Nuevo grupo"**
3. Enter a group name
4. The group will be created and appear in the chat list

### Sending Messages

1. Click on a group in the sidebar to select it
2. Type a message in the text input at the bottom
3. Press **Enter** or click the send button
4. The message will be sent to the backend and stored

### Viewing History

1. Click on a group in the sidebar
2. The message history will automatically load and display
3. Messages are sorted by timestamp

## 📡 API Documentation

### Initialize Session

**POST** `/api/init`

Request body:
```json
{
  "sessionId": "optional-session-id"
}
```

Response:
```json
{
  "ok": true,
  "sessionId": "session-id",
  "clientId": "client-id",
  "clientName": "User-xxxx",
  "groups": [],
  "history": []
}
```

### Create Group

**POST** `/api/groups`

Request body:
```json
{
  "sessionId": "session-id",
  "name": "Group Name",
  "members": ["client-id-1", "client-id-2"]
}
```

Response:
```json
{
  "ok": true,
  "group": {
    "id": "group-id",
    "name": "Group Name",
    "members": ["client-id-1", "client-id-2"]
  }
}
```

### Send Message

**POST** `/api/messages`

Request body:
```json
{
  "sessionId": "session-id",
  "to": "group-id",
  "toType": "group",
  "text": "Hello, world!"
}
```

Response:
```json
{
  "ok": true,
  "message": {
    "id": "message-id",
    "from": "client-id",
    "fromName": "User-xxxx",
    "to": "group-id",
    "toType": "group",
    "text": "Hello, world!",
    "ts": 1234567890,
    "kind": "text"
  }
}
```

### Get History

**GET** `/api/history?sessionId=xxx&targetId=xxx&targetType=group`

Response:
```json
{
  "ok": true,
  "messages": [
    {
      "id": "message-id",
      "from": "client-id",
      "fromName": "User-xxxx",
      "to": "group-id",
      "toType": "group",
      "text": "Hello, world!",
      "ts": 1234567890,
      "kind": "text"
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

**Proxy Server (`server.js`):**
- `PORT` - HTTP proxy port (default: 3000)
- `JAVA_BACKEND_HOST` - Java backend host (default: localhost)
- `JAVA_BACKEND_PORT` - Java backend port (default: 8888)

**Java Backend:**
- Port is hardcoded to 8888 in `ChatServer.java`
- Data directory: `data/` (relative to project root)

## 📁 Project Structure

```
chat-project1/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── chat/
│                   └── server/
│                       ├── ChatServer.java
│                       ├── ClientHandler.java
│                       ├── Message.java
│                       └── Group.java
├── public/
│   ├── Index.html
│   ├── App.js
│   ├── Style.css
│   ├── VoiceRecorder.js
│   └── AudioPlayer.js
├── data/
│   ├── messages.json
│   └── groups.json
├── server.js
├── Package.json
├── build.gradle
├── setting.gradle
└── README.md
```

## ⚠️ Known Limitations

1. **No Real-time Updates**: Messages are not pushed to clients in real-time. Clients must refresh or manually load history to see new messages.

2. **Voice Notes**: Voice note functionality is not implemented in the HTTP version. This will be added later using WebSockets.

3. **Direct User Chats**: The current implementation only supports group chats. Direct user-to-user chats are not implemented.

4. **Session Management**: Sessions are stored in memory on the proxy server. Restarting the proxy will reset all sessions.

## 🔮 Future Improvements

- WebSocket support for real-time message delivery
- Voice note support via WebSockets
- User authentication and authorization
- Persistent session storage
- Direct user-to-user chat support
- Message pagination for large histories
- File upload support

## 🧪 Testing

### Manual Testing

1. Start both servers (Java backend and HTTP proxy)
2. Open the web client in a browser
3. Create a group
4. Send some messages
5. Verify messages are stored and can be retrieved
6. Open multiple browser tabs/windows to simulate multiple clients

### Troubleshooting

**Java backend won't start:**
- Check if port 8888 is already in use
- Verify Java JDK is installed and in PATH
- Check Gradle build output for errors

**Proxy can't connect to backend:**
- Ensure Java backend is running on port 8888
- Check `JAVA_BACKEND_HOST` and `JAVA_BACKEND_PORT` environment variables
- Verify firewall settings

**Client can't connect to proxy:**
- Ensure proxy server is running on port 3000
- Check browser console for errors
- Verify CORS settings in `server.js`

## 👥 Team Members

(Add your team member names here)

## 📝 License

This project is part of an academic assignment for "Computación en Internet 1".
