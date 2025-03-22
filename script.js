class Timeline {
    constructor() {
        this.units = [];
        this.currentUnitIndex = 0;
        this.currentEvents = {};
        this.currentImageIndex = {}; 
        this.modalActive = false;
        this.loadData();
    }

    async loadData(){
        try{
            // Cargar el listado de unidades
            const response = await fetch('data/units.json');
            const unitsList = await response.json();

            // Cargar detalles de cada unidad
            for (const unit of unitsList) {
                const unitDataResponse = await fetch(`data/${unit.file}`);
                const unitData = await unitDataResponse.json();
                
                // Combinar datos básicos con eventos
                this.units.push({
                    id: unit.id,
                    title: unit.title,
                    background: unit.background,
                    events: unitData.events
                });
                // Inicializar seguimiento de índices para esta unidad
                const unitIndex = this.units.length - 1;
                this.currentEvents[unitIndex] = 0;
                this.currentImageIndex[unitIndex] = {};
                
                // Inicializar índices de imágenes para cada evento
                unitData.events.forEach((_, eventIndex) => {
                    this.currentImageIndex[unitIndex][eventIndex] = 0;
                });
            }

            // Una vez cargados todos los datos, inicializar la interfaz
            this.init(); 

        } catch (error) {
            console.error('Error cargando datos:', error);
            // Mostrar mensaje de error en la interfaz
            document.querySelector('.container').innerHTML = `
                <div class="error-message">
                    <h2>Error al cargar los datos</h2>
                    <p>No se pudieron cargar los datos. Por favor, verifica tu conexión e intenta nuevamente.</p>
                    <p>Detalles técnicos: ${error.message}</p>
                </div>
            `;
        }
    }

    init() {
        this.createUnits();
        this.createGlobalTimeline();
        this.setupNavigation();
        this.createImageModal();
        this.showUnit(0);

        console.log('Timeline inicializada con éxito');
    }

    createUnits() {
        const container = document.querySelector('.units-container');
        
        this.units.forEach((unit, index) => {
            const unitSection = document.createElement('section');
            unitSection.className = 'unit-section';
            unitSection.id = `unit-${unit.id}`;
            
            // Crear el fondo de unidad compartido
            const unitBackground = document.createElement('div');
            unitBackground.className = 'unit-background';

            const backgroundImg = document.createElement('img');
            backgroundImg.src = unit.background;
            backgroundImg.alt = "";
            unitBackground.appendChild(backgroundImg);
            
            // Overlay para el fondo
            const overlay = document.createElement('div');
            overlay.className = 'unit-overlay';
            
            const carousel = this.createCarousel(unit.events, index);
            const buttons = this.createNavigationButtons();

            unitSection.appendChild(unitBackground);
            unitSection.appendChild(overlay);
            unitSection.appendChild(carousel);
            unitSection.appendChild(buttons);
            container.appendChild(unitSection);
        });
    }

    createCarousel(events, unitIndex) {
        const carousel = document.createElement('div');
        carousel.className = 'events-carousel';
        
        events.forEach((event, eventIndex) => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            
            const mainContent = document.createElement('div');
            mainContent.className = 'event-main-content';
            
            // Crear el carrusel de imágenes para este evento
            const imageCarousel = document.createElement('div');
            imageCarousel.className = 'image-carousel';
            
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            
            // Agregar todas las imágenes del evento
            event.images.forEach((imgSrc, imgIndex) => {
                const img = document.createElement('div');
                img.className = 'event-image';
                img.style.backgroundImage = `url(${imgSrc})`;
                img.dataset.imageSrc = imgSrc;
                img.dataset.imageIndex = imgIndex;
                
                // Agregar clic para ampliar la imagen
                img.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openImageModal(event.images, imgIndex);
                });
                
                imageContainer.appendChild(img);
            });
            
            imageCarousel.appendChild(imageContainer);
            
            // Agregar controles de navegación para el carrusel de imágenes si hay más de una imagen
            if (event.images.length > 1) {
                const prevImgBtn = document.createElement('button');
                prevImgBtn.className = 'image-nav-button prev-img';
                prevImgBtn.innerHTML = '&lt;';
                prevImgBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.navigateImages(unitIndex, eventIndex, 'prev');
                });
                
                const nextImgBtn = document.createElement('button');
                nextImgBtn.className = 'image-nav-button next-img';
                nextImgBtn.innerHTML = '&gt;';
                nextImgBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.navigateImages(unitIndex, eventIndex, 'next');
                });
                
                imageCarousel.appendChild(prevImgBtn);
                imageCarousel.appendChild(nextImgBtn);
            }
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'event-content';
            contentDiv.innerHTML = `
                <h3>${event.title}</h3>
                ${event.date ? `<p class="event-date">${event.date}</p>` : ''}
                <p>${event.description}</p>
            `;
            
            mainContent.appendChild(imageCarousel);
            mainContent.appendChild(contentDiv);
            eventCard.appendChild(mainContent);
            carousel.appendChild(eventCard);
        });
        
        return carousel;
    }

    createImageModal() {
        // Crear el modal para visualizar imágenes a pantalla completa
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.display = 'none';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-modal';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.closeImageModal());
        
        const modalImageContainer = document.createElement('div');
        modalImageContainer.className = 'modal-image-container';
        
        const prevModalBtn = document.createElement('button');
        prevModalBtn.className = 'modal-nav-button prev-modal';
        prevModalBtn.innerHTML = '&lt;';
        
        const nextModalBtn = document.createElement('button');
        nextModalBtn.className = 'modal-nav-button next-modal';
        nextModalBtn.innerHTML = '&gt;';
        
        // Agregar botones de zoom
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';

        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'zoom-button zoom-in';
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Aumentar zoom';
        zoomInBtn.addEventListener('click', () => this.zoomImage(1.2));

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'zoom-button zoom-out';
        zoomOutBtn.innerHTML = '-';
        zoomOutBtn.title = 'Disminuir zoom';
        zoomOutBtn.addEventListener('click', () => this.zoomImage(0.8));
        
        const resetZoomBtn = document.createElement('button');
        resetZoomBtn.className = 'zoom-button reset-zoom';
        resetZoomBtn.innerHTML = '↺';
        resetZoomBtn.title = 'Restablecer zoom';
        resetZoomBtn.addEventListener('click', () => this.resetZoom());
        
        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(resetZoomBtn);
        zoomControls.appendChild(zoomOutBtn);

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(prevModalBtn);
        modalContent.appendChild(modalImageContainer);
        modalContent.appendChild(nextModalBtn);
        modalContent.appendChild(zoomControls);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Cerrar el modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalActive) {
                this.closeImageModal();
            }
        });
    }
    
    openImageModal(images, startIndex = 0) {
        const modal = document.querySelector('.image-modal');
        const modalImageContainer = modal.querySelector('.modal-image-container');
        const prevBtn = modal.querySelector('.prev-modal');
        const nextBtn = modal.querySelector('.next-modal');
        
        // Limpiar contenedor de imágenes
        modalImageContainer.innerHTML = '';
        
        // Guardar las imágenes y el índice actual
        this.modalImages = images;
        this.modalCurrentIndex = startIndex;
        
        // Mostrar la imagen actual
        this.updateModalImage();
        
        // Configurar los botones de navegación
        prevBtn.onclick = () => {
            this.modalCurrentIndex = (this.modalCurrentIndex - 1 + this.modalImages.length) % this.modalImages.length;
            this.updateModalImage();
        };
        
        nextBtn.onclick = () => {
            this.modalCurrentIndex = (this.modalCurrentIndex + 1) % this.modalImages.length;
            this.updateModalImage();
        };
        
        // Mostrar u ocultar botones de navegación según corresponda
        if (images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
        
        // Mostrar el modal
        modal.style.display = 'flex';
        this.modalActive = true;
        
        // Crear una función para manejar la navegación con teclado en el modal
        this.handleModalKeyNavigation = (e) => {
            if (this.modalActive) {
                if (e.key === 'ArrowLeft') {
                    this.modalCurrentIndex = (this.modalCurrentIndex - 1 + this.modalImages.length) % this.modalImages.length;
                    this.updateModalImage();
                    e.preventDefault();
                } else if (e.key === 'ArrowRight') {
                    this.modalCurrentIndex = (this.modalCurrentIndex + 1) % this.modalImages.length;
                    this.updateModalImage();
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    this.closeImageModal();
                    e.preventDefault();
                } else if (e.key === '+' || e.key === '=') {
                    this.zoomImage(1.2);
                    e.preventDefault();
                } else if (e.key === '-' || e.key === '_') {
                    this.zoomImage(0.8);
                    e.preventDefault();
                } else if (e.key === '0') {
                    this.resetZoom();
                    e.preventDefault();
                }
            }
        };
        
        // Añadir el evento de teclado para el modal
        document.addEventListener('keydown', this.handleModalKeyNavigation);
    }
    
    updateModalImage() {
        const modalImageContainer = document.querySelector('.modal-image-container');
        modalImageContainer.innerHTML = '';
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'modal-image-wrapper';
        
        const img = document.createElement('img');
        img.src = this.modalImages[this.modalCurrentIndex];
        img.className = 'modal-image';
        imgWrapper.appendChild(img);
        modalImageContainer.appendChild(imgWrapper);
        
        // Inicializar las variables de zoom
        this.zoomLevel = 1;
        this.isPanning = false;
        this.startPanX = 0;
        this.startPanY = 0;
        this.currentPanX = 0;
        this.currentPanY = 0;
        
        // Configurar eventos de arrastre para mover la imagen
        imgWrapper.addEventListener('mousedown', (e) => {
            if (this.zoomLevel > 1) {
                this.isPanning = true;
                this.startPanX = e.clientX - this.currentPanX;
                this.startPanY = e.clientY - this.currentPanY;
                imgWrapper.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning && this.zoomLevel > 1) {
                this.currentPanX = e.clientX - this.startPanX;
                this.currentPanY = e.clientY - this.startPanY;
                
                // Aplicar transformación con zoom y posición
                imgWrapper.style.transform = `translate(${this.currentPanX}px, ${this.currentPanY}px) scale(${this.zoomLevel})`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                imgWrapper.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
            }
        });
        
        // Permitir que la rueda del mouse controle el zoom
        imgWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            this.zoomImage(delta);
        });
        
        // Hacer que la imagen sea "agarrable" si está ampliada
        imgWrapper.style.cursor = 'default';
    }

    // Agregar métodos para controlar el zoom
    zoomImage(factor) {
        const imgWrapper = document.querySelector('.modal-image-wrapper');
        if (!imgWrapper) return;
        
        // Actualizar nivel de zoom
        const newZoom = this.zoomLevel * factor;
        
        // Limitar el zoom entre 1 y 5
        this.zoomLevel = Math.max(1, Math.min(5, newZoom));
        
        // Aplicar transformación con zoom y posición
        imgWrapper.style.transform = `translate(${this.currentPanX}px, ${this.currentPanY}px) scale(${this.zoomLevel})`;
        
        // Actualizar cursor
        imgWrapper.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
    }

    resetZoom() {
        const imgWrapper = document.querySelector('.modal-image-wrapper');
        if (!imgWrapper) return;
        
        // Restablecer valores
        this.zoomLevel = 1;
        this.currentPanX = 0;
        this.currentPanY = 0;
        
        // Aplicar transformación
        imgWrapper.style.transform = `translate(0, 0) scale(1)`;
        imgWrapper.style.cursor = 'default';
    }
    
    closeImageModal() {
        const modal = document.querySelector('.image-modal');
        modal.style.display = 'none';
        this.modalActive = false;
        
        // Eliminar el evento de teclado para el modal
        document.removeEventListener('keydown', this.handleModalKeyNavigation);
        
        // Restablecer el zoom
        this.zoomLevel = 1;
        this.currentPanX = 0;
        this.currentPanY = 0;
    }
    
    preventEventNavigation(e) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.stopPropagation();
        }
    }

    navigateImages(unitIndex, eventIndex, direction) {
        const imageCount = this.units[unitIndex].events[eventIndex].images.length;
        const currentIndex = this.currentImageIndex[unitIndex][eventIndex];
        
        if (direction === 'next') {
            this.currentImageIndex[unitIndex][eventIndex] = (currentIndex + 1) % imageCount;
        } else {
            this.currentImageIndex[unitIndex][eventIndex] = (currentIndex - 1 + imageCount) % imageCount;
        }
        
        this.updateEventImageDisplay(unitIndex, eventIndex);
    }
    
    updateEventImageDisplay(unitIndex, eventIndex) {
        const unitId = this.units[unitIndex].id;
        const currentImageIndex = this.currentImageIndex[unitIndex][eventIndex];
        
        // Seleccionar el contenedor de imágenes del evento actual
        const eventCard = document.querySelector(`#unit-${unitId} .events-carousel .event-card:nth-child(${eventIndex + 1})`);
        if (!eventCard) return;
        
        const imageContainer = eventCard.querySelector('.image-container');
        const imageWidth = imageContainer.querySelector('.event-image').offsetWidth;
        
        // Desplazar el contenedor de imágenes
        imageContainer.style.transform = `translateX(${-currentImageIndex * imageWidth}px)`;
    }

    createNavigationButtons() {
        const buttons = document.createElement('div');
        buttons.className = 'navigation-buttons';
        buttons.innerHTML = `
            <button class="nav-button left-btn">&lt;</button>
            <button class="nav-button right-btn">&gt;</button>
            <button class="nav-button down-btn">▼</button>
        `;
        return buttons;
    }

    createGlobalTimeline() {
        const timelineRows = document.querySelector('.timeline-rows');
        
        this.units.forEach((unit, unitIndex) => {
            const row = document.createElement('div');
            row.className = 'timeline-row';
            
            // Crear encabezado de unidad con evento click
            const unitHeader = document.createElement('h3');
            unitHeader.textContent = unit.title;
            unitHeader.classList.add('unit-header');
            
            // Añadir evento click al encabezado de la unidad
            unitHeader.addEventListener('click', () => {
                this.showUnit(unitIndex);
                this.navigateToEvent(unitIndex, 0);
                document.querySelector('.global-timeline').classList.remove('active');
            });
            
            row.appendChild(unitHeader);
            
            unit.events.forEach((event, eventIndex) => {
                const eventElement = document.createElement('div');
                eventElement.className = 'timeline-event';
                eventElement.style.backgroundImage = `url(${event.images[0]})`;
                
                eventElement.addEventListener('click', () => {
                    this.showUnit(unitIndex);
                    this.navigateToEvent(unitIndex, eventIndex);
                    document.querySelector('.global-timeline').classList.remove('active');
                });
                
                row.appendChild(eventElement);
            });
            
            timelineRows.appendChild(row);
        });
    }

    setupNavigation() {
        // Navegación horizontal con botones
        document.addEventListener('click', (e) => {
            if (this.modalActive) return; // No navegar si el modal está abierto
            
            if(e.target.classList.contains('left-btn')) {
                this.navigate('prev');
            }
            if(e.target.classList.contains('right-btn')) {
                this.navigate('next');
            }
        });

        // Navegación vertical con botones
        document.addEventListener('click', (e) => {
            if (this.modalActive) return; // No navegar si el modal está abierto
            
            if(e.target.classList.contains('down-btn')) {
                document.querySelector('.global-timeline').classList.add('active');
            }
            if(e.target.classList.contains('up-btn')) {
                document.querySelector('.global-timeline').classList.remove('active');
            }
        });
        
        // Añadir navegación con teclas
        document.addEventListener('keydown', (e) => {
            if (this.modalActive) return; // No navegar si el modal está abierto
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.navigate('prev');
                    break;
                case 'ArrowRight':
                    this.navigate('next');
                    break;
                case 'ArrowDown':
                    document.querySelector('.global-timeline').classList.add('active');
                    break;
                case 'ArrowUp':
                    document.querySelector('.global-timeline').classList.remove('active');
                    break;
            }
        });
    }

    showUnit(unitIndex) {
        document.querySelectorAll('.unit-section').forEach(unit => unit.classList.remove('active'));
        document.querySelector(`#unit-${this.units[unitIndex].id}`).classList.add('active');
        this.currentUnitIndex = unitIndex;
        this.updateCarouselPosition();
    }

    navigate(direction) {
        const currentEvent = this.currentEvents[this.currentUnitIndex];
        const totalEvents = this.units[this.currentUnitIndex].events.length;
        
        this.currentEvents[this.currentUnitIndex] = direction === 'next'
            ? Math.min(currentEvent + 1, totalEvents - 1)
            : Math.max(currentEvent - 1, 0);
        
        this.updateCarouselPosition();
    }

    navigateToEvent(unitIndex, eventIndex) {
        this.currentEvents[unitIndex] = eventIndex;
        this.updateCarouselPosition();
    }

    updateCarouselPosition() {
        const unitId = this.units[this.currentUnitIndex].id;
        const carousel = document.querySelector(`#unit-${unitId} .events-carousel`);

        if (carousel) {
            const eventCard = carousel.querySelector('.event-card');
            if (eventCard) {
                const eventWidth = eventCard.offsetWidth;
                const translateX = -eventWidth * this.currentEvents[this.currentUnitIndex];
                carousel.style.transform = `translateX(${translateX}px)`;
                
                // Actualizar la visualización de imágenes para el evento actual
                this.updateEventImageDisplay(
                    this.currentUnitIndex, 
                    this.currentEvents[this.currentUnitIndex]
                );
            }
        }
    }
}

// Inicializar la línea de tiempo
document.addEventListener('DOMContentLoaded', () => new Timeline());