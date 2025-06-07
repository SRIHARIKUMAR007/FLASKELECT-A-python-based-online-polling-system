// Application Configuration
const appConfig = {
    adminCredentials: {
        username: 'admin',
        password: 'admin123' // In production, use proper authentication system
    },
    candidates: [
        {
            id: 1,
            name: "VIJAY",
            party: "Thamizagha Vetri Kazhagam",
            photo: "tvk-vijay",
            color: "#FF6B6B",
            logo: "" // Reference to Image 1 (red and yellow flag with elephants)
        },
        {
            id: 2,
            name: "M.K.Stalin",
            party: "Dravida Munnetra Kazhagam",
            photo: "dmk-stalin",
            color: "#4ECDC4",
            logo: "/dmk-logo.png" // Reference to Image 2 (black and red flag)
        },
        {
            id: 3,
            name: "Kamal Haasan",
            party: "Makkal Needhi Maiam",
            photo: "mnm-kamal",
            color: "#45B7D1",
            logo: "/mnm-logo.png" // Reference to Image 3 (flower logo with Tamil text)
        },
        {
            id: 4,
            name: "Seeman",
            party: "Naam Tamilar Katchi",
            photo: "ntk-seeman",
            color: "#96CEB4",
            logo: "/ntk-logo.png" // Reference to Image 4 (red flag with tiger)
        },
        {
            id: 5,
            name: "Edappadi K. Palaniswami",
            party: "AIADMK",
            photo: "aiadmk-eps",
            color: "#D4A5A5",
            logo: "/aiadmk-logo.png" // Reference to Image 5 (black and red flag with silhouette)
        },
        {
            id: 6,
            name: "Dr. Anbumani Ramadoss",
            party: "PMK",
            photo: "pmk-anbumani",
            color: "#9FA8DA",
            logo: "/pmk-logo.png" // Reference to Image 6 (tricolor flag with mango)
        }
    ]
};

const partyImages = {
    // Tamil Nadu Government Logo
    'tn-logo': 'https://www.tn.gov.in/images/tn-logo.png',
    
    // Candidate Images - Replace placeholder with actual image URLs in production
    'tvk-vijay': 'https://akm-img-a-in.tosshub.com/indiatoday/styles/medium_crop_simple/public/2024-08/dd2f2676-6f9e-4ef6-8073-2273719225e3.jpeg?VersionId=ZZBiKWifi90IQgaGLCzY1Hv768HATn_5&size=750:*',
    'dmk-stalin': 'https://upload.wikimedia.org/wikipedia/en/5/5e/Dravida_Munnetra_Kazhagam_logo.png',
    'mnm-kamal': 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Mnm-logo-english.png',
    'ntk-seeman': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Naam_tamilar_katchi_flag.jpg/640px-Naam_tamilar_katchi_flag.jpg',
    'aiadmk-eps': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/AIADMK_Two_Leaves.png/1200px-AIADMK_Two_Leaves.png',
    'pmk-anbumani': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Pmk_flag.jpg',

};

// For development/demo purposes, fallback to placeholders
// This ensures the app works even if the image URLs are not available
function getImageUrl(key) {
    // Check if the image is available, otherwise use placeholder
    const img = new Image();
    img.src = partyImages[key];
    
    if (img.complete) {
        return partyImages[key];
    } else {
        // Return placeholder based on type
        if (key.includes('logo')) {
            return '/api/placeholder/80/80';
        } else {
            return '/api/placeholder/120/120';
        }
    }
}

// API endpoints
const API = {
    register: '/api/register',
    verifyPhone: '/api/verify-phone',
    verifyEmail: '/api/verify-email',
    resendOTP: '/api/resend-otp',
    vote: '/api/vote',
    verifyVote: '/api/verify-vote',
    adminLogin: '/api/admin/login',
    getResults: '/api/admin/results',
    getCandidates: '/api/candidates',
    verifyVoter: '/api/verify-voter'
};

// Store for in-memory data (in a real application, this would be a database)
const appStore = {
    currentUser: null,
    registeredVoters: [],
    votes: [],
    verificationCodes: {},
    emailOTPs: {},
    adminLoggedIn: false
};

// Utility functions
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
}

