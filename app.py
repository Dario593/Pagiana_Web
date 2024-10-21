import os
import subprocess
from threading import Thread
import time
from flask import Flask, render_template, request, jsonify, send_file, abort

app = Flask(__name__)

download_status = {
    'progress': 0,
    'completed': False,
    'error': None,
    'fileUrl': None,
    'debug': None
}

def download_song(url, output_directory):
    global download_status
    download_status.update({
        'progress': 0,
        'completed': False,
        'error': None,
        'debug': "Iniciando proceso de descarga."
    })

    try:
        if not os.path.exists(output_directory):
            os.makedirs(output_directory)
            download_status['debug'] += " Directorio creado."

        # Define output file path with a temporary name
        output_file = os.path.join(output_directory, 'temp.mp3')
        command_download = ['spotdl', '--output', output_file, url]
        process_download = subprocess.Popen(
            command_download,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding='utf-8',
            errors='replace',  # Agregado para manejar errores de decodificación
            text=True
        )

        while process_download.poll() is None:
            # Simular progreso
            time.sleep(2)
            download_status['progress'] = min(download_status['progress'] + 20, 100)
            # Aquí podrías actualizar el progreso real si spotdl proporciona información

        output_download, error_download = process_download.communicate()
        if process_download.returncode == 0:
            # Asignar un título o nombre del archivo según los metadatos
            title = "musica"  # Cambia esto si obtienes el título real
            filename = f"{title}.mp3"
            final_output_file = os.path.join(output_directory, filename)
            os.rename(output_file, final_output_file)

            download_status.update({
                'completed': True,
                'fileUrl': f'/download/{filename}',
                'debug': download_status['debug'] + " Descarga completada."
            })
        else:
            raise Exception(f"Error durante la descarga: {error_download}")

    except Exception as e:
        download_status.update({
            'error': str(e),
            'debug': download_status['debug'] + f" Excepción: {str(e)}"
        })

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/download', methods=['POST'])
def download():
    url = request.form.get('url')
    output_directory = "downloads"

    if not url:
        return jsonify({'error': 'URL de Spotify no proporcionada'}), 400

    thread = Thread(target=download_song, args=(url, output_directory))
    thread.start()

    return jsonify({'success': True}), 200

@app.route('/progress', methods=['GET'])
def progress():
    return jsonify(download_status)

@app.route('/download/<filename>')
def serve_file(filename):
    file_path = os.path.join('downloads', filename)

    if not os.path.exists(file_path):
        return abort(404, description="Archivo no encontrado")

    response = send_file(file_path, as_attachment=True, download_name=filename, mimetype='audio/mpeg')
    response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

if __name__ == '__main__':
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    app.run(debug=True)
