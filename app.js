/**
 * ==============================================================================
 * GEMSTOK CORE ENGINE
 * ==============================================================================
 */

/**
 * [MODULE: COMPONENT LOADER]
 * Fetches HTML fragments and injects them into index.html slots.
 */
function loadPart(id, file) {
    return fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Engine Error: Could not load ${file}`);
            return response.text();
        })
        .then(data => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = data;
            }
        })
        .catch(err => console.error(err));
}

/**---------------------------------------------------------------------
 * [MODULE: HEADER & NAVIGATION]
 * Logic for the sticky header transformation and scroll behavior.
 -----------------------------------------------------------------------*/
function initNavigationSystem() {
    console.log("Navigation System: Active");
    
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.gemstok-nav');
        if (nav) {
            // If scrolled > 50px, activate the "Scrolled" state
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }
    });
}

/**--------------------------------------------------------
 * [MODULE: USER ACTIONS]
 * Logic for the Vault ID / User icon.
 * Global scope so HTML onclick can reach it.
 ---------------------------------------------------------*/
window.handleUserClick = function() {
    const nav = document.querySelector('.gemstok-nav');
    
    if (nav && nav.classList.contains('scrolled')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        alert("Vault Initialization Protocol Starting...");
    }
};

/**------------------------------------------------
 * [CORE: INITIALIZATION]
 * Wakes up the engine once the DOM is ready.
 -------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    
    // Load all structural parts in parallel
    Promise.all([
        loadPart('header-part', 'header.html'),
        loadPart('hero-part', 'hero.html'),
        loadPart('products-part', 'products.html'),
        loadPart('agency-part', 'agency.html'),
        loadPart('directory-part', 'directory.html'),
        loadPart('footer-part', 'footer.html')
    ]).then(() => {
        console.log("Gemstok Engine: All Systems Online");
        
        // Activate specialized modules
        initNavigationSystem(); 
    });
    
});