function showLoading(show = true) {
    const loader = document.getElementById('loading');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

function showStatusMessage(message, isError = false) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = isError ? 'status-message error' : 'status-message success';
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

// Navigation system
function navigateTo(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update URL hash
    window.location.hash = pageId;
    
    // Update navigation highlight
    updateNavHighlight(pageId);
    
    // Special case handling for certain pages
    if (pageId === 'vote') {
        loadCandidates();
    } else if (pageId === 'results') {
        // Restrict results page to admin only
        if (!appStore.adminLoggedIn) {
            showStatusMessage('Please log in as admin to view results', true);
            navigateTo('admin');
            return;
        }
        loadResults();
    }
}

function updateNavHighlight(pageId) {
    // Remove highlight from all nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Add highlight to current page's nav link
    const currentLink = document.querySelector(`.nav-link[href="#${pageId}"]`);
    if (currentLink) {
        currentLink.classList.add('active');
    }
}

// Initialize navigation from URL hash
function initializeNavigation() {
    // Get the page ID from the URL hash, or default to 'home'
    let pageId = window.location.hash.substring(1) || 'home';
    
    // Restrict results page to admin only
    if (pageId === 'results' && !appStore.adminLoggedIn) {
        pageId = 'admin';
        window.location.hash = pageId;
    }
    
    // Navigate to the initial page
    navigateTo(pageId);
    
    // Set up navigation for nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Restrict results page to admin only
            if (targetId === 'results' && !appStore.adminLoggedIn) {
                showStatusMessage('Please log in as admin to view results', true);
                navigateTo('admin');
                return;
            }
            
            navigateTo(targetId);
        });
    });
    
    // Set up navigation for other internal links
    const internalLinks = document.querySelectorAll('.text-link');
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Restrict results page to admin only
            if (targetId === 'results' && !appStore.adminLoggedIn) {
                showStatusMessage('Please log in as admin to view results', true);
                navigateTo('admin');
                return;
            }
            
            navigateTo(targetId);
        });
    });
    
    // Listen for hash changes
    window.addEventListener('hashchange', function() {
        let pageId = window.location.hash.substring(1) || 'home';
        
        // Restrict results page to admin only
        if (pageId === 'results' && !appStore.adminLoggedIn) {
            pageId = 'admin';
            window.location.hash = pageId;
        }
        
        navigateTo(pageId);
    });
}

// Initialize OTP input fields
function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        // Auto-focus next input after entering a digit
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            }
        });
        
        // Handle backspace to go to previous input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value.length === 0) {
                if (index > 0) {
                    otpInputs[index - 1].focus();
                }
            }
        });
    });
}

// Voter registration function
function registerVoter() {
    // Get form data
    const fullName = document.getElementById('full-name').value;
    const aadharNumber = document.getElementById('aadhar-number').value;
    const phoneNumber = document.getElementById('phone-registration').value;
    const email = document.getElementById('email').value;
    
    // Basic validation
    if (!fullName || !aadharNumber || !phoneNumber || !email) {
        showStatusMessage('Please fill in all fields', true);
        return;
    }
    
    // Validate Aadhar number (should be 12 digits)
    if (!/^\d{12}$/.test(aadharNumber)) {
        showStatusMessage('Aadhar number must be 12 digits', true);
        return;
    }
    
    // Validate phone number (should be 10 digits)
    if (!/^\d{10}$/.test(phoneNumber)) {
        showStatusMessage('Phone number must be 10 digits', true);
        return;
    }
    
    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatusMessage('Please enter a valid email address', true);
        return;
    }
    
    // Check if user already exists
    const existingUser = appStore.registeredVoters.find(
        voter => voter.aadharNumber === aadharNumber || voter.phoneNumber === phoneNumber
    );
    
    if (existingUser) {
        showStatusMessage('A user with this Aadhar number or phone number already exists', true);
        return;
    }
    
    // Generate OTP for email verification
    const emailOTP = generateVerificationCode();
    appStore.emailOTPs[email] = emailOTP;
    
    // Send the OTP via email
    let otp_val = emailOTP;
    let emailBody = `<h2>Your OTP is ${otp_val}</h2>`;
    
    Email.send({
        SecureToken: "8efb85bc-09b7-41c8-9f02-d6eb38687d53",
        To: email,
        From: "sharisan2005@gmail.com",
        Subject: "OTP Verification for voting",
        Body: emailBody
    }).then(
        message => console.log("Email sent: " + message)
    );
    
    console.log(`Email OTP for ${email}: ${emailOTP}`);
    
    // Store user data temporarily
    appStore.currentUser = {
        fullName,
        aadharNumber,
        phoneNumber,
        email,
        isVerified: false,
        hasVoted: false
    };
    
    // Show email verification page
    navigateTo('email-verification');
    
    // Start the countdown for OTP expiration
    startCountdown();
    
    // Alert for demo purposes
    alert(`Your OTP is: ${emailOTP}`);
}

