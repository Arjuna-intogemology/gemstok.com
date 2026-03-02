/**
 * ==============================================================================
 * GEMSTOK CORE ENGINE
 * Modular Loader & Initialization
 * ==============================================================================
 */

/**
 * loadPart
 * Fetches an HTML file and injects it into a specific ID.
 * This is what makes Gemstok.com modular.
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

/**
 * INITIALIZATION
 * Runs when the browser is ready.
 * Loads parts in order to ensure the brand loads correctly for SMM traffic.
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // We load the structural parts first
    Promise.all([
        loadPart('header-part', 'header.html'),
        loadPart('hero-part', 'hero.html'),
        loadPart('products-part', 'products.html'),
        loadPart('agency-part', 'agency.html'),
        loadPart('directory-part', 'directory.html'),
        loadPart('footer-part', 'footer.html')
    ]).then(() => {
        console.log("Gemstok Engine: All Systems Online");
        
        // This is where we will initialize specific logic for 
        // the Agency or Hero sections once they are built.
    });
    /* ------------------------------------------------------------------------------
                [HEADER part ]  SYSTEM: NAVIGATION & INTERACTION
   ------------------------------------------------------------------------------ */
function initNavigationSystem() {
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

/**
 * handleUserClick
 * Logic for the User Icon: If scrolled, return to top. If at top, open Signup.
 */
function handleUserClick() {
    const nav = document.querySelector('.gemstok-nav');
    
    if (nav && nav.classList.contains('scrolled')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // This is where your Vault ID / trade-inGEM logic will eventually go
        alert("Vault Initialization Protocol Starting...");
    }
}
});
