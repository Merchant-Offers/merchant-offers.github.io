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
      renderOffers(allOffers);
      
      // Remove loading indicator
      document.querySelector('.loading')?.remove();
  } catch (error) {
      console.error("Error loading offers:", error);
      const errorMsg = `Error loading offers: ${error.message}. Please try again later.`;
      document.querySelector('.loading').textContent = errorMsg;
      
      // Add technical details for debugging (only visible in console)
      console.log("Technical details:");
      console.log("- Current URL:", window.location.href);
      console.log("- Data URL attempted:", dataUrl);
      console.log("- Error object:", error);
  }
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

// Render all offers
function renderOffers(offers) {
    const merchantGroups = organizeOffers(offers);
    const container = document.getElementById('offersContainer');
    container.innerHTML = '';
    
    // If no offers to display
    if (offers.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No offers match your search. Try different search terms or filters.';
        container.appendChild(noResults);
        return;
    }
    
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

// Filter offers by card
function filterOffersByCard(cardName) {
    if (cardName === 'all') {
        renderOffers(allOffers);
    } else {
        const filteredOffers = allOffers.filter(offer => offer.card === cardName);
        renderOffers(filteredOffers);
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    // Add debounce to improve performance
    let debounceTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        
        debounceTimeout = setTimeout(() => {
            const searchTerm = this.value.toLowerCase();
            if (searchTerm.length === 0) {
                renderOffers(allOffers);
            } else {
                const filteredOffers = allOffers.filter(offer => 
                    offer.merchant.toLowerCase().includes(searchTerm) ||
                    offer.offer.toLowerCase().includes(searchTerm)
                );
                renderOffers(filteredOffers);
            }
        }, 300);
    });
}

// Setup card filters
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter offers
            filterOffersByCard(this.dataset.card);
        });
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadOffers();
    setupSearch();
    setupFilters();
});