// Email OTP verification
function verifyEmailOTP() {
    if (!appStore.currentUser || !appStore.currentUser.email) {
        showStatusMessage('Session expired. Please register again.', true);
        navigateTo('register');
        return;
    }
    
    // Get the entered OTP
    const otpInputs = document.querySelectorAll('.otp-input');
    let enteredOTP = '';
    otpInputs.forEach(input => {
        enteredOTP += input.value;
    });
    
    // Validate OTP
    if (enteredOTP.length !== 6) {
        showStatusMessage('Please enter the complete 6-digit code', true);
        return;
    }
    
    const expectedOTP = appStore.emailOTPs[appStore.currentUser.email];
    
    if (enteredOTP === expectedOTP) {
        // Mark user as verified
        appStore.currentUser.isVerified = true;
        
        // Add to registered voters
        appStore.registeredVoters.push({...appStore.currentUser});
        
        // Generate verification code for voting
        const voteVerificationCode = generateVerificationCode();
        appStore.verificationCodes[appStore.currentUser.phoneNumber] = voteVerificationCode;
        
        showStatusMessage('Your account has been verified successfully!');
        
        // Navigate to voting page
        navigateTo('vote');
        
        // Alert for demo purposes
        alert(`Voter's verification code is: ${voteVerificationCode}\nKeep this code to for your vote verification.`);
    } else {
        showStatusMessage('Invalid verification code. Please try again.', true);
    }
}

// Phone verification function
function verifyPhone() {
    const phoneNumber = document.getElementById('phone-input').value;
    
    // Basic validation
    if (!phoneNumber || phoneNumber.length !== 10) {
        showStatusMessage('Please enter a valid 10-digit phone number', true);
        return;
    }
    
    // Check if phone number is registered
    const user = appStore.registeredVoters.find(voter => voter.phoneNumber === phoneNumber);
    
    if (!user) {
        showStatusMessage('Phone number not registered. Please register first.', true);
        return;
    }
    
    if (user.hasVoted) {
        showStatusMessage('Warning!!! You have already cast your vote.', true);
        return;
    }
    
    // Set current user
    appStore.currentUser = user;
    
    // Generate verification code
    const verificationCode = generateVerificationCode();
    appStore.verificationCodes[phoneNumber] = verificationCode;
    
    // In a real app, you would send this code via SMS using a service like Twilio or a Cordova plugin
    console.log(`Verification code for ${phoneNumber}: ${verificationCode}`);
    
    showStatusMessage('Verification code sent to your phone');
    
    // Navigate to the voting page
    navigateTo('vote');
    
    // Alert for demo purposes
    alert(`OTP Warning!! Your verification code is: ${verificationCode}`);
}

// Load candidates on the voting page
function loadCandidates() {
    const candidatesContainer = document.getElementById('candidates-container');
    if (!candidatesContainer) return;
    
    // Clear previous content
    candidatesContainer.innerHTML = '';
    
    // Add each candidate
    appConfig.candidates.forEach(candidate => {
        const candidateCard = document.createElement('div');
        candidateCard.className = 'candidate-card';
        candidateCard.style.borderColor = candidate.color;
        
        candidateCard.innerHTML = `
            <div class="candidate-photo" style="background-color: ${candidate.color}20">
                <img src="${partyImages[candidate.photo]}" alt="${candidate.name}">
            </div>
            <div class="candidate-info">
                <h3>${candidate.name}</h3>
                <p>${candidate.party}</p>
                <div class="party-logo">
                    <img src="${candidate.logo}" alt="${candidate.party} logo" width="80" height="80">
                </div>
            </div>
            <button class="vote-button" onclick="castVote(${candidate.id})" style="background-color: ${candidate.color}">
                <i class="fas fa-vote-yea"></i> VOTE
            </button>
        `;
        
        candidatesContainer.appendChild(candidateCard);
    });
}

// Cast vote function
function castVote(candidateId) {
    if (!appStore.currentUser) {
        showStatusMessage('Session expired. Please log in again.', true);
        navigateTo('home');
        return;
    }
    
    if (appStore.currentUser.hasVoted) {
        showStatusMessage('You have already cast your vote', true);
        return;
    }
    
    // Find the selected candidate
    const candidate = appConfig.candidates.find(c => c.id === candidateId);
    if (!candidate) {
        showStatusMessage('Invalid candidate selection', true);
        return;
    }
    
    // Confirm vote
    const confirmVote = confirm(`Are you sure you want to vote for ${candidate.name} (${candidate.party})?`);
    if (!confirmVote) return;
    
    // Record vote
    const voteRecord = {
        candidateId,
        timestamp: new Date().toISOString(),
        verificationCode: appStore.verificationCodes[appStore.currentUser.phoneNumber]
    };
    
    appStore.votes.push(voteRecord);
    
    // Update user status
    appStore.currentUser.hasVoted = true;
    
    // Update in the registered voters array
    const userIndex = appStore.registeredVoters.findIndex(
        voter => voter.phoneNumber === appStore.currentUser.phoneNumber
    );
    
    if (userIndex !== -1) {
        appStore.registeredVoters[userIndex].hasVoted = true;
    }
    
    showStatusMessage('Your vote has been cast successfully!');
    
    // Show verification code
    alert(`Vote verification code is: ${voteRecord.verificationCode}`);
    
    // Navigate to verify vote page
    navigateTo('verify-vote');
}

