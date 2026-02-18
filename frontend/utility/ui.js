// ============================================
// QUACKTOOLS — UI & Interaction
// Modals, Filters, Drag & Drop, Theme, Search, Recent Tools
// ============================================

// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
});

// Close modal with ESC key
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// ============================================
// UI UTILITY FUNCTIONS
// ============================================

// Toggle FAQ section (removed - now using modal)
// Toggle About section (removed - now using modal)

// Toggle all tools visibility
// Helper: update the visible tool count badge in the command bar
function updateVisibleToolCount() {
    const cards = document.querySelectorAll('.tool-card');
    let count = 0;
    cards.forEach(card => {
        if (!card.classList.contains('hidden') && !card.classList.contains('search-hidden')) {
            count++;
        }
    });
    const countEl = document.getElementById('visibleToolCount');
    if (countEl) countEl.textContent = count;
}

function toggleAllTools() {
    const checkboxes = document.querySelectorAll('[id^="toggle-"]');
    const btn = document.getElementById('toggleAllBtn');
    const cmd = document.getElementById('termCommand');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    
    checkboxes.forEach(checkbox => {
        const toolId = checkbox.id.replace('toggle-', '');
        const tool = document.getElementById(toolId);
        
        if (anyUnchecked) {
            // Check all - show all tools
            checkbox.checked = true;
            if (tool) tool.classList.remove('hidden');
        } else {
            // Uncheck all - hide all tools
            checkbox.checked = false;
            if (tool) tool.classList.add('hidden');
        }
    });
    
    // Typing animation + update command text
    btn.classList.remove('typing');
    void btn.offsetWidth; // force reflow
    btn.classList.add('typing');
    setTimeout(function() { btn.classList.remove('typing'); }, 350);

    if (anyUnchecked) {
        // We just showed all, so next action is "hide"
        btn.classList.add('tools-visible');
        cmd.textContent = 'hide --all';
    } else {
        // We just hid all, so next action is "show"
        btn.classList.remove('tools-visible');
        cmd.textContent = 'show --all';
    }
    
    saveToolVisibility();
    updateVisibleToolCount();
}

// ============================================
// CATEGORY FILTER SYSTEM
// ============================================

