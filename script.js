let selectedFile = null;

// Elementos DOM
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const fileInfoPanel = document.getElementById('file-info-panel');
const infoName = document.getElementById('info-name');
const infoPages = document.getElementById('info-pages');
const positionSelect = document.getElementById('position-select');
const formatSelect = document.getElementById('format-select');
const fontSizeInput = document.getElementById('font-size-input');
const marginInput = document.getElementById('margin-input');
const skipFirstChk = document.getElementById('skip-first-chk');
const processBtn = document.getElementById('process-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const resultPanel = document.getElementById('result-panel');
const downloadLink = document.getElementById('download-link');

// =========================================================
// 1. GERENCIAMENTO DE TEMA (DARK MODE)
// =========================================================
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeIcon) themeIcon.textContent = '☀️';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        if (themeIcon) themeIcon.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// =========================================================
// 2. SELEÇÃO DE ARQUIVO PDF
// =========================================================
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('Por favor, selecione um arquivo no formato PDF.');
        return;
    }

    try {
        selectedFile = file;
        uploadStatus.textContent = `Documento PDF carregado: ${file.name}`;
        infoName.textContent = file.name;

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();

        infoPages.textContent = `${totalPages} página(s)`;
        fileInfoPanel.classList.remove('hidden');
        resultPanel.classList.add('hidden');
        processBtn.disabled = false;

    } catch (err) {
        console.error('Erro ao ler PDF:', err);
        alert('Erro ao ler o arquivo PDF selecionado.');
    }
});

// =========================================================
// 3. PROCESSAMENTO E NUMERAÇÃO DE PÁGINAS
// =========================================================
processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    try {
        processBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        resultPanel.classList.add('hidden');
        updateProgress(10);

        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        const pages = pdfDoc.getPages();
        const totalPages = pages.length;
        
        const fontSize = parseInt(fontSizeInput.value) || 10;
        const margin = parseInt(marginInput.value) || 20;
        const position = positionSelect.value;
        const formatOption = formatSelect.value;
        const skipFirst = skipFirstChk.checked;

        const startPage = skipFirst ? 1 : 0;
        const countPages = skipFirst ? totalPages - 1 : totalPages;

        for (let i = startPage; i < totalPages; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();
            
            const currentPageNum = skipFirst ? i : i + 1;
            const text = formatPageText(formatOption, currentPageNum, countPages);
            const textWidth = font.widthOfTextAtSize(text, fontSize);

            // Calcular Coordenadas X e Y
            let x = 0;
            let y = 0;

            // Posição X
            if (position.includes('center')) {
                x = (width - textWidth) / 2;
            } else if (position.includes('right')) {
                x = width - margin - textWidth;
            } else { // left
                x = margin;
            }

            // Posição Y
            if (position.includes('top')) {
                y = height - margin - fontSize;
            } else { // bottom
                y = margin;
            }

            // Desenhar texto na página
            page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: PDFLib.rgb(0.2, 0.2, 0.2),
            });

            const percent = Math.round(((i + 1) / totalPages) * 100);
            updateProgress(percent);
        }

        // Salvar documento final
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const outputName = getOutputName(selectedFile.name);
        downloadLink.href = url;
        downloadLink.download = outputName;

        updateProgress(100);
        resultPanel.classList.remove('hidden');
        processBtn.disabled = false;
        resultPanel.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error('Erro ao numerar PDF:', err);
        alert('Ocorreu um erro ao numerar o documento.');
        processBtn.disabled = false;
    }
});

function formatPageText(formatOption, current, total) {
    switch (formatOption) {
        case 'page-total':
            return `Página ${current} de ${total}`;
        case 'page-only':
            return `Página ${current}`;
        case 'slash':
            return `${current} / ${total}`;
        case 'num-only':
        default:
            return `${current}`;
    }
}

function getOutputName(originalName) {
    const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
    return `${nameWithoutExt}_numerado.pdf`;
}

function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
}