// Verify vote function
function verifyVote() {
    const verificationCode = document.getElementById('verification-code-input').value;
    
    // Validation
    if (!verificationCode || verificationCode.length !== 6) {
        showStatusMessage('Please enter a valid verification code', true);
        return;
    }
    
    // Find the vote with this verification code
    const vote = appStore.votes.find(v => v.verificationCode === verificationCode);
    
    const resultContainer = document.getElementById('verification-result');
    if (!resultContainer) return;
    
    if (vote) {
        // Find candidate details
        const candidate = appConfig.candidates.find(c => c.id === vote.candidateId);
        
        resultContainer.innerHTML = `
            <div class="verification-success">
                <i class="fas fa-check-circle"></i>
                <h3>Vote Verified Successfully</h3>
                <p>Your vote was cast for:</p>
                <div class="verified-candidate">
                    <img src="${partyImages[candidate.photo]}" alt="${candidate.name}">
                    <div>
                        <h4>${candidate.name}</h4>
                        <p>${candidate.party}</p>
                        <div class="party-logo">
                            <img src="${candidate.logo}" alt="${candidate.party} logo" width="60" height="60">
                        </div>
                    </div>
                </div>
                <p class="verification-timestamp">Time: ${new Date(vote.timestamp).toLocaleString()}</p>
            </div>
        `;
    } else {
        resultContainer.innerHTML = `
            <div class="verification-failed">
                <i class="fas fa-times-circle"></i>
                <h3>Verification Failed</h3>
                <p>No vote found with this verification code. Please check and try again.</p>
            </div>
        `;
    }
    
    resultContainer.style.display = 'block';
}

// Enhanced load results function
function loadResults() {
    // Check if admin is logged in for admin results page
    if (window.location.hash === '#results' && !appStore.adminLoggedIn) {
        showStatusMessage('Access denied. Admin login required to view results.', true);
        navigateTo('admin');
        return;
    }
    
    // Get total registered voters
    const totalVoters = appStore.registeredVoters.length;
    const totalVotes = appStore.votes.length;
    const votingPercentage = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0;
    
    // Update stats based on which page we're on (admin results or public results)
    const isAdminPage = window.location.hash === '#admin';
    const statsPrefix = isAdminPage ? 'admin-' : '';
    
    document.getElementById(`${statsPrefix}total-voters`).textContent = totalVoters;
    document.getElementById(`${statsPrefix}total-votes`).textContent = totalVotes;
    document.getElementById(`${statsPrefix}voting-percentage`).textContent = `${votingPercentage}%`;
    
    // Count votes for each candidate
    const voteCounts = {};
    appConfig.candidates.forEach(candidate => {
        voteCounts[candidate.id] = 0;
    });
    
    appStore.votes.forEach(vote => {
        if (voteCounts.hasOwnProperty(vote.candidateId)) {
            voteCounts[vote.candidateId]++;
        }
    });
    
    // Create sorted results array
    const results = appConfig.candidates.map(candidate => ({
        ...candidate,
        votes: voteCounts[candidate.id],
        percentage: totalVotes > 0 ? ((voteCounts[candidate.id] / totalVotes) * 100).toFixed(2) : 0
    })).sort((a, b) => b.votes - a.votes);
    
    // Find winning candidate
    const winningCandidate = results.length > 0 ? results[0] : null;
    
    // Display results
    const resultsContainer = document.getElementById(`${statsPrefix}results-container`);
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('animate-progress');
    
    results.forEach((result, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const isWinner = winningCandidate && result.id === winningCandidate.id && result.votes > 0;
        
        resultItem.innerHTML = `
            <div class="result-rank">${index + 1}</div>
            <div class="result-candidate">
                <div class="candidate-image">
                    <img src="${partyImages[result.photo] || '/api/placeholder/40/40'}" alt="${result.name}">
                </div>
                <div>
                    <h3>${result.name} ${isWinner ? '<span class="winner-badge">WINNER</span>' : ''}</h3>
                    <p>${result.party}</p>
                    <div class="party-logo-small">
                        <img src="${result.logo || '/api/placeholder/80/80'}" alt="${result.party} logo">
                    </div>
                </div>
            </div>
            <div class="result-votes">${result.votes} vote${result.votes !== 1 ? 's' : ''}</div>
            <div class="result-percentage">
                <div class="progress-bar">
                    <div class="progress" style="width: 0%; background-color: ${result.color}"></div>
                </div>
                <span>${result.percentage}%</span>
            </div>
        `;
        
        resultsContainer.appendChild(resultItem);
    });
    
    // Add animation after a short delay to allow for DOM rendering
    setTimeout(() => {
        resultsContainer.classList.add('animate-progress');
        
        // Update progress bars width based on percentages
        const progressBars = resultsContainer.querySelectorAll('.progress');
        progressBars.forEach((progressBar, index) => {
            progressBar.style.width = `${results[index].percentage}%`;
        });
    }, 100);
    
    // Add print button for public results page (not for admin)
    if (!isAdminPage) {
        const printButton = document.createElement('button');
        printButton.className = 'print-results-btn';
        printButton.innerHTML = '<i class="fas fa-print"></i> Print Results';
        printButton.onclick = printResults;
        
        const resultsPageContainer = document.querySelector('.results-page-container');
        if (resultsPageContainer) {
            resultsPageContainer.appendChild(printButton);
        }
    }
}

