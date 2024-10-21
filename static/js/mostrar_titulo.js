const form = document.getElementById('download-form');
const progressBar = document.getElementById('progress-bar');
const downloadLink = document.getElementById('download-link');
const downloadAnchor = document.getElementById('download-anchor');
let checkProgressInterval;
let downloadStarted = false; // Bandera para verificar si la descarga ha comenzado

const baseUrl = '/'; // o la URL base de tu aplicación Flask

const browseButton = document.getElementById('browse-button');
const outputDirectoryInput = document.getElementById('output_directory');

// Evento de selección de carpeta
browseButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('webkitdirectory', ''); // Para permitir la selección de directorios
    input.setAttribute('mozdirectory', ''); // Para Firefox
    input.setAttribute('directory', ''); // Para otros navegadores
    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            // Obtén la ruta de la primera carpeta seleccionada
            const selectedFolder = e.target.files[0].webkitRelativePath.split('/')[0]; // Solo la carpeta principal
            outputDirectoryInput.value = selectedFolder; // Establece la ruta de salida seleccionada
        }
    };
    input.click();
});


// Expresión regular actualizada para URL de Spotify
const spotifyUrlRegex = /^(https:\/\/(open|www)\.spotify\.com\/(intl-\w+\/)?(track|album|playlist)\/[a-zA-Z0-9]{22})(\?.*)?$/;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const urlInput = document.getElementById('url');
  const url = urlInput.value.trim();

  // Verifica si la URL está vacía o no es una URL de Spotify válida
  if (!url || !spotifyUrlRegex.test(url)) {
    console.log(`URL ingresada: ${url}`);
    if (!downloadStarted) {
      Swal.fire({
        title: 'Error!',
        text: 'Por favor, ingresa un enlace válido de Spotify.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      }).then(() => {
        // Limpiar el campo de entrada URL
        urlInput.value = '';
      });
    }
    return;
  }

  try {
    const response = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url: url })
    });

    if (response.ok) {
      downloadStarted = true; // Indicar que la descarga ha comenzado
      Swal.fire({
        title: 'Proceso iniciado',
        text: 'Descarga iniciada, por favor espera...',
        icon: 'info',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      });

      checkProgressInterval = setInterval(checkProgress, 1000);
    } else {
      const data = await response.json();
      Swal.fire({
        title: 'Error!',
        text: `Error: ${data.error}`,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      });
    }
  } catch (error) {
    clearInterval(checkProgressInterval);
    Swal.fire({
      title: 'Error!',
      text: `Error al iniciar la descarga: ${error.message}`,
      icon: 'error',
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: 'custom-confirm-button'
      }
    }).then(() => {
      urlInput.value = '';  // Limpiar el campo de entrada URL en caso de error
    });
  }
});

async function checkProgress() {
  try {
    const response = await fetch('/progress');
    const data = await response.json();

    if (data.error) {
      clearInterval(checkProgressInterval);
      Swal.fire({
        title: 'Error!',
        text: `Error: ${data.error}`,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      }).then(() => {
        resetUI();
      });
      return;
    }

    // Actualizar la barra de progreso
    if (progressBar) {
      progressBar.style.width = `${data.progress}%`;
      progressBar.textContent = `${data.progress}%`;
    }

    // Estimación del tiempo de descarga
    const estimatedTimeElement = document.getElementById('estimated-time');
    if (estimatedTimeElement) {
      const estimatedTime = calculateEstimatedTime(data.progress);
      estimatedTimeElement.textContent = `Tiempo estimado: ${estimatedTime}`;
    }

    if (data.progress === 100) {
      clearInterval(checkProgressInterval);
      downloadAnchor.href = baseUrl + data.fileUrl;
      downloadAnchor.download = generateFileName(url); // Generar un nombre de archivo único
      downloadAnchor.style.display = 'block';
      Swal.fire({
        title: '¡Listo!',
        text: 'Descarga completada con éxito!',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        customClass: {
          confirmButton: 'custom-confirm-button'
        }
      }).then(() => {
        resetUI();
        urlInput.value = '';
        downloadStarted = false; // Reiniciar bandera al finalizar la descarga
      });
    }
  } catch (error) {
    clearInterval(checkProgressInterval);
    Swal.fire({
      title: 'Error!',
      text: `Error al verificar el progreso: ${error.message}`,
      icon: 'error',
      confirmButtonText: 'Aceptar',
      customClass: {
        confirmButton: 'custom-confirm-button'
      }
    }).then(() => {
      resetUI();
      downloadStarted = false; // Reiniciar bandera en caso de error
    });
  }
}

function resetUI() {
  if (progressBar) {
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
  }

  const estimatedTimeElement = document.getElementById('estimated-time');
  if (estimatedTimeElement) {
    estimatedTimeElement.textContent = '';
  }

  if (downloadAnchor) {
    downloadAnchor.style.display = 'none';
  }
}

function calculateEstimatedTime(progress) {
  const totalTime = 100; // Tiempo total de descarga en segundos
  const estimatedTime = (totalTime / 100) * (100 - progress);
  return `${estimatedTime.toFixed(2)} segundos`;
}

function generateFileName(url) {
  const title = "musica";  // Aquí podrías extraer el título real
  return `${title}.mp3`;
}