function filterByCategory(category) {
    // Update active tag visual
    document.querySelectorAll('.category-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    document.getElementById('filter-' + category).classList.add('active');
    
    // Get all tool cards and checkboxes
    const tools = document.querySelectorAll('.tool-card');
    
    if (category === 'all') {
        // Check all checkboxes
        tools.forEach(tool => {
            const checkbox = document.getElementById('toggle-' + tool.id);
            if (checkbox) {
                checkbox.checked = true;
                tool.classList.remove('hidden');
            }
        });
    } else {
        // Filter by category - check matching, uncheck non-matching
        tools.forEach(tool => {
            const categories = tool.getAttribute('data-categories') || '';
            const checkbox = document.getElementById('toggle-' + tool.id);
            
            if (checkbox) {
                if (categories.includes(category)) {
                    checkbox.checked = true;
                    tool.classList.remove('hidden');
                } else {
                    checkbox.checked = false;
                    tool.classList.add('hidden');
                }
            }
        });
    }
    
    // Update toggle all button
    updateToggleAllButton();
    updateVisibleToolCount();
    // Don't save - category filters are temporary
}

// ============================================
// USER TYPE FILTER SYSTEM
// ============================================

function filterByUserType(usertype) {
    // Update active tag visual
    document.querySelectorAll('.usertype-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    document.getElementById('userfilter-' + usertype).classList.add('active');
    
    // Get all tool cards and checkboxes
    const tools = document.querySelectorAll('.tool-card');
    
    if (usertype === 'all') {
        // Check all checkboxes
        tools.forEach(tool => {
            const checkbox = document.getElementById('toggle-' + tool.id);
            if (checkbox) {
                checkbox.checked = true;
                tool.classList.remove('hidden');
            }
        });
    } else {
        // Filter by user type - check matching, uncheck non-matching
        tools.forEach(tool => {
            const usertypes = tool.getAttribute('data-usertypes') || '';
            const checkbox = document.getElementById('toggle-' + tool.id);
            
            if (checkbox) {
                if (usertypes.includes(usertype)) {
                    checkbox.checked = true;
                    tool.classList.remove('hidden');
                } else {
                    checkbox.checked = false;
                    tool.classList.add('hidden');
                }
            }
        });
    }
    
    // Update toggle all button
    updateToggleAllButton();
    updateVisibleToolCount();
    // Don't save - user type filters are temporary
}

// ============================================
// FILTER MODE TOGGLE (Categories <-> User Types)
// ============================================

let currentFilterMode = 'category'; // Track current mode

function toggleFilterMode() {
    const categoryFilters = document.getElementById('category-filters');
    const usertypeFilters = document.getElementById('usertype-filters');
    const circle = document.getElementById('toggle-circle');
    const labelCategory = document.getElementById('label-category');
    const labelUsertype = document.getElementById('label-usertype');
    
    if (currentFilterMode === 'category') {
        // Switch to User Type
        currentFilterMode = 'usertype';
        
        // Show user type filters
        categoryFilters.style.display = 'none';
        usertypeFilters.style.display = 'flex';
        
        // Animate circle to right
        circle.style.transform = 'translateX(22px)';
        
        // Update label colors
        labelCategory.style.color = 'var(--text-secondary)';
        labelUsertype.style.color = 'var(--primary-color)';
        
        // Reset to "All" when switching
        filterByUserType('all');
    } else {
        // Switch to Categories
        currentFilterMode = 'category';
        
        // Show category filters
        categoryFilters.style.display = 'flex';
        usertypeFilters.style.display = 'none';
        
        // Animate circle to left
        circle.style.transform = 'translateX(0)';
        
        // Update label colors
        labelCategory.style.color = 'var(--primary-color)';
        labelUsertype.style.color = 'var(--text-secondary)';
        
        // Reset to "All" when switching
        filterByCategory('all');
    }
}

// Update toggle all button text
function updateToggleAllButton() {
    const checkboxes = document.querySelectorAll('[id^="toggle-"]');
    const btn = document.getElementById('toggleAllBtn');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    
    if (btn) {
        const cmd = document.getElementById('termCommand');
        
        if (cmd) {
            if (anyUnchecked) {
                btn.classList.remove('tools-visible');
                cmd.textContent = 'show --all';
            } else {
                btn.classList.add('tools-visible');
                cmd.textContent = 'hide --all';
            }
        }
    }
}

// Toggle individual tool visibility
function toggleToolVisibility(toolId) {
    const tool = document.getElementById(toolId);
    const checkbox = document.getElementById('toggle-' + toolId);
    
    if (tool && checkbox) {
        if (checkbox.checked) {
            tool.classList.remove('hidden');
        } else {
            tool.classList.add('hidden');
        }
        
        updateToggleAllButton();
        saveToolVisibility();
        updateVisibleToolCount();
    }
}

// Save tool visibility to localStorage
function saveToolVisibility() {
    const checkboxes = document.querySelectorAll('[id^="toggle-"]');
    const visibility = {};
    
    checkboxes.forEach(checkbox => {
        const toolId = checkbox.id.replace('toggle-', '');
        visibility[toolId] = checkbox.checked;
    });
    
    localStorage.setItem('toolVisibility', JSON.stringify(visibility));
}

// Load tool visibility from localStorage
function loadToolVisibility() {
    const saved = localStorage.getItem('toolVisibility');
    if (saved) {
        const visibility = JSON.parse(saved);
        Object.keys(visibility).forEach(toolId => {
            const checkbox = document.getElementById('toggle-' + toolId);
            const tool = document.getElementById(toolId);
            
            if (checkbox && tool) {
                checkbox.checked = visibility[toolId];
                if (!visibility[toolId]) {
                    tool.classList.add('hidden');
                }
            }
        });
        // Keep button as "Hide All" regardless of saved state
    }
}

// (Tool initialization consolidated into main DOMContentLoaded above)

// ============================================
// DRAG AND DROP FUNCTIONALITY
// ============================================

let draggedElement = null;
let dropTarget = null;

function initDragAndDrop() {
    const toolCards = document.querySelectorAll('.tool-card');
    
    toolCards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragleave', handleDragLeave);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.id);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove drag-over class from all cards
    document.querySelectorAll('.tool-card').forEach(card => {
        card.classList.remove('drag-over');
    });
    
    draggedElement = null;
    dropTarget = null;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
        dropTarget = this;
    }
}

function handleDragOver(e) {
    e.preventDefault(); // This is critical!
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragLeave(e) {
    // Only remove if we're actually leaving (not entering a child element)
    if (e.target === this) {
        this.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    this.classList.remove('drag-over');
    
    if (draggedElement && draggedElement !== this) {
        // Get the grid
        const grid = document.getElementById('toolsGrid');
        const allCards = Array.from(grid.children);
        const draggedIndex = allCards.indexOf(draggedElement);
        const targetIndex = allCards.indexOf(this);
        
        // Insert dragged element before or after target
        if (draggedIndex < targetIndex) {
            // Moving forward - insert after target
            grid.insertBefore(draggedElement, this.nextSibling);
        } else {
            // Moving backward - insert before target
            grid.insertBefore(draggedElement, this);
        }
        
        // Save the new order
        saveToolOrder();
        
        if (CONFIG.DEBUG) console.log('Tool moved and saved!');
    }
    
    return false;
}

function saveToolOrder() {
    const grid = document.getElementById('toolsGrid');
    const order = Array.from(grid.children).map(card => card.id);
    localStorage.setItem('toolOrder', JSON.stringify(order));
    if (CONFIG.DEBUG) console.log('Saved order:', order);
}

function loadToolOrder() {
    const savedOrder = localStorage.getItem('toolOrder');
    
    if (savedOrder) {
        try {
            const order = JSON.parse(savedOrder);
            const grid = document.getElementById('toolsGrid');
            
            if (CONFIG.DEBUG) console.log('Loading saved order:', order);
            
            // Reorder elements based on saved order
            order.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    grid.appendChild(element);
                }
            });
        } catch (e) {
            console.error('Error loading tool order:', e);
        }
    }
}

