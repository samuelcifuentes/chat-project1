export class AudioPlayer {
  constructor(container) {
    this.container = container;
    this.audio = null;
    this.playButton = null;
    this.progress = null;
  }

  /**
   * Renderiza un reproductor de audio con controles personalizados.
   * @param {string} audioSrc - URL o base64 del audio
   * @returns {HTMLElement} Elemento del reproductor
   */
  render(audioSrc) {
    // Crear contenedor principal
    const player = document.createElement("div");
    player.classList.add("audio-player");

    // Botón de reproducir / pausar
    this.playButton = document.createElement("button");
    this.playButton.classList.add("play-btn");
    this.playButton.innerHTML = "▶️";

    // Barra de progreso
    this.progress = document.createElement("input");
    this.progress.type = "range";
    this.progress.min = 0;
    this.progress.max = 100;
    this.progress.value = 0;
    this.progress.classList.add("progress-bar");

    // Elemento de audio
    this.audio = document.createElement("audio");
    this.audio.src = audioSrc;
    this.audio.preload = "metadata";

    // Evento: reproducir / pausar
    this.playButton.addEventListener("click", () => {
      if (this.audio.paused) {
        this.audio.play();
        this.playButton.innerHTML = "⏸️";
      } else {
        this.audio.pause();
        this.playButton.innerHTML = "▶️";
      }
    });

    // Evento: actualizar progreso
    this.audio.addEventListener("timeupdate", () => {
      const progressPercent = (this.audio.currentTime / this.audio.duration) * 100;
      this.progress.value = progressPercent;
    });

    // Evento: cambiar manualmente progreso
    this.progress.addEventListener("input", () => {
      const newTime = (this.progress.value / 100) * this.audio.duration;
      this.audio.currentTime = newTime;
    });

    // Evento: reiniciar botón al terminar
    this.audio.addEventListener("ended", () => {
      this.playButton.innerHTML = "▶️";
      this.progress.value = 0;
    });

    // Ensamblar reproductor
    player.appendChild(this.playButton);
    player.appendChild(this.progress);
    player.appendChild(this.audio);

    this.container.appendChild(player);

    return player;
  }
}
