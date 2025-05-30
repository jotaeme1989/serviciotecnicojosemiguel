// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const form = document.getElementById('ingresoEquipoForm');
    const pdfContent = document.getElementById('pdf-content'); // Contenido para el PDF
    const photoInputs = document.querySelectorAll('input[type="file"][name="fotos_equipo[]"]');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const confirmarEntregaButton = document.getElementById('confirmarEntrega');
    const entregaConfirmadaInput = document.getElementById('entregaConfirmada');
    const submitButton = document.getElementById('submitButton');

    // --- Configuración del Backend ---
    // IMPORTANTE: Asegúrate de que esta URL coincida con la dirección donde tu servidor Node.js está corriendo.
    // Si lo estás probando localmente, será http://localhost:3000.
    // Cuando lo despliegues a un servidor real, cambia esta URL.
    const BACKEND_URL = 'http://localhost:3000/api/ingreso'; // ¡CUIDADO! Cambia esto para producción si tu backend no está local.

    // --- Funcionalidad de Previsualización de Fotos ---
    photoInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Eliminar previsualizaciones anteriores para este input
            const existingPreview = photoPreviewContainer.querySelector(`[data-for="${this.id}"]`);
            if (existingPreview) {
                existingPreview.remove();
            }

            if (this.files && this.files[0]) {
                const reader = new FileReader();
                const currentInputId = this.id; // Captura el ID actual para el contexto del reader

                reader.onload = function(e) {
                    // Crea un contenedor para la imagen y su etiqueta
                    const previewWrapper = document.createElement('div');
                    previewWrapper.classList.add('photo-preview-item');
                    previewWrapper.setAttribute('data-for', currentInputId); // Asocia la previsualización al input

                    // Crea la imagen
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.alt = `Previsualización de ${currentInputId}`;
                    img.style.maxWidth = '100px'; // Ajusta el tamaño de la previsualización
                    img.style.maxHeight = '100px';
                    img.style.objectFit = 'cover';
                    img.style.marginRight = '10px';

                    // Crea la etiqueta (puedes ajustar el texto si es necesario)
                    const labelText = document.querySelector(`label[for="${currentInputId}"]`).textContent;
                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = `${labelText}:`;

                    // Añade al contenedor
                    previewWrapper.appendChild(labelSpan);
                    previewWrapper.appendChild(img);
                    photoPreviewContainer.appendChild(previewWrapper);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });

    // --- Funcionalidad del Botón "Confirmo Entrega del Equipo" ---
    confirmarEntregaButton.addEventListener('click', () => {
        const isConfirmed = confirm('¿Está seguro de confirmar la entrega del equipo? Esta acción no se puede deshacer una vez enviado el formulario.');
        if (isConfirmed) {
            entregaConfirmadaInput.value = 'true';
            confirmarEntregaButton.textContent = 'Entrega Confirmada ✅';
            confirmarEntregaButton.disabled = true;
            submitButton.disabled = false; // Habilitar el botón de envío
            alert('Entrega confirmada. Ahora puede generar el comprobante PDF.');
        } else {
            entregaConfirmadaInput.value = 'false';
            submitButton.disabled = true; // Mantener deshabilitado si no se confirma
        }
    });

    // Deshabilitar botón de envío al cargar la página
    submitButton.disabled = true;

    // --- Manejo del Envío del Formulario (Ahora envía al Backend) ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evitar el envío tradicional del formulario

        // Asegurarse de que la confirmación de entrega se haya realizado
        if (entregaConfirmadaInput.value !== 'true') {
            alert('Por favor, confirme la entrega del equipo antes de generar el comprobante.');
            return;
        }

        // Deshabilitar el botón para evitar envíos duplicados
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        // Crear un objeto FormData para enviar todos los datos del formulario, incluyendo los archivos
        const formData = new FormData(form);

        // Debug: Mostrar FormData en consola (solo para desarrollo)
        // for (let pair of formData.entries()) {
        //     console.log(pair[0] + ': ' + pair[1]);
        // }

        try {
            // Enviar los datos del formulario al backend
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                body: formData // FormData se envía directamente, sin Content-Type manual
            });

            const result = await response.json();

            if (response.ok) {
                // Si la respuesta es exitosa (código 2xx)
                alert(`¡Éxito! El equipo ha sido ingresado. Número de seguimiento: ${result.numero_seguimiento}`);
                
                // --- Generar PDF con el Número de Seguimiento (¡Aquí es donde se integra!) ---
                const numeroSeguimientoDisplay = document.createElement('p');
                numeroSeguimientoDisplay.innerHTML = `<strong>Número de Seguimiento: ${result.numero_seguimiento}</strong>`;
                numeroSeguimientoDisplay.style.fontSize = '1.2em';
                numeroSeguimientoDisplay.style.textAlign = 'center';
                numeroSeguimientoDisplay.style.marginTop = '20px';
                numeroSeguimientoDisplay.style.marginBottom = '20px';
                numeroSeguimientoDisplay.style.padding = '10px';
                numeroSeguimientoDisplay.style.border = '2px solid #4CAF50';
                numeroSeguimientoDisplay.style.borderRadius = '8px';
                numeroSeguimientoDisplay.style.backgroundColor = '#e6ffe6';

                // Insertar el número de seguimiento al principio del contenido del PDF
                pdfContent.insertBefore(numeroSeguimientoDisplay, pdfContent.firstChild);
                
                // Ahora, generar el PDF como antes, pero con el número de seguimiento incluido
                await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña espera para asegurar que el DOM se actualice

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('p', 'mm', 'a4'); // 'p' para portrait, 'mm' para milímetros, 'a4' tamaño de página

                html2canvas(pdfContent, {
                    scale: 1.0, // Reducir escala para mejor rendimiento y menor uso de memoria en móviles
                    useCORS: true,
                    allowTaint: true,
                    scrollY: -window.scrollY, // Corregir el scroll para html2canvas
                    windowWidth: document.documentElement.offsetWidth, // Capturar el ancho total
                    windowHeight: document.documentElement.offsetHeight, // Capturar el alto total
                    logging: true // Habilitar logging para depuración
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = 210; // Ancho A4 en mm
                    const pageHeight = 297; // Alto A4 en mm
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    let heightLeft = imgHeight;
                    let position = 0;

                    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft >= 0) {
                        position = heightLeft - imgHeight;
                        doc.addPage();
                        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }

                    // Obtener la fecha actual para el nombre del archivo
                    const today = new Date();
                    const dd = String(today.getDate()).padStart(2, '0');
                    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0
                    const yyyy = today.getFullYear();
                    const fechaFormato = `${dd}-${mm}-${yyyy}`;

                    // Nombre del archivo PDF
                    const filename = `Comprobante_Ingreso_${result.numero_seguimiento}_${fechaFormato}.pdf`;
                    doc.save(filename);

                    // Eliminar el número de seguimiento temporal del DOM después de generar el PDF
                    if (numeroSeguimientoDisplay.parentNode) {
                        numeroSeguimientoDisplay.parentNode.removeChild(numeroSeguimientoDisplay);
                    }

                    // Resetear el formulario y habilitar el botón
                    form.reset();
                    photoPreviewContainer.innerHTML = ''; // Limpiar previsualizaciones
                    entregaConfirmadaInput.value = 'false';
                    confirmarEntregaButton.textContent = 'Confirmo Entrega del Equipo';
                    confirmarEntregaButton.disabled = false;
                    submitButton.textContent = 'Generar Comprobante PDF';
                    submitButton.disabled = true; // Se deshabilita hasta nueva confirmación
                });

            } else {
                // Si la respuesta no es exitosa (código 4xx o 5xx)
                alert(`Error al guardar los datos: ${result.message || 'Error desconocido'}`);
                console.error('Error del servidor:', result.error);
                submitButton.textContent = 'Generar Comprobante PDF';
                submitButton.disabled = false; // Re-habilitar el botón en caso de error
            }
        } catch (error) {
            console.error('Error de red o en la petición:', error);
            alert('Error de conexión con el servidor. Por favor, intente de nuevo.');
            submitButton.textContent = 'Generar Comprobante PDF';
            submitButton.disabled = false; // Re-habilitar el botón en caso de error
        }
    });
});