// Print results function
function printResults() {
    const printWindow = window.open('', '_blank');
    
    // Get current date and time
    const now = new Date();
    const dateTime = now.toLocaleString();
    
    // Calculate results data
    const totalVoters = appStore.registeredVoters.length;
    const totalVotes = appStore.votes.length;
    const votingPercentage = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0;
    
    // Count votes
    const voteCounts = {};
    appConfig.candidates.forEach(candidate => {
        voteCounts[candidate.id] = 0;
    });
    
    appStore.votes.forEach(vote => {
        if (voteCounts.hasOwnProperty(vote.candidateId)) {
            voteCounts[vote.candidateId]++;
        }
    });
    
    // Sort candidates by votes
    const results = appConfig.candidates.map(candidate => ({
        ...candidate,
        votes: voteCounts[candidate.id],
        percentage: totalVotes > 0 ? ((voteCounts[candidate.id] / totalVotes) * 100).toFixed(2) : 0
    })).sort((a, b) => b.votes - a.votes);
    
    // Create HTML content for printing
    let printContent = `
        <html>
        <head>
            <title>Election Results</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    line-height: 1.6;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #ccc;
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 30px;
                    text-align: center;
                }
                .stat-box {
                    padding: 10px;
                    border: 1px solid #eee;
                    border-radius: 8px;
                    min-width: 150px;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 5px 0;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    text-align: left;
                }
                th {
                    background-color: #f5f5f5;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                .progress-bar {
                    background-color: #f0f0f0;
                    height: 12px;
                    border-radius: 6px;
                    margin-top: 5px;
                    overflow: hidden;
                }
                .progress {
                    height: 100%;
                    border-radius: 6px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Election Results</h1>
                <p>Generated on: ${dateTime}</p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <div>Total Registered Voters</div>
                    <div class="stat-value">${totalVoters}</div>
                </div>
                <div class="stat-box">
                    <div>Total Votes Cast</div>
                    <div class="stat-value">${totalVotes}</div>
                </div>
                <div class="stat-box">
                    <div>Voting Percentage</div>
                    <div class="stat-value">${votingPercentage}%</div>
                </div>
            </div>
            
            <h2>Results by Candidate</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Candidate</th>
                        <th>Party</th>
                        <th>Votes</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach((result, index) => {
        printContent += `
            <tr>
                <td>${index + 1}</td>
                <td>${result.name}</td>
                <td>${result.party}</td>
                <td>${result.votes}</td>
                <td>
                    ${result.percentage}%
                    <div class="progress-bar">
                        <div class="progress" style="width: ${result.percentage}%; background-color: ${result.color};"></div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    printContent += `
                </tbody>
            </table>
            
            <div class="footer">
                <p>This is an official record of the election results. 
                   Thamizagha Voting System &copy; ${new Date().getFullYear()}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Give time for resources to load before printing
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// Enhanced admin results loader
function loadAdminResults() {
    loadResults(); // Reuse the main results loader function which now handles both cases
    
    // Additional admin-specific functionality can be added here
    // For example, displaying more detailed analytics or controls
    const adminResultsAnalytics = document.getElementById('admin-results-analytics');
    if (adminResultsAnalytics) {
        // Calculate detailed analytics data
        const totalVoters = appStore.registeredVoters.length;
        const totalVotes = appStore.votes.length;
        const pendingVoters = totalVoters - totalVotes;
        
        // Show analytics data
        adminResultsAnalytics.innerHTML = `
            <div class="admin-analytics-card">
                <h3>Voting Analytics</h3>
                <div class="analytics-grid">
                    <div class="analytics-item">
                        <span class="analytics-label">Registered Voters:</span>
                        <span class="analytics-value">${totalVoters}</span>
                    </div>
                    <div class="analytics-item">
                        <span class="analytics-label">Votes Cast:</span>
                        <span class="analytics-value">${totalVotes}</span>
                    </div>
                    <div class="analytics-item">
                        <span class="analytics-label">Pending Voters:</span>
                        <span class="analytics-value">${pendingVoters}</span>
                    </div>
                </div>
            </div>
        `;
    }
}
// Admin login function
function adminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    
    if (username === appConfig.adminCredentials.username && 
        password === appConfig.adminCredentials.password) {
        appStore.adminLoggedIn = true;
        
        // Show admin dashboard
        document.getElementById('admin-login-form').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        
        // Load admin data
        loadAdminResults();
        loadVotersList();
        
        showStatusMessage('Admin login successful');
    } else {
        showStatusMessage('Invalid credentials', true);
    }
}

// Admin logout function
function adminLogout() {
    appStore.adminLoggedIn = false;
    
    // Show login form again
    document.getElementById('admin-login-form').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
    
    showStatusMessage('Logged out successfully');
}

// Load admin results
function loadAdminResults() {
    // Same as loadResults but for admin panel
    const totalVoters = appStore.registeredVoters.length;
    document.getElementById('admin-total-voters').textContent = totalVoters;
    
    const totalVotes = appStore.votes.length;
    document.getElementById('admin-total-votes').textContent = totalVotes;
    
    const votingPercentage = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0;
    document.getElementById('admin-voting-percentage').textContent = `${votingPercentage}%`;
    
    // Count votes for each candidate
    const voteCounts = {};
    appConfig.candidates.forEach(candidate => {
        voteCounts[candidate.id] = 0;
    });
    
    appStore.votes.forEach(vote => {
        if (voteCounts.hasOwnProperty(vote.candidateId)) {
            voteCounts[vote.candidateId]++;
        }
    });
    
    // Create sorted results array
    const results = appConfig.candidates.map(candidate => ({
        ...candidate,
        votes: voteCounts[candidate.id],
        percentage: totalVotes > 0 ? ((voteCounts[candidate.id] / totalVotes) * 100).toFixed(2) : 0
    })).sort((a, b) => b.votes - a.votes);
    
    // Display results
    const adminResultsContainer = document.getElementById('admin-results-container');
    if (!adminResultsContainer) return;
    
    adminResultsContainer.innerHTML = '';
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        resultItem.innerHTML = `
            <div class="result-rank">${results.indexOf(result) + 1}</div>
            <div class="result-candidate">
                <div class="candidate-image">
                    <img src="${partyImages[result.photo]}" alt="${result.name}">
                </div>
                <div>
                    <h3>${result.name}</h3>
                    <p>${result.party}</p>
                    <div class="party-logo-small">
                        <img src="${result.logo}" alt="${result.party} logo" width="40" height="40">
                    </div>
                </div>
            </div>
            <div class="result-votes">${result.votes} votes</div>
            <div class="result-percentage">
                <div class="progress-bar">
                    <div class="progress" style="width: ${result.percentage}%; background-color: ${result.color}"></div>
                </div>
                <span>${result.percentage}%</span>
            </div>
        `;
        
        adminResultsContainer.appendChild(resultItem);
    });}

// Load voters list for admin
function loadVotersList() {
    const votersList = document.getElementById('voters-list');
    if (!votersList) return;
    
    if (appStore.registeredVoters.length === 0) {
        votersList.innerHTML = `<tr><td colspan="5" class="empty-message">No registered voters yet</td></tr>`;
        return;
    }
    
    votersList.innerHTML = '';
    
    appStore.registeredVoters.forEach(voter => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${voter.fullName}</td>
            <td>${voter.phoneNumber}</td>
            <td>${voter.email}</td>
            <td><span class="status ${voter.isVerified ? 'verified' : 'pending'}">${voter.isVerified ? 'Yes' : 'No'}</span></td>
            <td><span class="status ${voter.hasVoted ? 'voted' : 'not-voted'}">${voter.hasVoted ? 'Yes' : 'No'}</span></td>
        `;
        
        votersList.appendChild(row);
    });
}
// Initialize admin tab switching
function initializeAdminTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show corresponding content
            const tabName = button.getAttribute('data-tab');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });
}