function resetLayout() {
    // Clear saved order
    localStorage.removeItem('toolOrder');
    
    // Reload page to restore default order
    location.reload();
}

// ============================================
// THEME SWITCHING FUNCTIONALITY
// ============================================

const themes = {
    'dark': {
        primaryStart: '#F2C200',
        primaryEnd: '#e6b800',
        primary: '#F2C200',
        cardBg: 'rgba(21, 26, 34, 0.70)',
        bgStart: '#0F1114',
        bgEnd: '#0B0D10',
        textPrimary: '#E9EEF5',
        textSecondary: '#B8C0CC',
        border: '#232A35',
        inputBg: '#10141A',
        outputBg: '#10141A',
        borderRadius: '16px',
        cardOpacity: '0.70'
    },
    'light': {
        primaryStart: '#F2C200',
        primaryEnd: '#e6b800',
        primary: '#0F1114',
        cardBg: '#ffffff',
        bgStart: '#F0F2F5',
        bgEnd: '#E8EAEF',
        textPrimary: '#0F1114',
        textSecondary: '#555',
        border: '#D0D5DD',
        inputBg: '#ffffff',
        outputBg: '#F8F9FB',
        borderRadius: '16px',
        cardOpacity: '1'
    }
};

function changeTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--primary-gradient-start', theme.primaryStart);
    root.style.setProperty('--primary-gradient-end', theme.primaryEnd);
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--card-background', theme.cardBg);
    root.style.setProperty('--background-gradient-start', theme.bgStart);
    root.style.setProperty('--background-gradient-end', theme.bgEnd);
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--input-background', theme.inputBg);
    root.style.setProperty('--output-background', theme.outputBg);
    root.style.setProperty('--border-radius', theme.borderRadius);
    root.style.setProperty('--card-opacity', theme.cardOpacity);

    localStorage.setItem('selectedTheme', themeName);
    
    if (themeName === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

function toggleTheme() {
    const currentTheme = localStorage.getItem('selectedTheme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    changeTheme(newTheme);
}

// ============================================
// SITE INFO SECTION
// ============================================

function toggleSiteInfo() {
    const content = document.getElementById('siteInfoContent');
    const toggle = document.getElementById('siteInfoToggle');
    
    if (content && toggle) {
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
            toggle.textContent = '+';
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
            toggle.textContent = '+';
        }
    }
}

function toggleFAQSection() {
    const container = document.getElementById('faqQuestionsContainer');
    const toggle = document.getElementById('faqSectionToggle');
    
    if (container && toggle) {
        if (container.classList.contains('expanded')) {
            container.classList.remove('expanded');
            toggle.classList.remove('expanded');
            toggle.textContent = '+';
        } else {
            container.classList.add('expanded');
            toggle.classList.add('expanded');
            toggle.textContent = '+';
        }
    }
}

function toggleFAQ(questionNumber) {
    const answer = document.getElementById('faqAnswer' + questionNumber);
    const toggle = document.getElementById('faqToggle' + questionNumber);
    
    if (answer && toggle) {
        if (answer.classList.contains('expanded')) {
            answer.classList.remove('expanded');
            toggle.classList.remove('expanded');
            toggle.textContent = '+';
        } else {
            answer.classList.add('expanded');
            toggle.classList.add('expanded');
            toggle.textContent = '+';
        }
    }
}

function clearLocalSettings() {
    if (confirm('This will clear all saved settings including tool visibility, layout order, and theme preferences. Continue?')) {
        localStorage.clear();
        showToast('All settings cleared! Reloading...', 'success', 2000);
        setTimeout(() => window.location.reload(), 1500);
    }
}

// Theme loading is handled in main DOMContentLoaded above

// ============================================
// CONTACT FORM
// ============================================

// Form load time is set in main DOMContentLoaded above

// Handle contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Anti-spam checks
        const honeypot = document.getElementById('contactHoneypot').value;
        if (honeypot) {
            if (CONFIG.DEBUG) console.log('Spam detected (honeypot)');
            return;
        }
        
        const loadTime = document.getElementById('formLoadTime').value;
        const submitTime = Date.now();
        if (submitTime - loadTime < 3000) {
            showToast('Please wait a moment before submitting.', 'error');
            return;
        }
        
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const message = document.getElementById('contactMessage').value;
        const statusDiv = document.getElementById('contactFormStatus');
        
        try {
            // Using FormSubmit.co
            const response = await fetch('https://formsubmit.co/mcv.works1@gmail.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    message: message
                })
            });
            
            if (response.ok) {
                statusDiv.textContent = '✓ Message sent successfully!';
                statusDiv.style.color = 'var(--success-color)';
                statusDiv.style.display = 'block';
                contactForm.reset();
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            statusDiv.textContent = '✗ Failed to send message. Please try again.';
            statusDiv.style.color = 'var(--error-color)';
            statusDiv.style.display = 'block';
        }
    });
}

