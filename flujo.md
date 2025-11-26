## Flujo General del Sistema de Chat (ZeroC Ice)

### 1. Bootstrap del Servidor (`ChatServerApp`)
1. **Arranque**: `ChatServerApp.main()` asegura que exista la propiedad `Ice.Config` apuntando a `config/ice.properties`.
2. **Configuración Ice**: `Application.main()` instancia un `Communicator` que lee los endpoints del adaptador `ChatAdapter`.
3. **Inicialización de dependencias**:
   - `ChatRepository` carga mensajes/grupos desde `data/`.
   - `ChatServiceDelegate` recibe el repositorio y centraliza la lógica de negocio.
   - `RealtimePushManager` registra los callbacks WebSocket.
4. **Adaptador**: `createObjectAdapterWithEndpoints(...)` expone `ChatSessionI` en `ws://localhost:11000`.
5. **Ciclo de vida**: `communicator.waitForShutdown()` mantiene vivo el proceso hasta recibir Ctrl+C.

### 2. Registro de un usuario (`ChatSessionI.registerUser`)
1. Cliente JS llama `ChatSessionPrx.registerUser(nombre)`.
2. Ice entrega la invocación a `ChatSessionI`, que delega en `ChatServiceDelegate.registerUser`.
3. Delegate crea `UserProfile`, lo guarda en memoria y devuelve `UserInfoData`.
4. `ChatSessionI` transforma `UserInfoData` a `Chat.UserInfo` (clase Slice generada) y responde al cliente.

### 3. Creación de grupo (`ChatSessionI.createGroup`)
1. Cliente envía `createGroup(userId, nombre, miembros[])`.
2. `ChatSessionI` convierte el array Slice (`StringSeq`) a `List<String>` y ejecuta `delegate.createGroup`.
3. Delegate genera `Group`, lo persiste en `data/groups.json` y retorna `GroupInfoData`.
4. `RealtimePushManager.emitGroupCreated` emite el evento a todos los suscriptores WebSocket.
5. El método responde con `GroupInfo` al cliente que originó la acción.

### 4. Envío de texto (`ChatSessionI.sendText`)
1. Cliente elige destino (usuario o grupo) y llama `sendText`.
2. Delegate crea un `Message` con tipo `text`, lo guarda (JSON) y devuelve `MessagePayloadData`.
3. `ChatSessionI.broadcastMessage` resuelve los destinatarios:
   - **Directo**: `{sender, receptor}`.
   - **Grupo**: todos los miembros del grupo.
4. `RealtimePushManager.emitMessage` recorre los proxies `RealtimePushPrx` y ejecuta `onIncomingMessage`.
5. Los navegadores reciben el callback vía WebSocket y actualizan la UI en tiempo real.

### 5. Envío de audio (`ChatSessionI.sendAudio`)
1. El frontend usa `MediaRecorder`, envía `Uint8Array` mediante `sendAudio`.
2. Delegate guarda los bytes en `data/audio`, genera un data URI y crea `Message` de tipo `audio`.
3. Persistencia + broadcast repiten el mismo flujo que el texto.

### 6. Historial (`ChatSessionI.getHistory`)
1. Cliente solicita `getHistory(userId, targetId, targetType)`.
2. Delegate filtra mensajes en `ChatRepository.getHistory`.
3. `ChatSessionI` transforma cada `MessagePayloadData` a `Chat.MessagePayload[]`.
4. El frontend renderiza la conversación completa.

### 7. Suscripción y eventos tiempo real
1. El navegador crea un objeto `RealtimePush` (clase generada JS) y se registra con `subscribePush`.
2. `RealtimePushManager.subscribe` guarda el `RealtimePushPrx` asociado al usuario.
3. Cada vez que hay un mensaje, grupo nuevo o llamada:
   - Se construye el DTO (`MessagePayload`, `GroupInfo`, `CallEvent`).
   - Se invoca el método Ice correspondiente (`onIncomingMessage`, `onGroupCreated`, `onCallEvent`).
4. El proxy WebSocket entrega el evento al navegador que originó el `RealtimePush`.

### 8. Llamadas simuladas (`startCall` / `endCall`)
1. Cliente envía `startCall` o `endCall`.
2. Delegate valida el usuario y crea `CallEventData`.
3. `RealtimePushManager.emitCallEvent` publica el cambio al destinatario (usuario o grupo).
4. Frontend muestra notificaciones sobre inicio/fin de llamada.

### 9. Flujo completo del cliente Web
1. **Inicio**: `Ice.initialize` con protocolo `ws` y obtención de `ChatSessionPrx`.
2. **Registro** → **Suscripción push** → **Selección de destinatario**.
3. **Interacciones** (crear grupo, enviar texto/audio, llamadas) siguen las rutas descritas arriba.
4. **Callbacks** recibidos por `RealtimePush` actualizan UI sin refrescar la página.



