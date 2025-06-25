// Global variables
let allOffers = [];
// Handle both local and GitHub Pages environments
const dataUrl = location.hostname === 'localhost' || location.hostname === '127.0.0.1' 
    ? 'data/credit_card_offers.json' 
    : '/data/credit_card_offers.json';

// Fetch offers data from JSON file
async function loadOffers() {
    try {
        console.log("Attempting to load data from:", dataUrl);
        
        const response = await fetch(dataUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Successfully loaded ${data.length} offers`);
        
        allOffers = data;
        
        // Remove loading indicator
        document.querySelector('.loading')?.remove();
        
        return data;
    } catch (error) {
        console.error("Error loading offers:", error);
        const errorMsg = `Error loading offers: ${error.message}. Please try again later.`;
        document.querySelector('.loading').textContent = errorMsg;
        
        // Add technical details for debugging (only visible in console)
        console.log("Technical details:");
        console.log("- Current URL:", window.location.href);
        console.log("- Data URL attempted:", dataUrl);
        console.log("- Error object:", error);
        
        return [];
    }
}

// Normalize card names (e.g., "Capital One" → "capitalone")
function normalizeCard(name) {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
}

// Group offers by merchant name
function organizeOffers(offers) {
    const merchantGroups = {};
    
    // Group by merchant
    offers.forEach(offer => {
        if (!merchantGroups[offer.merchant]) {
            merchantGroups[offer.merchant] = [];
        }
        
        merchantGroups[offer.merchant].push(offer);
    });
    
    return merchantGroups;
}

// Clean offer text to remove dates
function cleanOfferText(text) {
    // Remove date patterns
    text = text.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, ''); // Remove dates like 03/31/25
    text = text.replace(/expires\s+\w+\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4}/i, ''); // Expires March 31st, 2025
    text = text.replace(/expires\s+in\s+\d+\s+days?/i, ''); // Expires in 10 days
    text = text.replace(/expires\s+\w+/i, ''); // Expires today
    
    // Clean up any leftover text
    text = text.replace(/valid\s+until.*/i, '');
    text = text.replace(/through.*/i, '');
    
    // Trim whitespace and punctuation at the end
    text = text.replace(/[.,;:]\s*$/, '');
    
    return text.trim();
}

// Filter and render offers based on current checkboxes and search
function applyFiltersAndRender() {
    // Get selected card values
    const selectedCards = Array.from(document.querySelectorAll('.checkbox-option input:checked'))
        .map(checkbox => checkbox.value);
    
    // Get search term
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    // Filter by selected cards - if no cards selected, show no results
    let filteredOffers = [];
    
    if (selectedCards.length > 0) {
        filteredOffers = allOffers.filter(offer => {
            const normalizedOfferCard = normalizeCard(offer.card);
            const normalizedSelected = selectedCards.map(normalizeCard);

            // Special handling for Amex variations
            if (normalizedOfferCard.startsWith("amex") && normalizedSelected.includes("amex")) {
                return true;
            }

            // Standard card match
            return normalizedSelected.includes(normalizedOfferCard);
        });

        
        // Then filter by search term
        if (searchTerm) {
            filteredOffers = filteredOffers.filter(offer => 
                offer.merchant.toLowerCase().includes(searchTerm) ||
                offer.offer.toLowerCase().includes(searchTerm)
            );
        }
    }
    
    // Show/hide no results message
    if (filteredOffers.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('offersContainer').innerHTML = ''; // Clear offers container
    } else {
        document.getElementById('noResults').style.display = 'none';
        renderOffers(filteredOffers);
    }
}

// Render all offers
function renderOffers(offers) {
    const merchantGroups = organizeOffers(offers);
    const container = document.getElementById('offersContainer');
    container.innerHTML = '';
    
    const merchantList = document.createElement('div');
    merchantList.className = 'merchant-list';
    
    // Create a card for each merchant
    Object.keys(merchantGroups).sort().forEach(merchant => {
        const merchantOffers = merchantGroups[merchant];
        
        const merchantCard = document.createElement('div');
        merchantCard.className = 'merchant-card';
        
        // Create merchant header and toggle button
        const merchantHeader = document.createElement('div');
        merchantHeader.className = 'merchant-header';
        merchantHeader.innerHTML = `
            <div class="merchant-name">${merchant}</div>
            <button class="toggle-btn">View Offers</button>
        `;
        
        // Find best offer to display on the card
        let bestOffer = findBestOffer(merchantOffers);
        const offerPreview = document.createElement('div');
        offerPreview.className = 'offer-preview';
        offerPreview.innerHTML = `<span class="best-offer">${cleanOfferText(bestOffer)}</span>`;
        
        // Create offer details section
        const offerDetails = document.createElement('div');
        offerDetails.className = 'offer-details';
        
        // Sort offers by value (best first)
        const sortedOffers = sortOffersByValue(merchantOffers);
        
        // Add each card's offer for this merchant
        sortedOffers.forEach(offer => {
            const offerRow = document.createElement('div');
            offerRow.className = 'offer-row';
            offerRow.setAttribute('data-card', offer.card);
            
            // Don't show expiration dates, just the offer
            offerRow.innerHTML = `
                <div class="card-name">${offer.card}</div>
                <div class="offer-value">${cleanOfferText(offer.offer)}</div>
            `;
            offerDetails.appendChild(offerRow);
        });
        
        // Add toggle functionality
        merchantHeader.querySelector('.toggle-btn').addEventListener('click', function() {
            const isVisible = offerDetails.style.display === 'block';
            offerDetails.style.display = isVisible ? 'none' : 'block';
            this.textContent = isVisible ? 'View Offers' : 'Hide Offers';
        });
        
        // Assemble merchant card
        merchantCard.appendChild(merchantHeader);
        merchantCard.appendChild(offerPreview);
        merchantCard.appendChild(offerDetails);
        merchantList.appendChild(merchantCard);
    });
    
    container.appendChild(merchantList);
}

// Sort offers by value (best first)
function sortOffersByValue(offers) {
    return [...offers].sort((a, b) => {
        const aValue = getOfferValue(a.offer);
        const bValue = getOfferValue(b.offer);
        return bValue - aValue;
    });
}

// Get numerical value from an offer string
function getOfferValue(offerText) {
    // Extract percentage
    const percentMatch = offerText.match(/(\d+)%/);
    if (percentMatch) {
        return parseInt(percentMatch[1]);
    }
    
    // Extract dollar amount
    const dollarMatch = offerText.match(/\$(\d+)/);
    if (dollarMatch) {
        return parseInt(dollarMatch[1]);
    }
    
    return 0;
}

// Find the best offer for a merchant
function findBestOffer(offers) {
    if (!offers || offers.length === 0) {
        return '';
    }
    
    // Sort offers by value
    const sortedOffers = sortOffersByValue(offers);
    
    // Return the highest value offer
    return sortedOffers[0].offer;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Setup checkbox filtering
    const checkboxes = document.querySelectorAll('.checkbox-option input');
    const selectAllBtn = document.getElementById('selectAll');
    const clearAllBtn = document.getElementById('clearAll');
    
    // Add event listeners to checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFiltersAndRender);
    });
    
    // Select all button
    selectAllBtn.addEventListener('click', function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        applyFiltersAndRender();
    });
    
    // Clear all button
    clearAllBtn.addEventListener('click', function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        applyFiltersAndRender();
    });
    
    // Set up search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        // Debounce search to improve performance
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            applyFiltersAndRender();
        }, 300);
    });
    
    // Extension link
    document.getElementById('extensionLink').addEventListener('click', function(e) {
        e.preventDefault();
        // Replace with your actual Chrome Web Store URL when available
        alert('Coming soon to the Chrome Web Store!');
        // Uncomment when you have the Chrome Web Store URL:
        // window.open('https://chrome.google.com/webstore/detail/your-extension-id', '_blank');
    });
    
    // Load offers and apply filters
    loadOffers().then(() => {
        applyFiltersAndRender();
    });
});