document.addEventListener('DOMContentLoaded', () => {
    // Elementos da DOM
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const previewSection = document.getElementById('preview-section');
    const previewGrid = document.getElementById('preview-grid');
    const formatSelect = document.getElementById('format-select');
    const qualityControl = document.getElementById('quality-control');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityValue = document.getElementById('quality-value');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');
    const downloadZipBtn = document.getElementById('download-zip-btn');
    const resultSection = document.getElementById('result-section');
    const resultGrid = document.getElementById('result-grid');

    // Estado da aplicaÃ§Ã£o
    let filesToProcess = [];
    let convertedFiles = [];

    // --- ManipulaÃ§Ã£o de Arquivos (Upload e PrÃ©-visualizaÃ§Ã£o) ---

    function handleFiles(files) {
        for (const file of files) {
            if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
                alert(`Arquivo nÃ£o suportado: ${file.name}`);
                continue;
            }
            if (!filesToProcess.some(f => f.file.name === file.name && f.file.size === file.size)) {
                const fileObject = { file, id: Date.now() + Math.random() };
                filesToProcess.push(fileObject);
                createPreview(fileObject);
            }
        }
        if (filesToProcess.length > 0) {
            previewSection.style.display = 'block';
        }
    }

    function createPreview(fileObject) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumbnailUrl = e.target.result;
            const thumbnail = document.createElement('div');
            thumbnail.classList.add('thumbnail');
            thumbnail.dataset.fileId = fileObject.id;

            const img = document.createElement('img');
            if (/\.(heic|heif)$/i.test(fileObject.file.name)) {
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                const heicName = document.createElement('p');
                heicName.textContent = fileObject.file.name;
                heicName.style.cssText = 'position: absolute; word-break: break-all; padding: 5px; text-align: center; color: #333;';
                thumbnail.appendChild(heicName);
            } else {
                img.src = thumbnailUrl;
            }
            thumbnail.appendChild(img);

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-btn');
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                filesToProcess = filesToProcess.filter(f => f.id !== fileObject.id);
                thumbnail.remove();
                if (filesToProcess.length === 0) {
                    previewSection.style.display = 'none';
                }
            });

            thumbnail.appendChild(removeBtn);
            previewGrid.appendChild(thumbnail);
        };
        reader.readAsDataURL(fileObject.file);
    }

    // --- LÃ³gica de ConversÃ£o ---

    async function convertImages() {
        if (filesToProcess.length === 0) {
            alert('Por favor, selecione pelo menos uma imagem.');
            return;
        }

        resetResults();
        resultSection.style.display = 'block';
        downloadZipBtn.style.display = 'inline-block';

        const outputFormat = formatSelect.value;
        const quality = qualitySlider.value / 100;
        const conversionPromises = filesToProcess.map(fileObject => processConversion(fileObject, outputFormat, quality));
        
        await Promise.all(conversionPromises);
    }

    async function processConversion(fileObject, outputFormat, quality) {
        const placeholder = createResultPlaceholder();
        const { file } = fileObject;

        try {
            let convertedBlob;
            const isHeic = /\.(heic|heif)$/i.test(file.name);
            const mimeType = `image/${outputFormat}`;

            if (isHeic) {
                convertedBlob = await heic2any({ blob: file, toType: mimeType, quality });
            } else {
                convertedBlob = await convertWithCanvas(file, mimeType, quality);
            }

            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            const newName = `${baseName}.${outputFormat}`;
            
            convertedFiles.push({ blob: convertedBlob, name: newName });
            updateResultItem(placeholder, convertedBlob, newName);

        } catch (error) {
            console.error('Erro na conversÃ£o:', error);
            placeholder.innerHTML = `<p style="color: red; font-size: 12px; text-align: center;">Falha ao converter ${file.name}</p>`;
        }
    }

    function convertWithCanvas(file, mimeType, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                // O parÃ¢metro de qualidade sÃ³ Ã© vÃ¡lido para jpeg e webp
                if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
                    canvas.toBlob(resolve, mimeType, quality);
                } else {
                    canvas.toBlob(resolve, mimeType);
                }
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    // --- ManipulaÃ§Ã£o da UI ---

    function createResultPlaceholder() {
        const placeholder = document.createElement('div');
        placeholder.classList.add('result-item');
        placeholder.innerHTML = '<div class="spinner-overlay"><div class="spinner"></div></div>';
        resultGrid.appendChild(placeholder);
        return placeholder;
    }

    function updateResultItem(element, blob, newName) {
        const resultUrl = URL.createObjectURL(blob);
        element.innerHTML = ''; // Limpa o spinner

        const img = document.createElement('img');
        img.src = resultUrl;
        element.appendChild(img);

        const downloadLink = document.createElement('a');
        downloadLink.href = resultUrl;
        downloadLink.download = newName;
        downloadLink.classList.add('download-btn');
        downloadLink.textContent = 'Download';
        element.appendChild(downloadLink);
    }

    function resetResults() {
        convertedFiles = [];
        resultGrid.innerHTML = '';
        downloadZipBtn.style.display = 'none';
    }

    function toggleQualityControl() {
        const selectedFormat = formatSelect.value;
        if (selectedFormat === 'jpeg' || selectedFormat === 'webp') {
            qualityControl.style.display = 'flex';
        } else {
            qualityControl.style.display = 'none';
        }
    }

    // --- Funcionalidade dos BotÃµes ---

    function clearAll() {
        filesToProcess = [];
        convertedFiles = [];
        previewGrid.innerHTML = '';
        resultGrid.innerHTML = '';
        previewSection.style.display = 'none';
        resultSection.style.display = 'none';
        downloadZipBtn.style.display = 'none';
        fileInput.value = '';
    }

    async function downloadAllAsZip() {
        if (convertedFiles.length === 0) {
            alert('Nenhum arquivo convertido para baixar.');
            return;
        }

        const zip = new JSZip();
        convertedFiles.forEach(file => {
            zip.file(file.name, file.blob);
        });

        downloadZipBtn.textContent = 'Compactando...';
        downloadZipBtn.disabled = true;

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipUrl = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = 'imagens-convertidas.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao criar o ZIP:', error);
            alert('Falha ao criar o arquivo ZIP.');
        } finally {
            downloadZipBtn.textContent = 'Baixar Todas (.zip)';
            downloadZipBtn.disabled = false;
        }
    }

    // --- Event Listeners ---

    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    convertBtn.addEventListener('click', convertImages);
    clearBtn.addEventListener('click', clearAll);
    downloadZipBtn.addEventListener('click', downloadAllAsZip);
    formatSelect.addEventListener('change', toggleQualityControl);
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = `${qualitySlider.value}%`;
    });

    // InicializaÃ§Ã£o
    toggleQualityControl();
});
