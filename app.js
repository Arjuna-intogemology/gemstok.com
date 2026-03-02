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
 ---------------------------------------------------------*/
window.handleUserClick = function() {
    const nav = document.querySelector('.gemstok-nav');
    const token = localStorage.getItem('gemstok_token');
    
    // PRIORITY 1: If nav is scrolled, smooth scroll to top first
    if (nav && nav.classList.contains('scrolled')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return; // Exit after scroll
    } 

    // PRIORITY 2: If at top, handle the Auth redirection
    if (token) {
        window.location.href = 'profile.html';
    } else {
        window.location.href = 'signin.html';
    }
};

/**------------------------------------------------
 * [CORE: INITIALIZATION]
 -------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Identify which page we are on to load correct fragments
    const path = window.location.pathname;

    let partsToLoad = [
        loadPart('header-part', 'parts/header.html'),
        loadPart('footer-part', 'parts/footer.html')
    ];

    // 2. Page-Specific Loading Logic
    if (path.includes('signin.html')) {
        partsToLoad.push(loadPart('signin-part', 'parts/signin-fragment.html'));
    } else if (path.includes('profile.html')) {
        partsToLoad.push(loadPart('profile-part', 'parts/profile-fragment.html'));
    } else if (path.includes('contact.html')) {
        partsToLoad.push(loadPart('contact-part', 'parts/contact-fragment.html'));
    } else if (path.includes('legal.html')) {
        partsToLoad.push(loadPart('legal-part', 'parts/legal-fragment.html'));
    } else {
        // Default: Index/Home parts
        partsToLoad.push(
            loadPart('hero-part', 'parts/hero.html'),
            loadPart('products-part', 'parts/products.html'),
            loadPart('agency-part', 'parts/agency.html'),
            loadPart('directory-part', 'parts/directory.html')
        );
    }

    // 3. Fire Engine
    Promise.all(partsToLoad).then(() => {
        console.log("Gemstok Engine: All Systems Online");
        initNavigationSystem(); 
        updateAuthUI(); // New: Refresh UI based on login status
    });
});

/**------------------------------------------------
 * [MODULE: AUTH UI REFINEMENT]
 -------------------------------------------------*/
function updateAuthUI() {
    const token = localStorage.getItem('gemstok_token');
    const userBtn = document.querySelector('.nav-user-icon');
    
    if (token && userBtn) {
        userBtn.style.color = 'var(--neon-blue)';
        userBtn.style.filter = 'drop-shadow(0 0 5px var(--neon-blue))';
    }
}