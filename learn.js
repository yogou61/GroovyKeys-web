// Gestion de la navigation entre les sections
function showSection(sectionId) {
    // Cacher toutes les sections
    document.querySelectorAll('.lesson-content').forEach(section => {
        section.classList.remove('active');
    });
    
    // Cacher les cartes
    const lessonCards = document.getElementById('lesson-cards');
    lessonCards.classList.remove('active');

    // Afficher la section demandée
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        // Réinitialiser le scroll au début de la section
        window.scrollTo(0, 0);
    }
}

// Gestion du menu
function updateActiveMenu(targetId) {
    const menuLinks = document.querySelectorAll('.learn-menu a');
    menuLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + targetId);
    });
}

// Gestionnaire de scroll
function observerCallback(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            updateActiveMenu(entry.target.id);
        }
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // S'assurer que la section des cartes est visible au chargement
    document.querySelectorAll('.lesson-content').forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher les cartes par défaut
    const lessonCards = document.getElementById('lesson-cards');
    lessonCards.classList.add('active');

    // Observer pour le scroll
    const observer = new IntersectionObserver(observerCallback, {
        rootMargin: '-50% 0px',
        threshold: 0
    });

    // Observer les sections
    document.querySelectorAll('.learn-content section').forEach(section => {
        observer.observe(section);
    });

    // Gestion des clics sur le menu
    document.querySelectorAll('.learn-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                showSection(targetId);
            }
        });
    });
});
