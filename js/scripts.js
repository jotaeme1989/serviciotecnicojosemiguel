const confirmarEntregaBtn = document.getElementById('confirmarEntrega');
        const entregaConfirmadaInput = document.getElementById('entregaConfirmada');
        const ingresoEquipoForm = document.getElementById('ingresoEquipoForm');
        const submitButton = document.getElementById('submitButton');
        const photoPreviewContainer = document.getElementById('photo-preview-container');
        const photoInputs = document.querySelectorAll('input[type="file"][name="fotos_equipo[]"]');
        const pdfContent = document.getElementById('pdf-content'); // El contenedor principal para el PDF

        confirmarEntregaBtn.addEventListener('click', () => {
            if (confirm('¿Confirma que ha revisado el equipo con el cliente y que la información es correcta?')) {
                entregaConfirmadaInput.value = 'true';
                confirmarEntregaBtn.textContent = 'Entrega Confirmada ✔️';
                confirmarEntregaBtn.style.backgroundColor = '#28a745'; // Color verde
                confirmarEntregaBtn.disabled = true; // Deshabilita el botón después de confirmar
            }
        });

        // Este array guardará las promesas de carga de cada imagen
        const loadedImagePromises = [];

        // Event listener para cada input de foto para previsualizar la imagen
        photoInputs.forEach(input => {
            input.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const imgId = input.id;
                        let existingPreview = document.getElementById(`preview-${imgId}`);

                        if (existingPreview) {
                            existingPreview.querySelector('img').src = e.target.result;
                            // Si la imagen ya existía, volvemos a asegurar su carga
                            const imgElem = existingPreview.querySelector('img');
                            const promise = new Promise(resolve => {
                                imgElem.onload = resolve;
                                imgElem.onerror = resolve;
                            });
                            // Reemplazamos la promesa antigua si el input fue actualizado
                            const index = loadedImagePromises.findIndex(p => p.id === imgId);
                            if (index !== -1) {
                                loadedImagePromises[index] = { id: imgId, promise: promise };
                            } else {
                                loadedImagePromises.push({ id: imgId, promise: promise });
                            }

                        } else {
                            const previewItem = document.createElement('div');
                            previewItem.classList.add('photo-preview-item');
                            previewItem.id = `preview-${imgId}`;

                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.alt = `Foto de ${input.labels[0].textContent}`;
                            
                            // *** Importante: Añadir promesa de carga al array ***
                            const promise = new Promise(resolve => {
                                img.onload = resolve;
                                img.onerror = resolve; // Para que no se quede colgado si una imagen falla
                            });
                            loadedImagePromises.push({ id: imgId, promise: promise });

                            const caption = document.createElement('span');
                            caption.textContent = input.labels[0].textContent;

                            const removeBtn = document.createElement('button');
                            removeBtn.classList.add('remove-photo-btn');
                            removeBtn.textContent = 'X';
                            removeBtn.onclick = () => {
                                previewItem.remove();
                                input.value = ''; // Limpiar el input file
                                // Eliminar la promesa correspondiente al input removido
                                const index = loadedImagePromises.findIndex(p => p.id === imgId);
                                if (index !== -1) {
                                    loadedImagePromises.splice(index, 1);
                                }
                            };

                            previewItem.appendChild(img);
                            previewItem.appendChild(caption);
                            previewItem.appendChild(removeBtn);
                            photoPreviewContainer.appendChild(previewItem);
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    const existingPreview = document.getElementById(`preview-${input.id}`);
                    if (existingPreview) {
                        existingPreview.remove();
                    }
                    // Eliminar la promesa si el input se vacía
                    const index = loadedImagePromises.findIndex(p => p.id === input.id);
                    if (index !== -1) {
                        loadedImagePromises.splice(index, 1);
                    }
                }
            });
        });


        ingresoEquipoForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional

            if (entregaConfirmadaInput.value !== 'true') {
                alert('Por favor, presione el botón "Confirmo Entrega del Equipo" para continuar.');
                return; // Detener el envío si no se ha confirmado
            }
            
            // Validar campos obligatorios
            const requiredFields = document.querySelectorAll('#ingresoEquipoForm [required]');
            for (const field of requiredFields) {
                if (field.type === 'file' && field.hasAttribute('required')) {
                    if (field.files.length === 0 && !document.getElementById(`preview-${field.id}`)) {
                        alert(`Por favor, cargue la foto: ${field.labels[0].textContent}`);
                        field.focus();
                        return;
                    }
                } else if (!field.value.trim() && field.type !== 'checkbox') {
                    alert(`Por favor, complete el campo: ${field.previousElementSibling ? field.previousElementSibling.textContent.replace(':', '') : field.placeholder || field.id}`);
                    field.focus();
                    return;
                } else if (field.type === 'checkbox' && !field.checked) {
                    alert('Debe aceptar los Términos y Condiciones.');
                    field.focus();
                    return;
                }
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Generando PDF... Esto puede tomar un momento...';

            const { jsPDF } = window.jspdf;

            const doc = new jsPDF('p', 'pt', 'letter');

            const nombreClienteParaTitulo = document.getElementById('nombre').value.trim();
            const fechaHoraIngreso = new Date().toLocaleString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            doc.setFontSize(22);
            doc.text(`Comprobante de Ingreso de Equipo`, doc.internal.pageSize.width / 2, 60, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Cliente: ${nombreClienteParaTitulo}`, doc.internal.pageSize.width / 2, 85, { align: 'center' });
            doc.text(`Fecha y Hora de Ingreso: ${fechaHoraIngreso}`, doc.internal.pageSize.width / 2, 105, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Servicio Técnico Computacional José Miguel`, doc.internal.pageSize.width / 2, 125, { align: 'center' });
            doc.text(`Contacto: [Tu Teléfono] | [Tu Correo] | Dirección: [Tu Dirección Completa, Conchalí, Santiago]`, doc.internal.pageSize.width / 2, 140, { align: 'center' });

            // --- INICIO DE LA LÓGICA DE CAPTURA MEJORADA Y MÁS ROBUSTA ---
            document.body.classList.add('hide-for-pdf');

            // 1. Esperar explícitamente a que TODAS las imágenes de previsualización carguen
            // Obtenemos solo las promesas, no los objetos completos
            const activeImagePromises = loadedImagePromises.map(item => item.promise);
            await Promise.all(activeImagePromises).catch(e => console.error("Error al cargar imágenes:", e));
            
            // 2. Pequeña demora adicional (buffer) para renderizado
            await new Promise(resolve => setTimeout(resolve, 500)); // Aumentado a 500ms

            // 3. Captura del contenido con html2canvas
            const canvas = await html2canvas(pdfContent, { 
                scale: 1.5, // Reducido a 1.5 para mejor rendimiento en móviles (prueba con 1.0 si sigue fallando)
                useCORS: true, 
                allowTaint: true, 
                scrollY: -window.scrollY, 
                windowWidth: document.documentElement.offsetWidth, 
                windowHeight: document.documentElement.offsetHeight,
                logging: true // Activar logging para ver posibles errores en la consola
            });

            document.body.classList.remove('hide-for-pdf');
            // --- FIN DE LA LÓGICA DE CAPTURA MEJORADA ---

            const imgData = canvas.toDataURL('image/jpeg', 0.9); // Calidad 0.9 para JPEG

            const pdfPageWidth = doc.internal.pageSize.getWidth();
            const pdfPageHeight = doc.internal.pageSize.getHeight();
            const margin = 40; 
            const contentWidth = pdfPageWidth - (2 * margin);

            let imgWidth = contentWidth; 
            let imgHeight = (canvas.height * imgWidth) / canvas.width;

            let position = 160; 

            let heightLeft = imgHeight;
            let currentCanvasY = 0; // Posición Y en el canvas original para recortar

            while (heightLeft > 0) {
                // Si la imagen es demasiado grande para la primera página con el encabezado O es una nueva página
                if (position === margin && currentCanvasY === 0 && imgHeight > (pdfPageHeight - position - margin)) {
                    // Es la primera página y no cabe completamente con el encabezado. Se manejará en el bucle.
                } else if (position !== margin || currentCanvasY > 0) { // Si ya estamos más allá del encabezado o ya hemos procesado parte del canvas
                    doc.addPage();
                    position = margin; // Reinicia la posición para la nueva página
                }

                let currentSliceHeight = pdfPageHeight - position - margin;
                if (currentSliceHeight > heightLeft) {
                    currentSliceHeight = heightLeft;
                }
                
                // Recortar la imagen del canvas para la página actual
                // Asegúrate de que el recorte sea dentro de los límites del canvas
                const sliceCanvasHeight = (currentSliceHeight * canvas.width) / imgWidth;
                const sliceCanvasY = currentCanvasY;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width; // Ancho completo del canvas original
                tempCanvas.height = sliceCanvasHeight; // Solo la altura del slice

                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(canvas, 
                                  0, sliceCanvasY, canvas.width, sliceCanvasHeight, // Source (recorte del canvas original)
                                  0, 0, tempCanvas.width, tempCanvas.height); // Destination (copiar al tempCanvas)

                const tempImgData = tempCanvas.toDataURL('image/jpeg', 0.9);

                doc.addImage(tempImgData, 'JPEG', margin, position, imgWidth, currentSliceHeight);
                
                heightLeft -= currentSliceHeight;
                currentCanvasY += sliceCanvasHeight; 
                position += currentSliceHeight; // Actualiza la posición en la página actual
            }

            // Generar un nombre de archivo
            const nombreClienteSlug = nombreClienteParaTitulo.replace(/\s+/g, '_').toLowerCase();
            const fechaArchivo = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '');
            const filename = `Comprobante_Ingreso_${nombreClienteSlug}_${fechaArchivo}.pdf`;

            doc.save(filename);

            alert('¡Comprobante PDF generado y descargado! Puedes enviarlo por WhatsApp.');

            // Limpiar el formulario para el siguiente ingreso
            ingresoEquipoForm.reset();
            photoPreviewContainer.innerHTML = ''; // Limpiar las previsualizaciones
            // También limpiar el array de promesas
            loadedImagePromises.length = 0; 

            entregaConfirmadaInput.value = 'false';
            confirmarEntregaBtn.textContent = 'Confirmo Entrega del Equipo';
            confirmarEntregaBtn.style.backgroundColor = '#007bff';
            confirmarEntregaBtn.disabled = false;

            submitButton.disabled = false;
            submitButton.textContent = 'Generar Comprobante PDF';
        });