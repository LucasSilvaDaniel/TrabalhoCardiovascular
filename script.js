
const PDF_PAGES = [
    1, 2, 3, 4, 5,
    6, 7, 8, 9, 10,
    11, 12, 13, 14, 15,
    17
];

const VIDEO_SLIDE_INDEX = 15;
const TOTAL_SLIDES = PDF_PAGES.length + 1;

let currentSlide = 0;
let pdfDocument = null;
let renderTask = null;
let renderVersion = 0;

const pdfSlide = document.getElementById('pdfSlide');
const pdfCanvas = document.getElementById('pdfCanvas');
const slideContainer = document.getElementById('slideContainer');

const videoSlide = document.getElementById('videoSlide');
const video = document.getElementById('presentationVideo');

const currentLabel = document.getElementById('currentSlide');
const totalLabel = document.getElementById('totalSlides');
const progressFill = document.getElementById('progressFill');

const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const dotsContainer = document.getElementById('slideDots');

const pdfContext = pdfCanvas.getContext('2d');

totalLabel.textContent = String(TOTAL_SLIDES).padStart(2, '0');

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Cria os indicadores
const dots = [];
dotsContainer.innerHTML = '';

for (let i = 0; i < TOTAL_SLIDES; i++) {
    const dot = document.createElement('button');

    dot.className = 'dot';
    dot.type = 'button';
    dot.setAttribute(
        'aria-label',
        i === VIDEO_SLIDE_INDEX
            ? 'Reproduzir vídeo'
            : `Ir para o slide ${i < VIDEO_SLIDE_INDEX ? i + 1 : 17}`
    );

    dot.addEventListener('click', () => goToSlide(i));

    dotsContainer.appendChild(dot);
    dots.push(dot);
}

// Carrega o PDF
async function loadPDF() {
    try {
        pdfDocument = await pdfjsLib.getDocument(
            'assets/procedimentos.pdf'
        ).promise;

        await renderCurrentPDFPage();
    } catch (error) {
        console.error('Erro ao carregar o PDF:', error);
    }
}

// Renderiza a página selecionada
async function renderPDFPage(pageNumber) {
    if (!pdfDocument) return;

    const version = ++renderVersion;

    if (renderTask) {
        const previousTask = renderTask;
        renderTask = null;

        try {
            previousTask.cancel();
            await previousTask.promise;
        } catch (error) {
            // Cancelamento esperado ao mudar de página.
        }
    }

    if (version !== renderVersion) return;

    try {
        const page = await pdfDocument.getPage(pageNumber);
        if (version !== renderVersion) return;

        const base = page.getViewport({ scale: 1 });
        const width = slideContainer.clientWidth;
        const height = slideContainer.clientHeight;

        if (!width || !height) return;

        const scale = Math.min(
            width / base.width,
            height / base.height
        );

        const viewport = page.getViewport({ scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        pdfCanvas.width = Math.floor(viewport.width * outputScale);
        pdfCanvas.height = Math.floor(viewport.height * outputScale);

        pdfCanvas.style.width = `${viewport.width}px`;
        pdfCanvas.style.height = `${viewport.height}px`;
        pdfCanvas.style.position = 'absolute';
        pdfCanvas.style.left = '50%';
        pdfCanvas.style.top = '50%';
        pdfCanvas.style.transform = 'translate(-50%, -50%)';
        pdfCanvas.style.maxWidth = '100%';
        pdfCanvas.style.maxHeight = '100%';
        pdfCanvas.style.pointerEvents = 'none';

        pdfContext.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

        const task = page.render({
            canvasContext: pdfContext,
            viewport: page.getViewport({
                scale: scale * outputScale
            })
        });

        renderTask = task;
        await task.promise;

        if (renderTask === task) renderTask = null;
    } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
            console.error('Erro ao renderizar o PDF:', error);
        }
    }
}

async function renderCurrentPDFPage() {
    if (currentSlide < VIDEO_SLIDE_INDEX) {
        await renderPDFPage(PDF_PAGES[currentSlide]);
    } else if (currentSlide === TOTAL_SLIDES - 1) {
        await renderPDFPage(17);
    }
}

// Navegação
function goToSlide(index) {
    currentSlide = (index + TOTAL_SLIDES) % TOTAL_SLIDES;

    const showingVideo = currentSlide === VIDEO_SLIDE_INDEX;

    if (showingVideo) {
        pdfSlide.classList.remove('active');
        videoSlide.classList.add('active');
    } else {
        videoSlide.classList.remove('active');
        pdfSlide.classList.add('active');

        video.pause();

        if (currentSlide !== VIDEO_SLIDE_INDEX) {
            video.currentTime = 0;
        }

        renderCurrentPDFPage();
    }

    currentLabel.textContent =
        String(currentSlide + 1).padStart(2, '0');

    progressFill.style.width =
        `${((currentSlide + 1) / TOTAL_SLIDES) * 100}%`;

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);

        if (i === currentSlide) {
            dot.setAttribute('aria-current', 'true');
        } else {
            dot.removeAttribute('aria-current');
        }
    });
}

function nextSlide() {
    goToSlide(currentSlide + 1);
}

function previousSlide() {
    goToSlide(currentSlide - 1);
}

prevButton.addEventListener('click', previousSlide);
nextButton.addEventListener('click', nextSlide);

// Teclas direcionais e tela cheia
document.addEventListener('keydown', (event) => {
    if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.tagName === 'VIDEO' ||
        event.target.isContentEditable
    ) return;

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextSlide();
    }

    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousSlide();
    }

    if (event.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }
});

// Redimensionamento da janela
let resizeTimeout;

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        renderCurrentPDFPage();
    }, 150);
});

// Inicia a apresentação
goToSlide(0);
loadPDF();
