/**
 * Script de du00e9tection d'u00e9crans pliants pour Groovy Keys
 * Utilise l'API Fold (si disponible) et les media queries pour optimiser l'affichage
 */

document.addEventListener('DOMContentLoaded', () => {
    // Du00e9tection de l'API Fold (pour les u00e9crans pliants)
    if ('screen' in window && 'fold' in window.screen) {
        console.log('API Fold du00e9tectu00e9e - Appareil pliant supportu00e9');
        
        // u00c9couter les changements de configuration d'u00e9cran
        const screenFold = window.screen.fold;
        if (screenFold && screenFold.addEventListener) {
            screenFold.addEventListener('change', handleFoldChange);
            // Appliquer immu00e9diatement le style appropriu00e9
            handleFoldChange();
        }
    } else {
        console.log('API Fold non disponible - Adaptations responsives standards appliquu00e9es');
        // Appliquer les adaptations responsives standards
        applyResponsiveAdjustments();
    }
    
    // u00c9couter les changements d'orientation pour tous les appareils
    window.addEventListener('resize', debounce(applyResponsiveAdjustments, 250));
    // Appliquer les ajustements initiaux
    applyResponsiveAdjustments();
});

/**
 * Gu00e8re les changements de configuration d'u00e9cran pliant
 */
function handleFoldChange() {
    const screenFold = window.screen.fold;
    const foldAngle = screenFold.angle || 180; // 180 = du00e9pliu00e9 complu00e8tement
    
    // Supprimer les classes pru00e9cu00e9dentes
    document.body.classList.remove('fold-flat', 'fold-half', 'fold-changed', 'fold-vertical', 'fold-horizontal');
    
    // Ajouter la classe pour les transitions CSS
    document.body.classList.add('fold-changed');
    
    // Du00e9tecter le type de pliage
    if (foldAngle < 160) { // Partiellement pliu00e9
        document.body.classList.add('fold-half');
        
        // Du00e9tecter l'orientation du pli
        if (screenFold.orientation === 'vertical') {
            document.body.classList.add('fold-vertical');
            // Adapter la disposition pour un pli vertical
            adaptLayoutForVerticalFold();
        } else {
            document.body.classList.add('fold-horizontal');
            // Adapter la disposition pour un pli horizontal
            adaptLayoutForHorizontalFold();
        }
    } else { // Complu00e8tement du00e9pliu00e9
        document.body.classList.add('fold-flat');
        // Utiliser la disposition standard
        resetFoldAdaptations();
    }
    
    console.log(`Configuration d'u00e9cran changu00e9e: angle=${foldAngle}`);
}

/**
 * Adapte la disposition pour un pli vertical (comme un livre)
 */
function adaptLayoutForVerticalFold() {
    // Placer les contru00f4les sur la moitiu00e9 gauche et le clavier sur la moitiu00e9 droite
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
    }
    
    // Ajuster la taille des touches pour s'adapter u00e0 l'espace ru00e9duit
    const whiteKeys = document.querySelectorAll('.white-key');
    const blackKeys = document.querySelectorAll('.black-key');
    
    whiteKeys.forEach(key => {
        key.style.width = '35px';
    });
    
    blackKeys.forEach(key => {
        key.style.width = '20px';
    });
}

/**
 * Adapte la disposition pour un pli horizontal (comme un ordinateur portable)
 */
function adaptLayoutForHorizontalFold() {
    // Placer les contru00f4les en haut et le clavier en bas
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'column';
    }
    
    // Ajuster les contru00f4les pour qu'ils s'adaptent u00e0 la moitiu00e9 supu00e9rieure
    const controlsContainer = document.querySelector('.controls-container');
    if (controlsContainer) {
        controlsContainer.style.flexWrap = 'wrap';
        controlsContainer.style.justifyContent = 'center';
    }
    
    // Permettre au clavier de du00e9filer horizontalement si nu00e9cessaire
    const pianoContainer = document.querySelector('.piano-container');
    if (pianoContainer) {
        pianoContainer.style.overflowX = 'auto';
    }
}

/**
 * Ru00e9initialise les adaptations spu00e9cifiques aux plis
 */
function resetFoldAdaptations() {
    // Restaurer la disposition par du00e9faut
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        mainContainer.style.display = '';
        mainContainer.style.flexDirection = '';
    }
    
    // Restaurer la taille des touches par du00e9faut (laissez le CSS s'en occuper)
    const whiteKeys = document.querySelectorAll('.white-key');
    const blackKeys = document.querySelectorAll('.black-key');
    
    whiteKeys.forEach(key => {
        key.style.width = '';
    });
    
    blackKeys.forEach(key => {
        key.style.width = '';
    });
    
    // Restaurer les styles des conteneurs
    const controlsContainer = document.querySelector('.controls-container');
    if (controlsContainer) {
        controlsContainer.style.flexWrap = '';
        controlsContainer.style.justifyContent = '';
    }
    
    const pianoContainer = document.querySelector('.piano-container');
    if (pianoContainer) {
        pianoContainer.style.overflowX = '';
    }
}

/**
 * Applique des ajustements responsifs en fonction de la taille de l'u00e9cran actuelle
 */
function applyResponsiveAdjustments() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Ajuster le nombre d'octaves visibles en fonction de la largeur
    if (width < 600) {
        // Pour les u00e9crans tru00e8s u00e9troits, ru00e9duire le nombre de touches visibles
        limitVisibleOctaves(1); // Une seule octave visible u00e0 la fois
    } else if (width < 1000) {
        limitVisibleOctaves(2); // Deux octaves visibles u00e0 la fois
    } else {
        // Restaurer toutes les octaves
        showAllOctaves();
    }
    
    // Ajuster la hauteur du piano en fonction de la hauteur disponible
    if (height < 500) {
        const whiteKeys = document.querySelectorAll('.white-key');
        whiteKeys.forEach(key => {
            key.style.height = '120px';
        });
    } else {
        const whiteKeys = document.querySelectorAll('.white-key');
        whiteKeys.forEach(key => {
            key.style.height = '';
        });
    }
    
    console.log(`Ajustements responsifs appliquu00e9s: ${width}x${height}`);
}

/**
 * Limite le nombre d'octaves visibles u00e0 la fois
 * @param {number} count - Nombre d'octaves u00e0 afficher
 */
function limitVisibleOctaves(count) {
    // Implu00e9mentation fictive - u00e0 adapter en fonction de la structure du piano
    console.log(`Limitation u00e0 ${count} octaves`);
    // Cette fonction serait u00e0 implu00e9menter en fonction de votre structure HTML/CSS
}

/**
 * Affiche toutes les octaves
 */
function showAllOctaves() {
    // Implu00e9mentation fictive - u00e0 adapter en fonction de la structure du piano
    console.log('Affichage de toutes les octaves');
    // Cette fonction serait u00e0 implu00e9menter en fonction de votre structure HTML/CSS
}

/**
 * Fonction debounce pour u00e9viter les appels trop fru00e9quents
 * @param {Function} func - Fonction u00e0 exu00e9cuter
 * @param {number} wait - Du00e9lai d'attente en ms
 * @return {Function} - Fonction avec debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