// ============================================
// CONSOLE MESSAGE
// ============================================
console.log('%c🦆 duckTyped v3.0', 'color: #F2C200; font-size: 16px; font-weight: bold;');
if (CONFIG.DEBUG) {
    console.log('%cWorker URL: ' + (WORKER_URL || 'Not configured'), 'color: #9a95a9;');
    console.log('%cType showAPIUsage() to see API statistics', 'color: #fdd207;');
}

// ============================================
// COMMAND BAR: SEARCH
// ============================================
window.addEventListener('DOMContentLoaded', function() {
    const toolSearchInput = document.getElementById('toolSearch');
    if (!toolSearchInput) return;

    let searchDebounceTimeout;
    toolSearchInput.addEventListener('input', function(e) {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(() => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.tool-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const keywords = (card.dataset.keywords || '').toLowerCase();
            const title = (card.querySelector('h2')?.textContent || '').toLowerCase();
            const desc = (card.querySelector('.tool-description')?.textContent || '').toLowerCase();
            const match = !query || keywords.includes(query) || title.includes(query) || desc.includes(query);

            if (match && !card.classList.contains('hidden')) {
                card.classList.remove('search-hidden');
                visibleCount++;
            } else if (!match) {
                card.classList.add('search-hidden');
            } else {
                // Card is hidden by toggle, don't count it
            }
        });

        // Update tool count badge
        const countEl = document.getElementById('visibleToolCount');
        if (countEl) countEl.textContent = visibleCount;

        // Show/hide no results
        const noResults = document.getElementById('noResults');
        if (noResults) noResults.classList.toggle('visible', visibleCount === 0 && query.length > 0);

        // Hide recent tools while searching
        const recentSection = document.getElementById('recentSection');
        if (recentSection) {
            const recent = JSON.parse(localStorage.getItem('qt_recent') || '[]');
            recentSection.style.display = query ? 'none' : (recent.length ? 'block' : 'none');
        }
        }, 150); // debounce delay
    });

    // Keyboard shortcut: / to focus search, Escape to clear
    document.addEventListener('keydown', function(e) {
        if (e.key === '/' && document.activeElement !== toolSearchInput
            && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            toolSearchInput.focus();
        }
        if (e.key === 'Escape' && document.activeElement === toolSearchInput) {
            clearToolSearch();
            toolSearchInput.blur();
        }
    });

    // Initialize tool count
    const allCards = document.querySelectorAll('.tool-card');
    const countEl = document.getElementById('visibleToolCount');
    if (countEl) countEl.textContent = allCards.length;

    // Initialize recent tools
    renderRecentTools();

    // Scroll shadow + scroll-to-top
    const commandBar = document.getElementById('commandBar');
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    window.addEventListener('scroll', function() {
        if (commandBar) commandBar.classList.toggle('scrolled', window.scrollY > 60);
        if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
});

