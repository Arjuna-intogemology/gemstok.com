// This is the "Telephone Line" to your Vault
const VAULT_URL = "http://gemstok-vault.local/wp-json";

/**
 * ==============================================================================
 * GEMSTOK CORE ENGINE
 * ==============================================================================
 */

/**----------------------------------------------------------------
 * [MODULE 1: COMPONENT LOADER]
 * Fetches HTML fragments and injects them into index.html slots.
 ------------------------------------------------------------------*/
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
// This ensures the Login Gate is always loaded in the background
loadPart('auth-modal', 'fragments/signin-fragment.html');

/**---------------------------------------------------------------------
 * [MODULE 2: Scroll & NAVIGATION]
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
 * [MODULE 3: USER-icon ACTIONS]
 * Logic for the Vault ID / User icon.
 ---------------------------------------------------------*/
window.handleUserClick = function() {
    const nav = document.querySelector('.gemstok-nav');
    const token = localStorage.getItem('gemstok_token');
    
    // PRIORITY 1: If nav is scrolled, smooth scroll to top first
    if (nav && nav.classList.contains('scrolled')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return; 
    } 

    // PRIORITY 2: Open Modal instead of Redirecting
    if (token) {
        // If logged in, go to profile
        window.location.href = 'profile.html';
    } else {
        // Instead of 'signin.html', we wake up the overlay
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            console.log("Vault Gate: Modal Activated.");
        }
    }
};

/**--------------------------------------------------------
 * [MODULE 4: AUTHENTICATION ENGINE]
 * Handles the "Gate" logic for signing in.
 ---------------------------------------------------------*/
document.addEventListener('submit', function (e) {
    // Check if the element that was submitted has the ID 'login-form'
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        
        console.log("VAULT: Accessing encrypted session...");

        // 1. Set the Mock Token (The Key)
        localStorage.setItem('gemstok_token', 'MVP_SESSION_2026_ACTIVE');

        // 2. Redirect immediately
        window.location.href = 'profile.html';
    }
});

/**------------------------------------------------
 * [Module 5 : CORE: INITIALIZATION]
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
        hydrateProfile();
    });
});

/**------------------------------------------------
 * [MODULE 6: DATA HYDRATION]
 * Fills the UI with real data if a token exists.
 -------------------------------------------------*/
async function hydrateProfile() {
    const token = localStorage.getItem('gemstok_token');
    if (!token) return;

    // TARGET: The profile fragment's name and rank
    const nameDisplay = document.querySelector('.user-meta h2');
    const rankDisplay = document.querySelector('.rank-tag');

    if (nameDisplay) {
        // MOCK DATA: Later, this will be: const data = await fetchUserData(token);
        const userData = {
            username: "TRADER_ALPHA_01",
            rank: "GEM ENTREPRENEUR",
            progress: "40%"
        };

        nameDisplay.innerText = userData.username;
        rankDisplay.innerText = userData.rank;
        
        console.log("Vault Data Decrypted: User Identified.");
    }
}

/**----------------------------------------------------------------
 * [Module 7 : SITE EXECUTION]
 * Running the engines defined in the modules above.
 ------------------------------------------------------------------*/

// Always load the Gate
loadPart('auth-modal', 'fragments/signin-fragment.html');

// Load other fragments...
loadPart('nav-placeholder', 'fragments/nav.html');

// logic for closing the vault
window.closeAuthModal = function() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        console.log("Vault Gate: Secured/Closed.");
    }
};