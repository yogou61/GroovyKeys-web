// Script de diagnostic et de correction pour les mu00e9lodies manquantes
// Ce script vu00e9rifie spu00e9cifiquement les mu00e9lodies Say So et Circles

document.addEventListener('DOMContentLoaded', () => {
    console.log('Script de diagnostic des mu00e9lodies chargu00e9');
    
    // Attendre que tout soit chargu00e9
    setTimeout(() => {
        console.log('Du00e9marrage du diagnostic des mu00e9lodies...');
        
        // Vu00e9rifier que l'objet melodies existe
        if (typeof melodies === 'undefined') {
            console.error('ERREUR: L\'objet melodies n\'est pas du00e9fini');
            return;
        }
        
        // Vu00e9rifier les mu00e9lodies spu00e9cifiques
        const melodiesToCheck = ['say_so', 'circles'];
        const missingMelodies = [];
        
        melodiesToCheck.forEach(melodyName => {
            if (!melodies[melodyName]) {
                console.warn(`Mu00e9lodie ${melodyName} manquante, ajout en cours...`);
                missingMelodies.push(melodyName);
            } else {
                console.log(`Mu00e9lodie ${melodyName} trouvu00e9e: ${melodies[melodyName].name}`);
            }
        });
        
        // Ajouter les mu00e9lodies manquantes
        if (missingMelodies.includes('say_so')) {
            melodies.say_so = {
                name: "Say So (Doja Cat)",
                tempo: 111,
                notes: [
                    ['D4', 200], ['F4', 200], ['G4', 200], ['A4', 200], ['C5', 400],
                    ['D4', 200], ['F4', 200], ['G4', 200], ['A4', 200], ['C5', 400],
                    ['D5', 200], ['C5', 200], ['A4', 200], ['G4', 200], ['F4', 400],
                    ['D5', 200], ['C5', 200], ['A4', 200], ['G4', 200], ['F4', 400],
                    ['D4', 200], ['F4', 200], ['G4', 200], ['A4', 200], ['C5', 400],
                    ['D4', 200], ['F4', 200], ['G4', 200], ['A4', 200], ['C5', 400]
                ]
            };
            console.log('Mu00e9lodie Say So ajoutu00e9e avec succu00e8s');
        }
        
        if (missingMelodies.includes('circles')) {
            melodies.circles = {
                name: "Circles (Post Malone)",
                tempo: 120,
                notes: [
                    ['E4', 200], ['G4', 200], ['A4', 200], ['B4', 200], ['D5', 400],
                    ['E4', 200], ['G4', 200], ['A4', 200], ['B4', 200], ['D5', 400],
                    ['E5', 200], ['D5', 200], ['B4', 200], ['A4', 200], ['G4', 400],
                    ['E5', 200], ['D5', 200], ['B4', 200], ['A4', 200], ['G4', 400],
                    ['E4', 200], ['G4', 200], ['A4', 200], ['B4', 200], ['D5', 400],
                    ['E4', 200], ['G4', 200], ['A4', 200], ['B4', 200], ['D5', 400]
                ]
            };
            console.log('Mu00e9lodie Circles ajoutu00e9e avec succu00e8s');
        }
        
        // Mettre u00e0 jour le menu du00e9roulant si nu00e9cessaire
        if (missingMelodies.length > 0) {
            const melodySelect = document.getElementById('melody-select');
            if (melodySelect) {
                console.log('Mise u00e0 jour du menu du00e9roulant...');
                // Vu00e9rifier que les options existent du00e9ju00e0 dans le menu
                const existingOptions = Array.from(melodySelect.options).map(opt => opt.value);
                
                missingMelodies.forEach(melodyName => {
                    if (!existingOptions.includes(melodyName)) {
                        console.warn(`Option ${melodyName} manquante dans le menu, ajout en cours...`);
                        // Trouver le groupe Contemporary
                        const contemporaryGroup = Array.from(melodySelect.getElementsByTagName('optgroup')).find(group => 
                            group.label === 'Contemporaines');
                        
                        if (contemporaryGroup) {
                            const option = document.createElement('option');
                            option.value = melodyName;
                            option.textContent = melodies[melodyName].name;
                            contemporaryGroup.appendChild(option);
                            console.log(`Option ${melodyName} ajoutu00e9e au menu`);
                        } else {
                            console.error('Groupe Contemporaines non trouvu00e9 dans le menu');
                        }
                    }
                });
            } else {
                console.error('Menu du00e9roulant non trouvu00e9');
            }
        }
        
        console.log('Diagnostic des mu00e9lodies terminu00e9');
        console.log('Mu00e9lodies disponibles:', Object.keys(melodies));
    }, 3000); // Attendre 3 secondes pour s'assurer que tout est chargu00e9
});
