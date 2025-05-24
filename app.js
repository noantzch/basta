// Espera a que todo el contenido del DOM esté cargado antes de ejecutar el script
document.addEventListener('DOMContentLoaded', () => {
    console.log('El script app.js se ha cargado correctamente.');

    // --- Elementos del DOM ---
    const circleContainer = document.querySelector('.circle-container');
    const startButton = document.getElementById('startButton');
    const timerDisplay = document.getElementById('timerDisplay');
    const minTimeInput = document.getElementById('minTime');
    const maxTimeInput = document.getElementById('maxTime');
    const temporizadorAudio = document.getElementById('temporizadorAudio');
    const alarmaAudio = document.getElementById('alarmaAudio');

    // --- Variables de Estado del Juego ---
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let gameRunning = false;
    let timerInterval = null;
    let timeLeft = 0; // Tiempo restante en segundos
    let letterButtons = []; // Almacenará las referencias a los botones de las letras

    // --- Constantes para Validación de Tiempo ---
    const MIN_ALLOWED_SECONDS = 30; // 00:30
    const MAX_ALLOWED_SECONDS = 240; // 04:00 (4 minutos * 60 segundos/minuto)

    // --- Funciones de Utilidad ---

    /**
     * Convierte un string de tiempo "MM:SS" a segundos.
     * @param {string} timeString - El string de tiempo (ej. "01:30").
     * @returns {number} El tiempo en segundos.
     */
    function timeToSeconds(timeString) {
        const parts = timeString.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0], 10);
            const seconds = parseInt(parts[1], 10);
            if (!isNaN(minutes) && !isNaN(seconds)) {
                return (minutes * 60) + seconds;
            }
        }
        return NaN; // Retorna NaN si el formato es inválido
    }

    /**
     * Convierte segundos a un string de tiempo "MM:SS".
     * @param {number} totalSeconds - El tiempo total en segundos.
     * @returns {string} El string de tiempo formateado (ej. "01:30").
     */
    function secondsToTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Valida el formato y el rango de un input de tiempo.
     * @param {HTMLInputElement} inputElement - El elemento input a validar.
     * @returns {boolean} True si el valor es válido, false en caso contrario.
     */
    function validateTimeInput(inputElement) {
        const value = inputElement.value;
        const seconds = timeToSeconds(value);

        // Verifica el formato MM:SS y que los segundos sean válidos
        if (isNaN(seconds) || value.length !== 5 || value.indexOf(':') !== 2) {
            inputElement.classList.add('border-red-500', 'ring-red-500');
            return false;
        }

        // Verifica el rango permitido
        if (seconds < MIN_ALLOWED_SECONDS || seconds > MAX_ALLOWED_SECONDS) {
            inputElement.classList.add('border-red-500', 'ring-red-500');
            return false;
        }

        inputElement.classList.remove('border-red-500', 'ring-red-500');
        return true;
    }

    /**
     * Genera un tiempo aleatorio entre el mínimo y el máximo configurado.
     * @param {number} minSec - Tiempo mínimo en segundos.
     * @param {number} maxSec - Tiempo máximo en segundos.
     * @returns {number} Tiempo aleatorio en segundos.
     */
    function getRandomTime(minSec, maxSec) {
        return Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    }

    /**
     * Actualiza la visualización del temporizador.
     * @param {number} seconds - Segundos a mostrar.
     */
    function updateTimerDisplay(seconds) {
        timerDisplay.textContent = secondsToTime(seconds);
    }

    /**
     * Resetea el color de todos los botones de letras a blanco y los habilita.
     */
    function resetLetterColors() {
        letterButtons.forEach(button => {
            button.classList.remove('active');
            button.disabled = false; // Habilita los botones
        });
    }

    /**
     * Deshabilita todos los botones de letras.
     */
    function disableLetterButtons() {
        letterButtons.forEach(button => {
            button.disabled = true;
        });
    }

    // --- Funciones del Juego ---

    /**
     * Inicializa el juego: crea los botones de letras y configura los listeners.
     */
    function initializeGame() {
        // Genera los 26 botones de letras
        const numButtons = alphabet.length;
        const radius = circleContainer.offsetWidth / 2 + 20; // Radio del círculo, ajustado por el tamaño del botón

        for (let i = 0; i < numButtons; i++) {
            const angle = (i / numButtons) * 2 * Math.PI; // Ángulo en radianes
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);

            const button = document.createElement('button');
            button.classList.add('letter-button');
            button.id = `letter-${alphabet[i]}`;
            button.textContent = alphabet[i];
            button.dataset.letter = alphabet[i]; // Almacena la letra en un data attribute
            button.style.left = `calc(50% + ${x}px - 25px)`; // Ajuste para centrar el botón
            button.style.top = `calc(50% + ${y}px - 25px)`; // Ajuste para centrar el botón
            button.disabled = true; // Inicialmente deshabilitados

            button.addEventListener('click', handleLetterClick);
            circleContainer.appendChild(button);
            letterButtons.push(button);
        }

        // Event listeners para los inputs de tiempo (para validación en tiempo real)
        minTimeInput.addEventListener('input', () => validateTimeInput(minTimeInput));
        maxTimeInput.addEventListener('input', () => validateTimeInput(maxTimeInput));

        // Event listener para el botón INICIAR/PARAR
        startButton.addEventListener('click', () => {
            if (gameRunning) {
                stopGame(false); // Detener sin alarma
            } else {
                startGame();
            }
        });

        // Asegúrate de que los audios se carguen para evitar retrasos la primera vez
        temporizadorAudio.load();
        alarmaAudio.load();
    }

    /**
     * Inicia el juego.
     */
    function startGame() {
        // 1. Validar tiempos
        const isMinValid = validateTimeInput(minTimeInput);
        const isMaxValid = validateTimeInput(maxTimeInput);

        if (!isMinValid || !isMaxValid) {
            // Usar un modal o mensaje en lugar de alert
            alert('Por favor, ingresa tiempos válidos en formato MM:SS entre 00:30 y 04:00.');
            return;
        }

        const minSeconds = timeToSeconds(minTimeInput.value);
        const maxSeconds = timeToSeconds(maxTimeInput.value);

        if (minSeconds > maxSeconds) {
            alert('El tiempo mínimo no puede ser mayor que el tiempo máximo.');
            return;
        }

        // 2. Elegir un tiempo al azar y comenzar temporizador
        timeLeft = getRandomTime(minSeconds, maxSeconds);
        updateTimerDisplay(timeLeft);

        temporizadorAudio.currentTime = 0; // Reinicia el audio
        temporizadorAudio.play(); // Inicia el audio del temporizador

        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);

            if (timeLeft <= 0) {
                stopGame(true); // Detener con alarma
            }
        }, 1000); // Cada segundo

        // 3. El botón INICIAR cambia a "PARAR"
        startButton.textContent = 'PARAR';
        startButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        startButton.classList.add('bg-red-600', 'hover:bg-red-700');

        // 4. Habilitar botones de letras y resetear colores
        resetLetterColors();
        gameRunning = true;
    }

    /**
     * Detiene el juego.
     * @param {boolean} playAlarm - Si es true, reproduce el sonido de alarma y muestra el alert.
     */
    function stopGame(playAlarm) {
        clearInterval(timerInterval); // Detiene el temporizador
        temporizadorAudio.pause(); // Pausa el audio del temporizador
        temporizadorAudio.currentTime = 0; // Reinicia el audio

        if (playAlarm) {
    alarmaAudio.currentTime = 0; // Reinicia el audio
    alarmaAudio.play(); // Reproduce el sonido de alarma
    setTimeout(() => {
        // Reemplazar alert con SweetAlert2
        Swal.fire({
            title: '¡JUEGO TERMINADO!',
            text: 'El tiempo ha terminado.',
            icon: 'info',
            confirmButtonText: 'Aceptar'
        }).then(() => {
            resetLetterColors(); // Vuelve a blanco los botones después del alert
        });
    }, 50);
}
 else {
            // Si se detiene manualmente, solo resetea colores
            resetLetterColors();
        }

        // El botón PARAR cambia a "INICIAR"
        startButton.textContent = 'INICIAR';
        startButton.classList.remove('bg-red-600', 'hover:bg-red-700');
        startButton.classList.add('bg-blue-600', 'hover:bg-blue-700');

        disableLetterButtons(); // Deshabilita los botones de letras al detener el juego
        gameRunning = false;
        updateTimerDisplay(0); // Resetea el display del temporizador a 00:00
    }

    /**
     * Maneja el clic en un botón de letra.
     * @param {Event} event - El evento de clic.
     */
    function handleLetterClick(event) {
        if (!gameRunning) return; // Solo permite clics si el juego está corriendo

        const button = event.target;
        if (!button.classList.contains('active')) {
            button.classList.add('active'); // Se hace VERDE
            button.disabled = true; // Deshabilita el botón una vez clickeado
            console.log(`Letra clickeada: ${button.dataset.letter}`);
            // Aquí podrías añadir lógica para verificar respuestas, etc.
        }
    }

    // --- Inicialización al cargar la página ---
    initializeGame();
    disableLetterButtons(); // Asegúrate de que los botones estén deshabilitados al inicio
});
