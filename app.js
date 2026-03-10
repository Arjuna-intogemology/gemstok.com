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
loadPart('signin-part', 'parts/signin-fragment.html');

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
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        
        console.log("VAULT: Accessing encrypted session...");

        // 1. Set the Mock Token (The Key)
        localStorage.setItem('gemstok_token', 'MVP_SESSION_2026_ACTIVE');

        // 2. UI UPDATE: Trigger toggle immediately while header is present
        if (typeof updateAuthUI === 'function') {
            updateAuthUI(); 
        }

        // 3. DATA HYDRATION: Fill profile data if needed
        if (typeof hydrateProfile === 'function') {
            hydrateProfile();
        }

        // 4. MODAL FLOW: Close the gate last
        if (window.closeAuthModal) {
            window.closeAuthModal();
        }
        
        console.log("Vault Access Granted. UI Synced.");
    }
});

/**------------------------------------------------
 * [Module 5 : CORE: INITIALIZATION]
 -------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    let partsToLoad = [
        loadPart('header-part', 'parts/header.html').then(() => {
            // Primary trigger for header UI states
            if (typeof updateAuthUI === 'function') updateAuthUI();
            // Boot GemTrace background
            const path = window.location.pathname;
        if (path.includes('contact.html') || path.includes('profile.html')) {
            const css = document.createElement('link');
            css.rel  = 'stylesheet';
            css.href = 'gemtrace_map_animation/gemtrace-bg.css';
            document.head.appendChild(css);
            
            const s = document.createElement('script');
            s.src = 'gemtrace_map_animation/gemtrace-bg.js';
            document.body.appendChild(s);
    }
        }),
        loadPart('footer-part', 'parts/footer.html')
    ];

    if (path.includes('profile.html')) {
        partsToLoad.push(loadPart('profile-part', 'parts/profile-fragment.html'));
    } else if (path.includes('contact.html')) {
        partsToLoad.push(loadPart('contact-part', 'parts/contact-fragment.html').then(() => {
            console.log("Contact Page Fully Assembled");
        }));
    } else if (path.includes('legal.html')) {
        partsToLoad.push(loadPart('legal-part', 'parts/legal-fragment.html'));
    } else if (path.includes('register.html')) {
        // This targets the ID in your register.html shell
        partsToLoad.push(loadPart('register-part', 'parts/register-fragment.html').then(() => {
            console.log("Registration Page Fully Assembled");
        }));
    } else {
        // DEFAULT: Load Homepage Fragments
        partsToLoad.push(
            loadPart('hero-part', 'parts/hero.html'),
            loadPart('products-part', 'parts/products.html'),
            loadPart('agency-part', 'parts/agency.html'),
            loadPart('directory-part', 'parts/directory.html')
        );
    }

    Promise.all(partsToLoad).then(() => {
        console.log("Gemstok Engine: All Systems Online");
        initNavigationSystem(); 
        
        setTimeout(() => {
            if (typeof hydrateProfile === 'function') hydrateProfile();
        }, 50);
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
 ------------------------------------------------------------------*/

// 1. Close Logic (Keeping it clean)
window.closeAuthModal = function() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        console.log("Vault Gate: Secured/Closed.");
    }
};

// 2. Smart Loading Logic
// We wait until the 'signin-part' div actually exists in the DOM
const waitForGate = setInterval(() => {
    const gateTarget = document.getElementById('signin-part');
    
    if (gateTarget) {
        loadPart('signin-part', 'parts/signin-fragment.html')
            .then(() => {
                console.log("Vault Gate: Content Injected.");
                clearInterval(waitForGate); // Stop looking once loaded
            })
            .catch(err => {
                console.error("Vault Gate Load Error:", err);
                clearInterval(waitForGate);
            });
    }
}, 100); // Checks every 100ms

/**--------------------------------------------------------
 * [MODULE 8: LOGOUT & UI TOGGLE - FORCED VISIBILITY]
 ---------------------------------------------------------*/
function updateAuthUI() {
    const token = localStorage.getItem('gemstok_token');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn && logoutBtn) {
        if (token) {
            // Force Logout button to be visible and Login to be gone
            loginBtn.setAttribute('style', 'display: none !important');
            logoutBtn.setAttribute('style', 'display: flex !important');
            console.log("Auth UI: Token found. Logout button forced to visible.");
        } else {
            // Force Login button to be visible and Logout to be gone
            loginBtn.setAttribute('style', 'display: flex !important');
            logoutBtn.setAttribute('style', 'display: none !important');
            console.log("Auth UI: No token. Login button forced to visible.");
        }
    } else {
        console.error("Auth UI: Buttons not found in the DOM.");
    }
}

window.handleLogout = function() {
    console.log("Vault Session: Terminating...");
    // 1. Remove the token
    localStorage.removeItem('gemstok_token');
    
    // 2. Update UI
    updateAuthUI();
    
    // 3. Redirect to home (optional, but recommended for security)
    window.location.href = 'index.html';
};

/**--------------------------------------------------------
 * [MODULE 9: TIER SELECTOR]
 ---------------------------------------------------------*/
window.toggleTierDropdown = function() {
    document.getElementById('tierOptions').classList.toggle('open');
}