function clearToolSearch() {
    const input = document.getElementById('toolSearch');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
}

// ============================================
// COMMAND BAR: CATEGORY FILTER PILLS
// ============================================
let activeCategoryFilter = 'all';

function filterByCat(btn, category) {
    activeCategoryFilter = category;

    // Update pill styles
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');

    const cards = document.querySelectorAll('.tool-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const cardCategories = (card.dataset.categories || '').split(',');
        const matchesCategory = category === 'all' || cardCategories.includes(category);

        if (matchesCategory && !card.classList.contains('hidden')) {
            card.classList.remove('search-hidden');
            visibleCount++;
        } else if (!matchesCategory) {
            card.classList.add('search-hidden');
        }
    });

    // Re-apply search filter on top of category filter
    const searchInput = document.getElementById('toolSearch');
    if (searchInput && searchInput.value.trim()) {
        const query = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.tool-card:not(.search-hidden)').forEach(card => {
            const keywords = (card.dataset.keywords || '').toLowerCase();
            const title = (card.querySelector('h2')?.textContent || '').toLowerCase();
            if (!keywords.includes(query) && !title.includes(query)) {
                card.classList.add('search-hidden');
                visibleCount--;
            }
        });
    }

    // Update count
    const countEl = document.getElementById('visibleToolCount');
    if (countEl) countEl.textContent = visibleCount;

    // No results
    const noResults = document.getElementById('noResults');
    if (noResults) noResults.classList.toggle('visible', visibleCount === 0);
}

// ============================================
// RECENT TOOLS TRACKING
// ============================================
function trackRecentTool(toolId) {
    let recent = JSON.parse(localStorage.getItem('qt_recent') || '[]');
    recent = recent.filter(id => id !== toolId);
    recent.unshift(toolId);
    recent = recent.slice(0, 6);
    localStorage.setItem('qt_recent', JSON.stringify(recent));
    renderRecentTools();
}

function renderRecentTools() {
    const section = document.getElementById('recentSection');
    const row = document.getElementById('recentRow');
    if (!section || !row) return;

    const recent = JSON.parse(localStorage.getItem('qt_recent') || '[]');
    if (!recent.length) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    row.innerHTML = '';

    const categoryIcons = {
        'security': '🔒', 'network': '🌐', 'email': '📧',
        'url': '🔗', 'qr': '📱', 'lookup': '🔍', 'web': '🔗',
        'encoding': '🔧', 'ai': '🤖', 'dev': '🛠️'
    };

    recent.forEach(toolId => {
        const card = document.getElementById(toolId);
        if (!card) return;

        const name = card.querySelector('h2')?.textContent || toolId;
        const cats = (card.dataset.categories || '').split(',');
        const icon = categoryIcons[cats[0]] || '🔧';

        const chip = document.createElement('div');
        chip.className = 'recent-tool-chip';
        chip.onclick = function() {
            // Reset category filter to all so the card is visible
            const allPill = document.querySelector('.filter-pill');
            if (allPill && activeCategoryFilter !== 'all') filterByCat(allPill, 'all');
            // Clear search
            const searchInput = document.getElementById('toolSearch');
            if (searchInput && searchInput.value) clearToolSearch();
            // Scroll to card
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.borderColor = 'rgba(242, 194, 0, 0.5)';
            card.style.boxShadow = '0 0 24px rgba(242, 194, 0, 0.15)';
            setTimeout(function() {
                card.style.borderColor = '';
                card.style.boxShadow = '';
            }, 1500);
        };
        chip.innerHTML = '<span class="chip-dot"></span>' +
            '<span class="chip-icon">' + icon + '</span>' +
            '<span class="chip-name">' + name + '</span>';
        row.appendChild(chip);
    });

    // Toggle fade indicator if chips overflow the row
    requestAnimationFrame(function() {
        section.classList.toggle('has-overflow', row.scrollWidth > row.clientWidth);
    });
}

// Track recent tool usage when buttons inside tool cards are clicked
document.addEventListener('click', function(e) {
    const card = e.target.closest('.tool-card');
    if (card && card.id) {
        const tag = e.target.tagName;
        if (tag === 'BUTTON' || (tag === 'INPUT' && e.target.type === 'submit')) {
            trackRecentTool(card.id);
        }
    }
});

// ============================================
// FILTER & CUSTOMIZE TOGGLE (matching Site Info style)
// ============================================
function toggleFilterCustomize() {
    const content = document.getElementById('filterContent');
    const toggle = document.getElementById('filterCustomizeToggle');
    if (!content || !toggle) return;

    content.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}
