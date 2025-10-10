# chat-project
La página es una aplicación de chat interactiva que permite la comunicación entre un usuario y un bot de manera sencilla y fluida. Su objetivo es simular una conversación dinámica, donde el usuario puede enviar tanto mensajes de texto como notas de voz, y recibir respuestas automáticas del bot dependiendo del tipo de mensaje y su contenido.


### Funcionamiento general

Para utilizar la aplicación correctamente, se deben seguir los siguientes pasos:

1. **Abrir una terminal** en la carpeta donde se encuentra el proyecto.
2. Ejecutar el comando `node server.js` para iniciar el servidor local.
3. Una vez iniciado el servidor, **abrir un navegador web** y acceder a la dirección `http://localhost:3000`.
4. Se cargará la interfaz principal del chat, que incluye un área de conversación, un campo para escribir mensajes y un botón de micrófono para grabar notas de voz.

En la interfaz, el usuario puede **escribir un mensaje en el cuadro de texto y presionar la tecla Enter para enviarlo**.
Para enviar una **nota de voz**, debe mantener presionado el botón del micrófono mientras habla; al soltarlo, la grabación se enviará automáticamente y aparecerá en el chat.

El bot analiza cada entrada y genera respuestas automáticas.
Cuando el mensaje proviene del texto, el bot responde con frases dinámicas y naturales que varían dependiendo del contenido del mensaje.
Si se envía una nota de voz, el bot responde con expresiones simples como “Interesante nota de voz” o “Hmm, eso suena bien”.


### Ejemplos de mensajes que el bot puede responder

El bot tiene diferentes tipos de respuestas según lo que el usuario escriba. Algunos ejemplos de interacciones posibles son:

* **Mensajes de saludo o cortesía:**

  * Usuario: “Hola” → Bot: “Hola, ¿cómo estás hoy?”
  * Usuario: “¿Cómo estás?” → Bot: “Estoy muy bien, gracias por preguntar.”
  * Usuario: “Buenas tardes” → Bot: “Buenas tardes, ¿cómo te ha ido?”

* **Mensajes de conversación general:**

  * Usuario: “¿Qué haces?” → Bot: “Aquí, charlando contigo, ¿y tú?”
  * Usuario: “¿Quieres hacer algo hoy?” → Bot: “Podemos seguir hablando, me gusta conversar contigo.”
  * Usuario: “Estoy aburrido” → Bot: “Tal vez una buena charla te anime un poco.”

* **Mensajes de opinión o comentario:**

  * Usuario: “Hoy fue un buen día” → Bot: “Me alegra escuchar eso.”
  * Usuario: “Estoy cansado” → Bot: “Deberías descansar un poco, te hará bien.”
  * Usuario: “Tengo hambre” → Bot: “Podrías pedir algo rico para comer.”

* **Notas de voz:**

  * Usuario graba una nota de voz → Bot: “Hmm, interesante nota de voz.”
  * Usuario graba una nota de voz → Bot: “Eso suena bien, cuéntame más.”


### Características principales

* Permite **enviar mensajes de texto presionando la tecla Enter**, con respuestas automáticas del bot.
* Soporta **grabación y envío de notas de voz** mediante el botón de micrófono.
* Las **respuestas del bot son variadas**, lo que genera una conversación más natural.
* Muestra **el historial completo del chat**, diferenciando claramente los mensajes del usuario y los del bot.

