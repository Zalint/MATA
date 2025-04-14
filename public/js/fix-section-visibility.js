// Script to fix section visibility and flatpickr issues
(function() {
    console.log('=== FIX SECTION VISIBILITY START ===');
    
    // Function to show a specific section by ID
    function showSection(sectionId) {
        console.log('Showing section:', sectionId);
        
        // Hide all content sections first
        const allSections = document.querySelectorAll('.content-section');
        allSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show the requested section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            console.log('Section displayed:', sectionId);
            
            // If this is the estimation section, initialize it properly
            if (sectionId === 'estimation-section') {
                console.log('Initializing estimation section');
                initializeEstimationSection();
            }
        } else {
            console.error('Section not found:', sectionId);
        }
    }
    
    // Function to initialize the estimation section
    function initializeEstimationSection() {
        // Fix flatpickr issues by manually initializing without locale
        const dateInput = document.getElementById('estimation-date');
        if (dateInput && window.flatpickr && !dateInput.flatpickrInstance) {
            try {
                console.log('Initializing flatpickr without locale');
                const fp = flatpickr(dateInput, {
                    dateFormat: 'd-m-Y',
                    defaultDate: new Date(),
                    allowInput: true,
                    locale: null // Force null locale to avoid errors
                });
                
                // Set today's date after initialization
                const today = new Date();
                const day = today.getDate().toString().padStart(2, '0');
                const month = (today.getMonth() + 1).toString().padStart(2, '0');
                const year = today.getFullYear();
                dateInput.value = `${day}-${month}-${year}`;
                
                console.log('Flatpickr initialized successfully with today\'s date:', dateInput.value);
            } catch (error) {
                console.error('Error initializing flatpickr (fallback mode):', error);
                // Set date manually if flatpickr fails
                const today = new Date();
                const day = today.getDate().toString().padStart(2, '0');
                const month = (today.getMonth() + 1).toString().padStart(2, '0');
                const year = today.getFullYear();
                dateInput.value = `${day}-${month}-${year}`;
            }
        }
        
        // Force populate form with existing estimation data
        if (typeof loadLatestEstimation === 'function') {
            setTimeout(() => {
                console.log('Forcing loadLatestEstimation from fix-section-visibility.js');
                loadLatestEstimation();
            }, 500); // Small delay to ensure everything else is initialized
        }
    }
    
    // Add click event listeners to each tab
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Adding tab click listeners');
        
        // Link for the estimation tab
        const estimationLink = document.querySelector('a[href="#estimation"]');
        if (estimationLink) {
            estimationLink.addEventListener('click', function(e) {
                e.preventDefault();
                showSection('estimation-section');
                console.log('Estimation tab clicked');
                
                // Make sure to actually fix the section visibility via CSS too
                const estimationSection = document.getElementById('estimation-section');
                if (estimationSection) {
                    estimationSection.style.display = 'block';
                    estimationSection.classList.add('active');
                    
                    // Force init after a short delay
                    setTimeout(initializeEstimationSection, 100);
                }
            });
        } else {
            console.warn('Estimation link not found');
        }
        
        // Direct access to estimation section
        const path = window.location.pathname;
        const hash = window.location.hash;
        
        if (hash === '#estimation' || path.includes('estimation')) {
            console.log('Direct access to estimation detected');
            
            // Show the estimation section after a small delay to ensure DOM is ready
            setTimeout(() => {
                showSection('estimation-section');
            }, 200);
        }
    });
    
    // Direct fix for the estimation section visibility
    const estimationSection = document.getElementById('estimation-section');
    if (estimationSection) {
        console.log('Fixing estimation section visibility directly');
        estimationSection.style.display = 'block';
        
        // Initialize after a short delay
        setTimeout(initializeEstimationSection, 300);
    }
    
    console.log('=== FIX SECTION VISIBILITY END ===');
})(); 