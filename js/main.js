// Global variables
let allOffers = [];
const dataUrl = 'data/credit_card_offers.json';

// Fetch offers data from JSON file
async function loadOffers() {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        allOffers = await response.json();
        renderOffers(allOffers);
        
        // Remove loading indicator
        document.querySelector('.loading')?.remove();
    } catch (error) {
        console.error("Error loading offers:", error);
        document.querySelector('.loading').textContent = 'Error loading offers. Please try again later.';
    }
}

// Organize offers by merchant and category
function organizeOffers(offers) {
    const categorizedMerchants = {};
    
    // Group by category and then by merchant
    offers.forEach(offer => {
        // Use "General" as default category if none provided
        const category = offer.category || "General";
        
        if (!categorizedMerchants[category]) {
            categorizedMerchants[category] = {};
        }
        
        if (!categorizedMerchants[category][offer.merchant]) {
            categorizedMerchants[category][offer.merchant] = [];
        }
        
        categorizedMerchants[category][offer.merchant].push(offer);
    });
    
    return categorizedMerchants;
}

// Render all offers
function renderOffers(offers) {
    const categorizedMerchants = organizeOffers(offers);
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';
    
    // If no offers to display
    if (offers.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = 'No offers match your search. Try different search terms or filters.';
        container.appendChild(noResults);
        return;
    }
    
    // Loop through each category
    Object.keys(categorizedMerchants).sort().forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.innerHTML = `<h2 class="category-title">${category}</h2>`;
        
        const merchantList = document.createElement('div');
        merchantList.className = 'merchant-list';
        
        // Loop through merchants in this category
        Object.keys(categorizedMerchants[category]).sort().forEach(merchant => {
            const merchantOffers = categorizedMerchants[category][merchant];
            
            const merchantCard = document.createElement('div');
            merchantCard.className = 'merchant-card';
            
            // Create merchant header and toggle button
            const merchantHeader = document.createElement('div');
            merchantHeader.className = 'merchant-header';
            merchantHeader.innerHTML = `
                <div class="merchant-name">${merchant}</div>
                <button class="toggle-btn">View Offers</button>
            `;
            
            // Create offer details section
            const offerDetails = document.createElement('div');
            offerDetails.className = 'offer-details';
            
            // Add each card's offer for this merchant
            merchantOffers.forEach(offer => {
                const offerRow = document.createElement('div');
                offerRow.className = 'offer-row';
                offerRow.innerHTML = `
                    <div class="card-name">${offer.card}</div>
                    <div class="offer-value">${offer.offer}</div>
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
            merchantCard.appendChild(offerDetails);
            merchantList.appendChild(merchantCard);
        });
        
        categorySection.appendChild(merchantList);
        container.appendChild(categorySection);
    });
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
                    offer.merchant.toLowerCase().includes(searchTerm)
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