// Start countdown for OTP expiration
function startCountdown() {
    let timeLeft = 90; // 90 seconds = 1:30
    const countdownElement = document.getElementById('countdown');
    const resendButton = document.getElementById('resend-button');
    
    if (!countdownElement || !resendButton) return;
    
    // Update countdown every second
    const countdownInterval = setInterval(() => {
        timeLeft--;
        
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        countdownElement.textContent = `Resend code in: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownElement.textContent = 'Code expired';
            resendButton.disabled = false;
        }
    }, 1000);
    
    // Reset resend button
    resendButton.disabled = true;
    
    // Set up resend button
    resendButton.onclick = function() {
        if (appStore.currentUser && appStore.currentUser.email) {
            // Generate new OTP
            const newOTP = generateVerificationCode();
            appStore.emailOTPs[appStore.currentUser.email] = newOTP;
            
            // Send the OTP via email
            let otp_val = newOTP;
            let emailBody = `<h2>Your OTP is ${otp_val}</h2>`;
            
            Email.send({
                SecureToken: "8efb85bc-09b7-41c8-9f02-d6eb38687d53",
                To: appStore.currentUser.email,
                From: "sharisan2005@gmail.com",
                Subject: "OTP Verification for voting",
                Body: emailBody
            }).then(
                message => console.log("Email sent: " + message)
            );
            
            console.log(`New Email OTP for ${appStore.currentUser.email}: ${newOTP}`);
            
            // Alert for demo purposes
            alert(`Your new email OTP is: ${newOTP}`);
            
            // Reset countdown
            startCountdown();
            
            // Clear OTP input fields
            const otpInputs = document.querySelectorAll('.otp-input');
            otpInputs.forEach(input => {
                input.value = '';
            });
            otpInputs[0].focus();
            
            showStatusMessage('New verification code sent');
        }
    };
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set up navigation
    initializeNavigation();
    
    // Initialize OTP inputs
    initializeOTPInputs();
    
    // Initialize admin tabs
    initializeAdminTabs();
    
    // Set up phone verification button
    const verifyButton = document.getElementById('verify-button');
    if (verifyButton) {
        verifyButton.addEventListener('click', verifyPhone);
    }
});
// Extend the appConfig to include election settings
appConfig.electionSettings = {
    votingEnabled: true,
    liveResultsEnabled: false,
    registrationEnabled: true
};

// Initialize settings UI when the admin panel loads
function initializeSettingsUI() {
    // Get the toggle switches
    const votingToggle = document.querySelector('#tab-settings input[for="Enable Voting"]');
    const resultsToggle = document.querySelector('#tab-settings input[for="Show Live Results"]');
    const registrationToggle = document.querySelector('#tab-settings input[for="Allow Registration"]');
    
    // Set initial states based on appConfig
    if (votingToggle) votingToggle.checked = appConfig.electionSettings.votingEnabled;
    if (resultsToggle) resultsToggle.checked = appConfig.electionSettings.liveResultsEnabled;
    if (registrationToggle) registrationToggle.checked = appConfig.electionSettings.registrationEnabled;
    
    // Add event listeners for toggle switches
    if (votingToggle) {
        votingToggle.addEventListener('change', function() {
            appConfig.electionSettings.votingEnabled = this.checked;
        });
    }
    
    if (resultsToggle) {
        resultsToggle.addEventListener('change', function() {
            appConfig.electionSettings.liveResultsEnabled = this.checked;
            updateResultsVisibility();
        });
    }
    
    if (registrationToggle) {
        registrationToggle.addEventListener('change', function() {
            appConfig.electionSettings.registrationEnabled = this.checked;
            updateRegistrationVisibility();
        });
    }
    
    // Set up save button
    const saveButton = document.querySelector('#tab-settings button');
    if (saveButton) {
        saveButton.addEventListener('click', saveSettings);
    }
}

// Function to save settings
function saveSettings() {
    // In a real application, this would send data to a server
    // For this demo, we'll just update local settings and show a notification
    
    // Update app behavior based on settings
    updateResultsVisibility();
    updateRegistrationVisibility();
    updateVotingVisibility();
    
    // Show success message
    showStatusMessage('Settings saved successfully!');
    
    // Log settings for development/demo purposes
    console.log('Election settings saved:', appConfig.electionSettings);
}

// Function to update results visibility based on settings
function updateResultsVisibility() {
    // Hide or show results based on the setting
    const resultsLink = document.querySelector('.nav-link[href="#results"]');
    
    if (resultsLink) {
        if (!appConfig.electionSettings.liveResultsEnabled && !appStore.adminLoggedIn) {
            resultsLink.style.display = 'none';
            
            // If user is on results page, redirect them
            if (window.location.hash === '#results') {
                navigateTo('home');
                showStatusMessage('Live results are currently disabled by the administrator', true);
            }
        } else {
            resultsLink.style.display = 'block';
        }
    }
}

// Function to update registration visibility based on settings
function updateRegistrationVisibility() {
    // Hide or show registration based on the setting
    const registerLink = document.querySelector('.nav-link[href="#register"]');
    
    if (registerLink) {
        if (!appConfig.electionSettings.registrationEnabled) {
            registerLink.style.display = 'none';
            
            // If user is on register page, redirect them
            if (window.location.hash === '#register') {
                navigateTo('home');
                showStatusMessage('Registration is currently closed by the administrator', true);
            }
        } else {
            registerLink.style.display = 'block';
        }
    }
}

// Function to update voting functionality based on settings
function updateVotingVisibility() {
    // Disable voting if the setting is off
    if (!appConfig.electionSettings.votingEnabled) {
        // If user is on vote page, redirect them
        if (window.location.hash === '#vote') {
            navigateTo('home');
            showStatusMessage('Voting is currently closed by the administrator', true);
        }
        
        // Modify the castVote function temporarily to prevent voting
        window.originalCastVote = window.originalCastVote || castVote;
        window.castVote = function() {
            showStatusMessage('Voting is currently closed by the administrator', true);
        };
    } else {
        // Restore original castVote function if it was modified
        if (window.originalCastVote) {
            window.castVote = window.originalCastVote;
        }
    }
}

// Create the Admin Settings UI
function createSettingsUI() {
    const settingsTab = document.getElementById('tab-settings');
    if (!settingsTab) return;
    
    settingsTab.innerHTML = `
        <div class="settings-container">
            <h2>Election Settings</h2>
            
            <div class="setting-row">
                <div class="setting-label">Enable Voting</div>
                <label class="switch">
                    <input type="checkbox" for="Enable Voting" ${appConfig.electionSettings.votingEnabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            
            <div class="setting-row">
                <div class="setting-label">Show Live Results</div>
                <label class="switch">
                    <input type="checkbox" for="Show Live Results" ${appConfig.electionSettings.liveResultsEnabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            
            <div class="setting-row">
                <div class="setting-label">Allow Registration</div>
                <label class="switch">
                    <input type="checkbox" for="Allow Registration" ${appConfig.electionSettings.registrationEnabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            
            <button class="btn" id="save-settings">
                <i class="fas fa-save"></i> Save Settings
            </button>
        </div>
    `;
    
    // Initialize the settings UI
    initializeSettingsUI();
}

// Add CSS for settings page
function addSettingsStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .settings-container {
            max-width: 800px;
            padding: 20px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            margin: 20px auto;
        }
        
        .setting-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }
        
        .setting-label {
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }
        
        /* Toggle Switch */
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
        }
        
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
        }
        
        input:checked + .slider {
            background-color: #4A6DA7;
        }
        
        input:focus + .slider {
            box-shadow: 0 0 1px #4A6DA7;
        }
        
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        
        .slider.round {
            border-radius: 34px;
        }
        
        .slider.round:before {
            border-radius: 50%;
        }
        
        #save-settings {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #4A6DA7;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background-color 0.3s;
        }
        
        #save-settings:hover {
            background-color: #3a5580;
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Extend the adminLogin function to initialize settings
const originalAdminLogin = adminLogin;
adminLogin = function() {
    // Call the original function
    originalAdminLogin();
    
    // If login was successful
    if (appStore.adminLoggedIn) {
        // Create settings UI
        createSettingsUI();
    }
};

// Modify the initializeAdminTabs function to handle settings tab
const originalInitializeAdminTabs = initializeAdminTabs;
initializeAdminTabs = function() {
    // Call the original function
    originalInitializeAdminTabs();
    
    // Add styles for settings
    addSettingsStyles();
    
    // Get the settings tab button
    const settingsTabButton = document.querySelector('.tab-button[data-tab="settings"]');
    
    // If it exists and is clicked
    if (settingsTabButton) {
        settingsTabButton.addEventListener('click', function() {
            // Create settings UI when tab is clicked
            createSettingsUI();
        });
    }
};

// Add to the document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Original initialization code is already there
    
    // Initialize settings
    updateResultsVisibility();
    updateRegistrationVisibility();
    updateVotingVisibility();
});