window.selectTier = function(value, label) {
    document.getElementById('tierSelected').innerText = label;
    document.getElementById('tierOptions').classList.remove('open');

    const link = document.getElementById('register-link');
    const authBtn = document.querySelector('#login-form .auth-btn');
    const socialBtns = document.querySelectorAll('.social-btn');
    
    // Select the "Forgot Access Key" link (the first <a> in the footer)
    const forgotLink = document.querySelector('.auth-footer a:first-child');

    if (value === 'explorer') {
        // RESET STATE
        if(forgotLink) forgotLink.style.display = 'inline-block';
        link.style.animation = '';
        link.innerHTML = 'No account? <a href="register.html">Register GEMSTOK ID</a>';
        
        // Enable Buttons
        authBtn.style.opacity = '1';
        authBtn.style.pointerEvents = 'auto';
        socialBtns.forEach(btn => {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        });
    } else {
        // UPGRADE STATE
        // 1. Vanish the forgot link
        if(forgotLink) forgotLink.style.display = 'none';

        // 2. Make the text bigger and uppercase (inline style for MVP)
        link.innerHTML = '→ <a href="register.html" style="font-size: 0.85rem; font-weight: bold; text-transform: uppercase;">Register as ' + label + '</a>';
        link.style.animation = 'flickerLink 1.5s infinite';
        
        // 3. Disable Login/Social
        authBtn.style.opacity = '0.2';
        authBtn.style.pointerEvents = 'none';
        socialBtns.forEach(btn => {
            btn.style.opacity = '0.2';
            btn.style.pointerEvents = 'none';
        });
    }
}
window.showForgotView = function() {
    document.getElementById('login-form').style.display = 'none';
    document.querySelector('.social-auth').style.display = 'none';
    document.querySelector('.tier-select').style.display = 'none';
    document.querySelector('.auth-footer').style.display = 'none';
    document.getElementById('forgot-view').style.display = 'block';
}

window.showLoginView = function() {
    document.getElementById('login-form').style.display = 'flex';
    document.querySelector('.social-auth').style.display = 'flex';
    document.querySelector('.tier-select').style.display = 'block';
    document.querySelector('.auth-footer').style.display = 'flex';
    document.getElementById('forgot-view').style.display = 'none';
    document.getElementById('forgot-msg').style.display = 'none';
    document.getElementById('forgot-email').value = '';
}

window.submitForgotKey = function() {
    document.getElementById('forgot-msg').style.display = 'block';
    document.querySelector('#forgot-view .auth-btn').innerText = '✓ DONE';
    document.querySelector('#forgot-view .auth-btn').style.pointerEvents = 'none';
    document.querySelector('#forgot-view .auth-btn').style.opacity = '0.5';
}

/**--------------------------------------------------------
 * [MODULE 10: REGISTRATION]
 ---------------------------------------------------------*/
 window.activateTier = function(tier) {
    const tiers = ['student', 'trader', 'business'];
    
    // Reset all buttons
    tiers.forEach(t => {
        const btn = document.getElementById('btn-' + t);
        if (btn) {
            btn.classList.remove('active');
        }
    });

    // Activate selected
    document.getElementById('btn-' + tier).classList.add('active');
    localStorage.setItem('gemstok_tier', tier);

    // Show correct fields
    document.getElementById('trader-fields').style.display = tier === 'trader' || tier === 'business' ? 'block' : 'none';
    document.getElementById('business-fields').style.display = tier === 'business' ? 'block' : 'none';

    // Show submit
    document.getElementById('reg-submit').style.display = 'block';
}
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'register-form') {
        e.preventDefault();

        const tier = localStorage.getItem('gemstok_tier');

        // Base validation
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const country = document.getElementById('reg-country').value.trim();

        if (!name || !email || !country) {
            showRegError('NAME, EMAIL AND COUNTRY ARE REQUIRED.');
            return;
        }

        // Trader validation
        if (tier === 'trader' || tier === 'business') {
            const phone = document.getElementById('reg-phone').value.trim();
            const town = document.getElementById('reg-town').value.trim();
            if (!phone || !town) {
                showRegError('PHONE AND TOWN ARE REQUIRED FOR TRADER ACCESS.');
                return;
            }
        }

        // Business validation
        if (tier === 'business') {
            const bizname = document.getElementById('reg-bizname').value.trim();
            const brdoc = document.getElementById('reg-brdoc').files.length;
            if (!bizname || !brdoc) {
                showRegError('BUSINESS NAME AND REGISTRATION DOC ARE REQUIRED.');
                return;
            }
        }

        // All good — MVP mock submit
        showRegSuccess();
    }
});

function showRegError(msg) {
    let el = document.getElementById('reg-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'reg-msg';
        el.style.cssText = 'margin-top:15px; font-size:0.65rem; letter-spacing:2px; text-align:center;';
        document.getElementById('reg-submit').after(el);
    }
    el.style.color = '#ff4444';
    el.innerText = msg;
}

function showRegSuccess() {
    let el = document.getElementById('reg-msg');
    if (!el) {
        el = document.createElement('div');
        el.id = 'reg-msg';
        el.style.cssText = 'margin-top:15px; font-size:0.65rem; letter-spacing:2px; text-align:center;';
        document.getElementById('reg-submit').after(el);
    }
    el.style.color = 'var(--neon-blue)';
    el.innerText = 'GEMSTOK ID INITIALIZED. WELCOME TO THE NETWORK.';
    document.getElementById('reg-submit').style.opacity = '0.3';
    document.getElementById('reg-submit').style.pointerEvents = 'none';
}