# Chat RPC ZeroC Ice

**Integrantes:** Juan Sebastian Romero Torres · Juan Camilo Criollo · Samuel David Cifuentes

Sistema de chat migrado completamente a RPC utilizando ZeroC Ice, con servicios Java expuestos vía WebSockets de Ice y un cliente web empaquetado con Webpack que consume las *proxies* generadas a partir de la definición Slice.

---

## 1. Árbol del proyecto

```
chat-project1
├── config/ice.properties              # Configuración del adaptador Ice WebSocket
├── data/                              # Persistencia JSON + audios
├── src/main/java/
│   ├── com/chat/core/…                # Lógica de negocio y patrón delegado
│   ├── com/chat/domain/…              # Entidades de dominio
│   └── com/chat/rpc/…                 # Servants, DTOs y servidor Ice
├── src/main/slice/chat.ice            # Definición RPC
├── client/                            # Cliente HTML/CSS/JS + Webpack
│   ├── index.html
│   ├── package.json
│   ├── src/main.js / style.css
│   └── public/ice/Chat.js (generado con slice2js)
├── build.gradle / settings.gradle
└── README.md
```

---

## 2. Instrucciones de ejecución

### Requisitos previos
- JDK 17+
- Node.js 18+
- ZeroC Ice 3.7+ instalado (asegura que `slice2java` y `slice2js` estén en `PATH`)

### 2.1 Compilar Slice para Java
```powershell
.\gradlew.bat compileSlice
```
Genera las *proxies* Java en `build/generated-src/ice`.

### 2.2 Compilar y ejecutar el servidor Ice
```powershell
.\gradlew.bat build
.\gradlew.bat runServer
```
El adaptador `ChatAdapter` queda escuchando WebSockets en `ws://localhost:10000` usando `config/ice.properties`.

### 2.3 Preparar el cliente Web
```powershell
cd client
slice2js --output-dir public/ice ../src/main/slice/chat.ice   # genera Chat.js para el navegador
npm install
npm run dev            # servidor de desarrollo con recarga
# o npm run build para generar client/dist listo para producción
```
El `index.html` carga `Ice.min.js` desde CDN y el archivo `ice/Chat.js` generado. Webpack empaqueta `src/main.js` + `style.css` y copia los artefactos estáticos.

### 2.4 Acceder al chat
1. Mantén el servidor Java corriendo.
2. Abre `http://localhost:5173` (o el puerto indicado por Webpack).
3. Registra un usuario, crea grupos, envía textos o notas de voz en tiempo real.

---

## 3. Flujo de comunicación RPC + WebSockets

- **Cliente Web (JS)** inicializa `Ice.initialize` con protocolo `ws` y obtiene un `Chat.ChatSessionPrx` mediante `stringToProxy("ChatSession:ws -h localhost -p 10000")`.
- **ZeroC Ice** genera las *proxies* (Java y JS) a partir de `chat.ice`, garantizando tipado fuerte para `UserInfo`, `MessagePayload`, `RealtimePush`, etc.
- **Patrón delegado (20%)**:  
  `ChatSessionI` (servant) atiende las invocaciones remotas, pero delega toda la lógica de negocio en `ChatServiceDelegate`, el cual usa `ChatRepository` para persistencia y `RealtimePushManager` para distribuir los eventos.
- **Tiempo real con WebSockets de Ice**:  
  - Cada cliente registra un callback `RealtimePush` (implementado en el navegador) y se suscribe vía `subscribePush`.  
  - El servidor realiza *callbacks* sobre el WebSocket cuando hay mensajes, creación de grupos o eventos de llamada.  
  - Los audios se envían como `Ice::ByteSeq` y se convierten a data URI base64 para reproducción inmediata.

---

## 4. Funcionalidades expuestas por RPC
1. **Crear grupos** (`createGroup`) → Devuelve `GroupInfo` y notifica a todos los clientes.
2. **Enviar texto** (`sendText`) → Persiste y publica el mensaje en tiempo real a usuario/grupo objetivo.
3. **Historial** (`getHistory`) → Recupera mensajes de usuario o grupo, incluyendo notas de voz.
4. **Voz y llamadas**  
   - `sendAudio` recibe el binario desde el navegador (MediaRecorder) usando WebSockets Ice.  
   - `startCall` / `endCall` generan eventos `CallEvent` para simular el control de llamadas VoIP.

---

## 5. Detalles de implementación

- **Persistencia**: archivos JSON en `data/messages.json` y `data/groups.json`. Las notas de voz se guardan en disco (`data/audio`) y se serializan como `data URI` para consumo web inmediato.
- **Seguridad de tipos**: todos los DTOs (`UserInfoData`, `MessagePayloadData`, etc.) encapsulan la lógica de mapeo entre dominio y Slice.
- **Front-end creativo**: interfaz minimalista con gradientes, tarjetas y notificaciones, todo escrito en HTML/CSS vanilla y empaquetado via Webpack + loaders de CSS.
- **Notas de voz**: `MediaRecorder` captura audio, lo transforma a `Uint8Array` y lo envía mediante `sendAudio`. Los destinatarios reproducen el audio desde un `<audio>` con el data URI recibido.
- **Patrón delegado**: Servants limpios, sin lógica de negocio; únicamente traducen llamadas RPC hacia `ChatServiceDelegate` y `RealtimePushManager`.

---

## 6. Referencias rápidas

| Acción | Comando |
|--------|---------|
| Compilar backend | `.\gradlew.bat build` |
| Ejecutar servidor Ice | `.\gradlew.bat runServer` |
| Generar proxies JS | `cd client && slice2js --output-dir public/ice ../src/main/slice/chat.ice` |
| Servir cliente | `cd client && npm run dev` |
| Compilar bundle front | `cd client && npm run build` |

---

¡Listo! Con estos pasos tendrás un sistema de chat RPC con eventos en tiempo real, soporte de texto, voz y llamadas, tal como lo exige la rúbrica. Disfruta explorando la arquitectura basada en ZeroC Ice. 🎧💬
