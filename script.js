// Helper to ensure only one primary screen is visible
function showOnly(targetId) {
    const screens = [
        'welcome-screen',
        'returning-user-screen',
        'user-id-screen',
        'demographics-screen',
        'test-area'
    ];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = (id === targetId) ? 'block' : 'none';
    });
}

function showWelcomeScreen() {
    showOnly('welcome-screen');
}

function updateParticipantIdDisplay() {
    const persistentBanner = document.getElementById('persistent-user-id');
    const resultsId = document.getElementById('results-user-id');
    const demographicsDisplay = document.getElementById('display-user-id');
    const userId = testState.userId || '';
    
    if (demographicsDisplay) {
        demographicsDisplay.textContent = userId;
    }
    
    if (persistentBanner) {
        if (userId) {
            persistentBanner.textContent = `Participant ID: ${userId}`;
            persistentBanner.style.display = 'block';
        } else {
            persistentBanner.textContent = '';
            persistentBanner.style.display = 'none';
        }
    }
    
    if (resultsId) {
        resultsId.textContent = userId;
    }
}
let testState = {
    currentSet: 0,
    currentWordInSet: 0,
    learnedInCurrentSet: 0,
    currentPhase: 'start',
    studyWords: [],
    studyIndex: 0,
    recallTrial: 0,
    recalledWords: [],
    cuedWords: [],
    startTime: null,
    userId: null,          // ADD THIS
    demographics: {},      // ADD THIS
    
    // Timing state
    studyStartTime: null, // when the current study set was shown
    freeRecallStartTime: null, // when the current free recall trial started
    cuedRecallStartTime: null, // when the current cued recall category was shown
    delayedFreeRecallStartTime: null, // when delayed free recall started
    delayedCuedRecallStartTime: null, // when the current delayed cued category was shown

    // Arrays to store times
    studyTimes: [], // { word: 'dog', time: 1234 } for each study word selection
    freeRecallTimes: [], // time in ms for each free recall trial
    cuedRecallTimes: [], // time in ms for each cued recall category
    delayedFreeRecallTime: null, // time for delayed free recall
    delayedCuedRecallTimes: [], // time for each delayed cued category

    // Stroop test state
    stroopStartTime: null,
    stroopTrials: [],
    stroopDifficulty: 1, // 1 = easy, 2 = medium, 3 = hard
    stroopCorrect: 0,
    stroopTotal: 0,
    stroopEffectivenessScore: 0,

    results: {
        freeRecall: [[], [], []],
        cuedRecall: [[], [], []],
        delayedFree: [],
        delayedCued: [],
        studyAttempts: []
    }
};

let WORD_DATABASE = null;

// Load word bank from JSON file
async function loadWordBank() {
    try {
        const response = await fetch('words.json');
        const data = await response.json();
        
        // Store both native and non-native word banks
        WORD_DATABASE = data;
        
        // Default to native word bank initially
        if (!testState.wordBank) {
            testState.wordBank = 'native';
        }
        
        // Initialize word sets
        initializeWordSets();
    } catch (error) {
        console.error('Error loading word bank:', error);
        // Fallback to a default word bank if loading fails
        WORD_DATABASE = {
            "native": {
                "animal": ["dog", "cat", "bird", "fish", "frog"],
                "tool": ["hammer", "saw", "knife", "brush", "ruler"],
                "furniture": ["chair", "table", "sofa", "bed", "desk"],
                "clothing": ["shirt", "pants", "shoes", "socks", "hat"]
            },
            "nonNative": {
                "animal": ["dog", "cat", "bird", "fish", "frog"],
                "tool": ["hammer", "saw", "knife", "brush", "ruler"],
                "furniture": ["chair", "table", "sofa", "bed", "desk"],
                "clothing": ["shirt", "pants", "shoes", "socks", "hat"]
            }
        };
        if (!testState.wordBank) {
            testState.wordBank = 'native';
        }
        initializeWordSets();
    }
}

function initializeWordSets() {
    // Clear any existing words
    testState.wordSets = [];
    testState.cards = [];
    
    // Get the appropriate word bank based on user's language preference
    const wordBank = WORD_DATABASE[testState.wordBank] || WORD_DATABASE.native;
    
    // Get all categories from the selected word bank
    const categories = Object.keys(wordBank);
    
    // Create exactly one set of 16 words (4 categories × 4 words)
    const totalSets = 1;
    for (let set = 0; set < totalSets; set++) {
        const wordSet = [];
        const usedWords = new Set();
        
        // Select 4 categories for this set
        const selectedCategories = [...categories].sort(() => 0.5 - Math.random()).slice(0, 4);
        
        // For each selected category, pick exactly 4 words
        for (const category of selectedCategories) {
            // Get all words from this category that haven't been used yet
            const availableWords = wordBank[category].filter(word => !usedWords.has(word));
            
            // If we don't have enough words, log an error (shouldn't happen with our word bank)
            if (availableWords.length < 4) {
                console.error(`Not enough unique words in category: ${category}`);
                // Fill with placeholder if needed (shouldn't happen with current word bank)
                for (let i = 0; i < 4; i++) {
                    wordSet.push({
                        word: `${category}-word-${i+1}`,
                        category: category,
                        set: set + 1,
                        card: 0, // Will be updated when creating cards
                        learned: false,
                        attempts: 0
                    });
                }
                continue;
            }
            
            // Randomly select 4 words from this category
            const selectedWords = [...availableWords]
                .sort(() => 0.5 - Math.random())
                .slice(0, 4);
            
            // Add the selected words to the set
            selectedWords.forEach((word, index) => {
                wordSet.push({
                    word: word,
                    category: category,
                    set: set + 1, // 1-based set number
                    card: index + 1, // 1-based card number (each card gets one word from each category)
                    learned: false,
                    attempts: 0
                });
                usedWords.add(word);
            });
        }
        
        // Create 4 cards for this set (each card has 1 word from each category)
        const cards = [];
        for (let cardNum = 1; cardNum <= 4; cardNum++) {
            const cardWords = wordSet.filter(word => word.card === cardNum);
            cards.push({
                set: set + 1,
                cardNumber: cardNum,
                words: [...cardWords],
                isComplete: false
            });
        }
        
        // Verify we have exactly 16 words (4 categories × 4 words each) and 4 cards
        if (wordSet.length !== 16) {
            console.error(`Word set ${set + 1} has ${wordSet.length} words instead of 16`);
        }
        if (cards.length !== 4) {
            console.error(`Expected 4 cards but got ${cards.length}`);
        }
        
        // Add the set and its cards to testState
        testState.wordSets.push({
            setNumber: set + 1,
            words: wordSet,
            cards: cards,
            currentCard: 0
        });
        
        // Track number of cards for study progression
        const cardCount = wordSet.reduce((max, word) => Math.max(max, word.card || 0), 0);
        testState.totalCards = cardCount || 4;
    }
    
    // Set the first word set as active
    testState.currentWordSet = 0;
    testState.studyWords = testState.wordSets[testState.currentWordSet].words;
}

function selectRandomWords() {
    if (!WORD_DATABASE) {
        console.error('Word database not loaded');
        return [];
    }
    
    if (!testState.wordSets || testState.wordSets.length === 0) {
        console.warn('Word sets not initialized. Reinitializing now.');
        initializeWordSets();
    }
    
    const setIndex = testState.currentWordSet || 0;
    const currentWordSet = testState.wordSets[setIndex];
    
    if (!currentWordSet || !Array.isArray(currentWordSet.words)) {
        console.error('Current word set is unavailable.');
        return [];
    }
    
    return currentWordSet.words;
}



function generateUserId(initials, birthYear) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomStr = '';
    for (let i = 0; i < 4; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timeStamp = month + day;
    
    return `${initials.toUpperCase()}-${birthYear}-${randomStr}-${timeStamp}`;
}

function handleDemographicsSubmit(e) {
    e.preventDefault();
    
    const initials = document.getElementById('initials').value.trim();
    const birthYear = document.getElementById('birth-year').value;
    const gender = document.getElementById('gender').value;
    const education = document.getElementById('education').value;
    const nativeEnglish = document.getElementById('native-english').value;
    const isColorblind = document.getElementById('colorblind').value === 'Y';
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(birthYear);
    
    testState.userId = generateUserId(initials, birthYear);
    
    testState.isColorblind = isColorblind;
    
    if (isColorblind) {
        document.body.classList.add('colorblind-mode');
    }
    
    testState.demographics = {
        userId: testState.userId,
        initials: initials.toUpperCase(),
        birthYear: parseInt(birthYear),
        age: age,
        gender: gender,
        education: education,
        nativeEnglish: nativeEnglish,
        isColorblind: isColorblind,
        testDate: new Date().toISOString()
    };
    
    // Set appropriate word bank based on language proficiency (Y/N from select)
    testState.wordBank = nativeEnglish === 'Y' ? 'native' : 'nonNative';
    
    // Reinitialize word sets with the correct word bank
    initializeWordSets();
    
    // Hide the form
    document.getElementById('demographics-form').style.display = 'none';
    
    // Create and show user ID with Begin Test button
    const demographicsScreen = document.getElementById('demographics-screen');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'screen-card screen-card--narrow confirmation-card';
    messageDiv.innerHTML = `
        <div class="confirmation">
            <p class="confirmation__label">Your Participant ID</p>
            <p class="confirmation__value">${testState.userId}</p>
            <p class="confirmation__hint">Please save this ID for future sessions.</p>
        </div>
        <button id="begin-test-button" class="btn btn-primary btn-block">Begin test</button>
    `;
    demographicsScreen.appendChild(messageDiv);
    
    // Add event listener to the Begin Test button
    document.getElementById('begin-test-button').addEventListener('click', startTest);
    updateParticipantIdDisplay();
}

// Initialize the test when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const beginTestButton = document.getElementById('begin-test');
    const demographicsForm = document.getElementById('demographics-form');
    const yesReturningBtn = document.getElementById('yes-returning');
    const noReturningBtn = document.getElementById('no-returning');
    const submitUserIdBtn = document.getElementById('submit-user-id');
    const backToWelcomeBtn = document.getElementById('back-to-welcome');
    const backToReturningUserBtn = document.getElementById('back-to-returning-user');
    const backToReturningFromDemoBtn = document.getElementById('back-to-returning-from-demo');
    
    if (beginTestButton) {
        beginTestButton.addEventListener('click', (e) => {
            try {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                showReturningUserScreen();
            } catch (err) {
                console.error('Failed to start test flow:', err);
            }
        });
    }
    
    if (demographicsForm) {
        demographicsForm.addEventListener('submit', handleDemographicsSubmit);
    }
    
    if (yesReturningBtn) {
        yesReturningBtn.addEventListener('click', showUserIdScreen);
    }
    
    if (noReturningBtn) {
        noReturningBtn.addEventListener('click', showDemographicsScreen);
    }
    
    if (submitUserIdBtn) {
        submitUserIdBtn.addEventListener('click', handleUserIdSubmit);
    }

    if (backToWelcomeBtn) {
        backToWelcomeBtn.addEventListener('click', (e) => {
            if (e && e.preventDefault) e.preventDefault();
            showWelcomeScreen();
        });
    }

    if (backToReturningUserBtn) {
        backToReturningUserBtn.addEventListener('click', (e) => {
            if (e && e.preventDefault) e.preventDefault();
            showReturningUserScreen();
        });
    }

    if (backToReturningFromDemoBtn) {
        backToReturningFromDemoBtn.addEventListener('click', (e) => {
            if (e && e.preventDefault) e.preventDefault();
            showReturningUserScreen();
        });
    }
    
    // Load word data in the background so UI remains responsive
    loadWordBank().catch(err => console.error('loadWordBank failed:', err));
});

function showReturningUserScreen() {
    showOnly('returning-user-screen');
}

function showUserIdScreen() {
    showOnly('user-id-screen');
}

function showDemographicsScreen() {
    showOnly('demographics-screen');
}

async function handleUserIdSubmit() {
    const userId = document.getElementById('user-id-input').value.trim();
    const submitButton = document.getElementById('submit-user-id');
    const loadingIndicator = document.getElementById('user-id-loading');
    const messageElement = document.getElementById('user-id-message');
    if (!userId) {
        if (messageElement) {
            messageElement.textContent = 'Please enter your User ID';
        }
        return;
    }
    if (messageElement) {
        messageElement.textContent = '';
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = 'inline-flex';
    }
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Checking...';
    }
    
    try {
        // Check if user exists
        const response = await fetch('https://script.google.com/macros/s/AKfycbwKFpfr_FR8cr4LemaA1W-tdx6V7QYe3KZIj7UJLTJCN2r6a9iDfJmT6TBz6g8V8rcB/exec?action=checkUser&userId=' + encodeURIComponent(userId));
        const data = await response.json();
        
        if (data.exists) {
            testState.userId = userId;
            testState.demographics = data.demographics || {};

            const nativeEnglish = testState.demographics.nativeEnglish;
            if (nativeEnglish === 'Y') {
                testState.wordBank = 'native';
            } else if (nativeEnglish === 'N') {
                testState.wordBank = 'nonNative';
            }

            const isColorblind = testState.demographics.isColorblind === true || testState.demographics.isColorblind === 'Y';
            testState.isColorblind = isColorblind;
            if (isColorblind) {
                document.body.classList.add('colorblind-mode');
            } else {
                document.body.classList.remove('colorblind-mode');
            }

            updateParticipantIdDisplay();

            if (!WORD_DATABASE) {
                await loadWordBank();
            } else {
                initializeWordSets();
            }

            showOnly('test-area');
            
            // Show user ID in the interface if there's a display element
            const displayElement = document.getElementById('display-user-id');
            if (displayElement) {
                displayElement.textContent = testState.userId;
                const participantDisplay = document.querySelector('.participant-id-display');
                if (participantDisplay) {
                    participantDisplay.style.display = 'block';
                }
            }
            
            // Start the test
            testState.studyWords = selectRandomWords();
            testState.startTime = new Date();
            createDevControls();
            startStudyPhase();
        } else {
            if (messageElement) {
                messageElement.textContent = 'User ID not found. Please try again or take as a new participant.';
            }
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
        if (messageElement) {
            messageElement.textContent = 'Error checking user ID. Please try again.';
        }
    }
    finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Continue';
        }
    }
}

function startTest() {
    // Show test area only
    showOnly('test-area');
    updateParticipantIdDisplay();
    
    // Initialize test
    testState.studyWords = selectRandomWords();
    testState.startTime = new Date();
    
    // Show dev controls
    createDevControls();
    
    startStudyPhase();
}

function startStudyPhase() {
    testState.currentSet = 0;
    testState.learnedInCurrentSet = 0;
    testState.currentPhase = 'study';
    testState.currentCardIndex = 0;
    showStudyItem();
}

function showStudyItem() {
    const totalCards = testState.totalCards || 4;
    const currentCardNumber = (testState.currentCardIndex || 0) + 1;
    const currentWords = testState.studyWords.filter(word => word.card === currentCardNumber);
    const unlearnedWords = currentWords.filter(word => !word.learned);
    
    if (unlearnedWords.length === 0) {
        testState.currentCardIndex++;
        if (testState.currentCardIndex >= totalCards) {
            console.log('Study phase complete');
            startRecallPhase();
            return;
        }
        showStudyItem();
        return;
    }
    
    const targetWord = unlearnedWords[Math.floor(Math.random() * unlearnedWords.length)];
    
    const cueElement = document.getElementById('study-cue');
    const gridElement = document.getElementById('study-grid');
    const progressElement = document.getElementById('study-progress');
    
    // Update progress
    const totalLearned = testState.studyWords.filter(w => w.learned).length;
    const totalWords = testState.studyWords.length;
    const progress = (totalLearned / totalWords) * 100;
    const progressBar = progressElement.querySelector('.progress-bar');
    progressBar.style.width = progress + '%';
    if (progressBar.textContent) {
        progressBar.textContent = '';
    }
    
    // Show cue for target word's category
    cueElement.textContent = `Which one is ${'aeiou'.includes(targetWord.category[0].toLowerCase()) ? 'an' : 'a'} ${targetWord.category}?`;
    
    // Clear previous words and display current card's words
    gridElement.innerHTML = '';
    
    // Display each word in the current card
    currentWords.forEach(wordObj => {
        const div = document.createElement('div');
        const isTarget = wordObj.word === targetWord.word;
        div.className = wordObj.learned ? 'study-item correct' : 'study-item';
        div.textContent = wordObj.word;

        
        if (!wordObj.learned) {
            div.onclick = () => selectStudyItem(isTarget, div, wordObj);
            div.style.cursor = 'pointer';
            div.style.transition = 'all 0.3s ease';
            div.onmouseover = () => { div.style.transform = 'scale(1.05)'; };
            div.onmouseout = () => { div.style.transform = 'scale(1)'; };
        } else {
            div.style.opacity = '0.7';
        }
        
        gridElement.appendChild(div);
    });
    
    // Update the target word for this trial
    testState.currentTargetWord = targetWord;
    
    // Record the start time for this study item
    testState.studyStartTime = new Date();
}

function selectStudyItem(isCorrect, element, wordObj) {
    wordObj.attempts++;
    
    // Calculate reaction time
    const reactionTime = new Date() - testState.studyStartTime;
    testState.studyTimes.push({
        word: wordObj.word,
        category: wordObj.category,
        set: wordObj.set,
        reactionTime: reactionTime,
        correct: isCorrect
    });
    
    if (isCorrect) {
        wordObj.learned = true;
        element.className = 'study-item correct';
        testState.learnedInCurrentSet++;
        
        setTimeout(() => {
            showStudyItem();
            updateDevControls(); // Update dev controls after each word learned
        }, 1000);
    } else {
        element.className = 'study-item incorrect';
        setTimeout(() => {
            element.className = 'study-item';
            updateDevControls(); // Update dev controls after each attempt
        }, 1000);
    }
}

function startRecallPhase() {
    testState.currentPhase = 'recall';
    testState.recallTrial = 0;
    showRecallInterface();
}

function showRecallInterface() {
    const testArea = document.getElementById('test-area');
    
    if (testState.recallTrial < 3) {
        // Free recall trials
        testArea.innerHTML = `
            <div class="recall-interface recall-interface--free">
                <h2 class="screen-title screen-title--centered">Trial ${testState.recallTrial + 1} · Free recall</h2>
                <p class="screen-subtitle screen-subtitle--centered">Type all the words you remember from the study phase (one word per line).</p>
                <textarea id="recall-input" class="input recall-textarea" placeholder="Enter words, one per line..."></textarea>
                <div class="recall-actions">
                    <button id="recall-submit" class="btn btn-primary btn-lg">Submit recall</button>
                </div>
                <div id="recalled-words-display" class="recall-results"></div>
            </div>
        `;
        
        document.getElementById('recall-submit').onclick = submitFreeRecall;
        
        // Record the start time for this free recall trial
        testState.freeRecallStartTime = new Date();
    } else {
        // Start the memory test
        startMemoryTest();
    }
}

function submitFreeRecall() {
    // Calculate reaction time
    const reactionTime = new Date() - testState.freeRecallStartTime;
    testState.freeRecallTimes.push(reactionTime);
    
    const input = document.getElementById('recall-input').value;
    const recalledWords = input.toLowerCase().split(/\n/).map(w => w.trim()).filter(w => w);
    
    // Check which words were correctly recalled
    const correctWords = [];
    const studyWordsList = testState.studyWords.map(w => w.word.toLowerCase());
    
    recalledWords.forEach(word => {
        if (studyWordsList.includes(word)) {
            correctWords.push(word);
        }
    });
    
    testState.results.freeRecall[testState.recallTrial] = correctWords;
    testState.recalledWords = correctWords;
    
    // Show cued recall for words not freely recalled
    showCuedRecall();
}

function showCuedRecall() {
    const testArea = document.getElementById('test-area');
    const notRecalled = testState.studyWords.filter(w => 
        !testState.recalledWords.includes(w.word.toLowerCase())
    );
    
    if (notRecalled.length === 0) {
        // All words were recalled - perfect free recall, skip cued recall
        testState.results.cuedRecall[testState.recallTrial] = ["skip"];
        testState.cuedRecallTimes.push(0); // No time spent on cued recall
        testState.recallTrial++;
        
        // Show brief feedback
        testArea.innerHTML = `
            <div class="recall-interface recall-interface--feedback">
                <h2 class="screen-title screen-title--centered">Perfect recall! ✓</h2>
                <p class="screen-subtitle screen-subtitle--centered">You recalled all words correctly. Cued recall is not needed.</p>
                <p class="screen-subtitle screen-subtitle--centered">Moving to the next trial...</p>
            </div>
        `;
        
        setTimeout(() => {
            showRecallInterface();
        }, 2000);
        return;
    }
    
    // Group missed words by category
    const missedByCategory = {};
    notRecalled.forEach(wordObj => {
        if (!missedByCategory[wordObj.category]) {
            missedByCategory[wordObj.category] = [];
        }
        missedByCategory[wordObj.category].push(wordObj);
    });
    
    testArea.innerHTML = `
        <div class="recall-interface recall-interface--cued">
            <h2 class="screen-title screen-title--centered">Trial ${testState.recallTrial + 1} · Cued recall</h2>
            <p class="screen-subtitle screen-subtitle--centered">For each category, try to recall any words you remember.</p>
            <div id="cued-recall-container" class="cued-recall-container"></div>
        </div>
    `;
    
    const categories = Object.keys(missedByCategory);
    testState.currentCuedIndex = 0;
    testState.cuedRecallResults = [];
    testState.missedByCategory = missedByCategory;
    testState.categoriesWithMissedWords = categories;
    showNextCategoryPrompt();
}

function showNextCategoryPrompt() {
    if (testState.currentCuedIndex >= testState.categoriesWithMissedWords.length) {
        testState.results.cuedRecall[testState.recallTrial] = testState.cuedRecallResults;
        testState.recallTrial++;
        showRecallInterface();
        return;
    }
    
    const currentCategory = testState.categoriesWithMissedWords[testState.currentCuedIndex];
    const missedInCategory = testState.missedByCategory[currentCategory];
    const container = document.getElementById('cued-recall-container');
    
    container.innerHTML = `
        <div class="cued-item">
            <p class="screen-subtitle screen-subtitle--centered">What ${currentCategory === 'animal' ? 'animals' : `${currentCategory}s`} do you remember? (Enter each word on a new line.)</p>
            <textarea id="cued-input" class="input" placeholder="Enter words, one per line..." rows="4"></textarea>
            <div id="cued-feedback" class="cued-feedback"></div>
            <div class="recall-actions">
                <button id="cued-submit" class="btn btn-primary">Submit</button>
            </div>
        </div>
    `;
    
    document.getElementById('cued-input').focus();
    document.getElementById('cued-submit').onclick = () => submitCategoryAnswer(currentCategory, missedInCategory);
    
    // Allow Ctrl+Enter to submit
    document.getElementById('cued-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            submitCategoryAnswer(currentCategory, missedInCategory);
        }
    });
    
    // Record the start time for this cued recall category
    testState.cuedRecallStartTime = new Date();
}

function submitCategoryAnswer(currentCategory, missedInCategory) {
    // Calculate reaction time
    const reactionTime = new Date() - testState.cuedRecallStartTime;
    testState.cuedRecallTimes.push(reactionTime);
    
    const input = document.getElementById('cued-input').value;
    const inputWords = input.toLowerCase().split(/\n/).map(w => w.trim()).filter(w => w);
    
    // Check which words from this category were correctly recalled
    const correctWordsInCategory = [];
    const missedWordsList = missedInCategory.map(w => w.word.toLowerCase());
    
    inputWords.forEach(word => {
        if (missedWordsList.includes(word)) {
            correctWordsInCategory.push(word);
        }
    });
    
    // Add to overall cued recall results
    testState.cuedRecallResults.push(...correctWordsInCategory);
    
    // Show feedback
    const inputElement = document.getElementById('cued-input');
    const feedbackElement = document.getElementById('cued-feedback');
    const submitButton = document.getElementById('cued-submit');
    
    // Compute the words that are still missed in this category (not recalled in cued recall)
    const stillMissedWords = missedInCategory
        .filter(w => !correctWordsInCategory.includes(w.word.toLowerCase()))
        .map(w => w.word);
    
    if (correctWordsInCategory.length > 0) {
        feedbackElement.textContent = `You recalled ${correctWordsInCategory.length} word(s) correctly! The missed ${currentCategory} words were: ${stillMissedWords.join(', ')}`;
        feedbackElement.style.color = 'green';
        inputElement.style.backgroundColor = '#d4edda';
    } else {
        feedbackElement.textContent = `No correct words recalled. The ${currentCategory} words were: ${stillMissedWords.join(', ')}`;
        feedbackElement.style.color = 'red';
        inputElement.style.backgroundColor = '#f8d7da';
    }
    
    // Disable input and submit button
    inputElement.disabled = true;
    submitButton.textContent = 'Next';
    submitButton.classList.remove('btn-primary');
    submitButton.classList.add('btn-secondary');
    submitButton.disabled = false;
    submitButton.onclick = () => {
        testState.currentCuedIndex++;
        showNextCategoryPrompt();
    };
}

function startMemoryTest() {
    testState.memoryTestStartTime = new Date();
    testState.memoryTestLevel = 1;
    testState.memoryTestScore = 0;
    testState.memoryTestRounds = 0;
    testState.memoryTestMistakes = 0;
    testState.memoryTestMinRounds = 10;
    testState.memoryTestMaxRounds = 14;
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="memory-test-interface">
            <h2 class="screen-title screen-title--centered">Memory challenge</h2>
            <p class="screen-subtitle screen-subtitle--centered">Memorize the number sequence, then type it back when prompted.</p>
            
            <div id="number-display" class="sequence-display"></div>
            
            <div id="input-container" class="sequence-input" style="display: none;">
                <input type="text" id="number-input" class="input sequence-field" 
                       placeholder="Type the numbers..." maxlength="${testState.memoryTestLevel + 2}">
                <button id="submit-sequence" class="btn btn-primary">Submit</button>
            </div>
            
            <div id="memory-feedback" class="sequence-feedback"></div>
            
            <div id="memory-progress" class="sequence-progress">
                <p><strong>Round:</strong> <span id="memory-round">1</span>/<span id="memory-total-rounds">10-14</span></p>
                <p><strong>Level:</strong> <span id="memory-level">1</span></p>
                <p><strong>Score:</strong> <span id="memory-score">0</span></p>
            </div>
        </div>
    `;

    document.getElementById('submit-sequence').addEventListener('click', checkSequence);
    document.getElementById('number-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkSequence();
    });

    startNewRound();
}

function startNewRound() {
    const length = testState.memoryTestLevel + 2; // Increase sequence length with level
    const sequence = Array.from({length}, () => Math.floor(Math.random() * 10)).join('');
    
    testState.currentSequence = sequence;
    const display = document.getElementById('number-display');
    const input = document.getElementById('number-input');
    
    // Show sequence
    display.textContent = sequence;
    input.value = '';
    input.maxLength = length;
    
    // Hide input while showing sequence
    document.getElementById('input-container').style.display = 'none';
    
    // Update round display
    const roundDisplay = document.getElementById('memory-round');
    const totalRoundsDisplay = document.getElementById('memory-total-rounds');
    if (roundDisplay) roundDisplay.textContent = testState.memoryTestRounds + 1;
    if (totalRoundsDisplay) {
        totalRoundsDisplay.textContent = testState.memoryTestMistakes === 0 ? 
            testState.memoryTestMaxRounds : 
            testState.memoryTestMinRounds;
    }
    
    // Hide sequence and show input after delay
    setTimeout(() => {
        display.textContent = '?'.repeat(length);
        document.getElementById('input-container').style.display = 'block';
        input.focus();
    }, 2000 + (length * 300)); // Longer display time for longer sequences
}

function checkSequence() {
    const input = document.getElementById('number-input');
    const feedback = document.getElementById('memory-feedback');
    const userInput = input.value;
    
    // Increment round counter
    testState.memoryTestRounds++;
    
    if (userInput === testState.currentSequence) {
        // Correct answer
        testState.memoryTestScore += testState.memoryTestLevel * 10;
        testState.memoryTestLevel++;
        feedback.textContent = '✓ Correct!';
        feedback.style.color = '#27ae60';
    } else {
        // Incorrect answer
        testState.memoryTestMistakes++;
        feedback.textContent = `Incorrect. The sequence was: ${testState.currentSequence}`;
        feedback.style.color = '#e74c3c';
    }
    
    // Update UI
    document.getElementById('memory-level').textContent = testState.memoryTestLevel;
    document.getElementById('memory-score').textContent = testState.memoryTestScore;
    document.getElementById('memory-round').textContent = Math.min(testState.memoryTestRounds + 1, testState.memoryTestMaxRounds);
    
    // Check if we should continue or end the test
    const minRoundsComplete = testState.memoryTestRounds >= testState.memoryTestMinRounds;
    const maxRoundsReached = testState.memoryTestRounds >= testState.memoryTestMaxRounds;
    const perfectSoFar = testState.memoryTestMistakes === 0;
    
    if ((minRoundsComplete && !perfectSoFar) || maxRoundsReached) {
        // End test if we've reached the minimum rounds with at least one mistake,
        // or if we've reached the maximum number of rounds
        setTimeout(endMemoryTest, 1000);
    } else {
        // Continue to next round
        setTimeout(startNewRound, 1000);
    }
}

function endMemoryTest() {
    // Calculate effectiveness score based on level reached and time taken
    const timeTaken = (new Date() - testState.memoryTestStartTime) / 1000; // in seconds
    const effectiveness = Math.min(100, Math.floor((testState.memoryTestLevel / 10) * 100));
    
    testState.memoryTestEffectiveness = effectiveness;
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="recall-interface recall-interface--feedback">
            <h2 class="screen-title screen-title--centered">Memory challenge complete!</h2>
            <p class="screen-subtitle screen-subtitle--centered">You reached level ${testState.memoryTestLevel} with a score of ${testState.memoryTestScore}.</p>
            <p class="screen-subtitle screen-subtitle--centered">Now we'll continue with the final memory test.</p>
        </div>
    `;
    
    setTimeout(() => {
        startDelayedRecall();
    }, 3000);
}

function startDelayedRecall() {
    testState.currentPhase = 'delayed';
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="recall-interface recall-interface--free">
            <h2 class="screen-title screen-title--centered">Final free recall</h2>
            <p class="screen-subtitle screen-subtitle--centered">Try to remember all the words from the beginning of the test (one word per line).</p>
            <textarea id="delayed-recall-input" class="input recall-textarea" placeholder="Enter words, one per line..."></textarea>
            <div class="recall-actions">
                <button id="delayed-recall-submit" class="btn btn-primary btn-lg">Submit recall</button>
            </div>
        </div>
    `;
    
    document.getElementById('delayed-recall-submit').onclick = submitDelayedFreeRecall;
    
    // Record the start time for delayed free recall
    testState.delayedFreeRecallStartTime = new Date();
}

function submitDelayedFreeRecall() {
    // Calculate reaction time
    const reactionTime = new Date() - testState.delayedFreeRecallStartTime;
    testState.delayedFreeRecallTime = reactionTime;
    
    const input = document.getElementById('delayed-recall-input').value;
    const recalledWords = input.toLowerCase().split(/\n/).map(w => w.trim()).filter(w => w);
    
    // Check which words were correctly recalled
    const correctWords = [];
    const studyWordsList = testState.studyWords.map(w => w.word.toLowerCase());
    
    recalledWords.forEach(word => {
        if (studyWordsList.includes(word)) {
            correctWords.push(word);
        }
    });
    
    testState.results.delayedFree = correctWords;
    testState.recalledWords = correctWords;
    
    // Show delayed cued recall
    showDelayedCuedRecall();
}

function showDelayedCuedRecall() {
    const testArea = document.getElementById('test-area');
    const notRecalled = testState.studyWords.filter(w => 
        !testState.recalledWords.includes(w.word.toLowerCase())
    );
    
    if (notRecalled.length === 0) {
        // All words were recalled - perfect delayed free recall, skip delayed cued recall
        testState.results.delayedCued = ["skip"];
        testState.delayedCuedRecallTimes = [0]; // No time spent on delayed cued recall
        
        // Show brief feedback
        testArea.innerHTML = `
            <div class="recall-interface recall-interface--feedback">
                <h2 class="screen-title screen-title--centered">Perfect delayed recall! ✓</h2>
                <p class="screen-subtitle screen-subtitle--centered">You recalled all words correctly. Cued recall is not needed.</p>
                <p class="screen-subtitle screen-subtitle--centered">Finishing test...</p>
            </div>
        `;
        
        setTimeout(() => {
            finishTest();
        }, 2000);
        return;
    }
    
    // Group missed words by category
    const missedByCategory = {};
    notRecalled.forEach(wordObj => {
        if (!missedByCategory[wordObj.category]) {
            missedByCategory[wordObj.category] = [];
        }
        missedByCategory[wordObj.category].push(wordObj);
    });
    
    testArea.innerHTML = `
        <div class="recall-interface recall-interface--cued">
            <h2 class="screen-title screen-title--centered">Final cued recall</h2>
            <p class="screen-subtitle screen-subtitle--centered">For each category, try to recall any remaining words.</p>
            <div id="delayed-cued-container" class="cued-recall-container"></div>
        </div>
    `;
    
    const categories = Object.keys(missedByCategory);
    testState.currentCuedIndex = 0;
    testState.delayedCuedResults = [];
    testState.delayedMissedByCategory = missedByCategory;
    testState.delayedCategoriesWithMissedWords = categories;
    showNextDelayedCategoryPrompt();
}

function showNextDelayedCategoryPrompt() {
    if (testState.currentCuedIndex >= testState.delayedCategoriesWithMissedWords.length) {
        testState.results.delayedCued = testState.delayedCuedResults;
        finishTest();
        return;
    }
    
    const currentCategory = testState.delayedCategoriesWithMissedWords[testState.currentCuedIndex];
    const missedInCategory = testState.delayedMissedByCategory[currentCategory];
    const container = document.getElementById('delayed-cued-container');
    
    container.innerHTML = `
        <div class="cued-item">
            <p class="screen-subtitle screen-subtitle--centered">What ${currentCategory === 'animal' ? 'animals' : `${currentCategory}s`} do you remember? (Enter each word on a new line)</p>
            <textarea id="delayed-cued-input" class="input" placeholder="Enter words, one per line..." rows="4"></textarea>
            <div id="delayed-cued-feedback" class="cued-feedback"></div>
            <div class="recall-actions">
                <button id="delayed-cued-submit" class="btn btn-primary">Submit</button>
            </div>
        </div>
    `;
    
    document.getElementById('delayed-cued-input').focus();
    document.getElementById('delayed-cued-submit').onclick = () => submitDelayedCategoryAnswer(currentCategory, missedInCategory);
    
    // Allow Ctrl+Enter to submit
    document.getElementById('delayed-cued-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            submitDelayedCategoryAnswer(currentCategory, missedInCategory);
        }
    });
    
    // Record the start time for this delayed cued recall category
    testState.delayedCuedRecallStartTime = new Date();
}

function submitDelayedCategoryAnswer(currentCategory, missedInCategory) {
    // Calculate reaction time
    const reactionTime = new Date() - testState.delayedCuedRecallStartTime;
    testState.delayedCuedRecallTimes.push(reactionTime);
    
    const input = document.getElementById('delayed-cued-input').value;
    const inputWords = input.toLowerCase().split(/\n/).map(w => w.trim()).filter(w => w);
    
    // Check which words from this category were correctly recalled
    const correctWordsInCategory = [];
    const missedWordsList = missedInCategory.map(w => w.word.toLowerCase());
    
    inputWords.forEach(word => {
        if (missedWordsList.includes(word)) {
            correctWordsInCategory.push(word);
        }
    });
    
    // Add to overall delayed cued recall results
    testState.delayedCuedResults.push(...correctWordsInCategory);
    
    // Immediately advance to the next category
    testState.currentCuedIndex++;
    showNextDelayedCategoryPrompt();
}

function finishTest() {
    const testArea = document.getElementById('test-area');
    const endTime = new Date();
    const duration = Math.round((endTime - testState.startTime) / 1000 / 60); // minutes
    
    // Calculate scores
    const totalWords = testState.studyWords.length;
    const freeRecallScores = testState.results.freeRecall.map(trial => trial.length);
    const cuedRecallScores = testState.results.cuedRecall.map(trial => trial.length);
    const delayedFreeScore = testState.results.delayedFree.length;
    const delayedCuedScore = testState.results.delayedCued.length;
    
    testArea.innerHTML = `
        <div class="screen-card results-display">
            <h2 class="screen-title screen-title--centered">Test complete</h2>
            <div class="results-user-id">
                <span class="results-user-id__label">Participant ID:</span>
                <span id="results-user-id" class="results-user-id__value">${testState.userId || ''}</span>
                <button id="copy-user-id" class="btn btn-secondary" type="button">Copy ID</button>
            </div>
            <div class="results-summary">
                <h3>Results summary</h3>
                <p><strong>Test duration:</strong> ${duration} minutes</p>
                <p><strong>Total words:</strong> ${totalWords}</p>
                
                <h4>Immediate recall (3 trials)</h4>
                <p><strong>Free recall scores:</strong> ${freeRecallScores.join(', ')} / ${totalWords}</p>
                <p><strong>Total cued recall:</strong> ${cuedRecallScores.reduce((a, b) => a + b, 0)} words</p>
                
                <h4>Delayed recall</h4>
                <p><strong>Delayed free recall:</strong> ${delayedFreeScore} / ${totalWords}</p>
                <p><strong>Delayed cued recall:</strong> ${delayedCuedScore} words</p>
                
                <h4>Total recall score</h4>
                <p><strong>Best free recall:</strong> ${Math.max(...freeRecallScores)} / ${totalWords}</p>
                <p><strong>Total recall (free + cued):</strong> ${Math.max(...freeRecallScores) + Math.max(...cuedRecallScores)} / ${totalWords}</p>
            </div>
            
            <div id="upload-status" class="upload-status upload-status--pending">
                <p class="upload-status__title">⏳ Uploading results...</p>
                <p class="upload-status__hint">Please do not close this page until upload is complete.</p>
            </div>
            
            <div id="action-buttons" class="results-actions" style="display: none;">
                <button id="restart-test" class="btn btn-success">Take test again</button>
            </div>
        </div>
    `;
    updateParticipantIdDisplay();
    const copyBtn = document.getElementById('copy-user-id');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!testState.userId) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(testState.userId).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy ID';
                    }, 2000);
                }).catch(() => {
                    copyBtn.textContent = 'Copy Failed';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy ID';
                    }, 2000);
                });
            }
        });
    }
    
    // Automatically upload results
    uploadResults();
}

function downloadResults() {
    // Prepare data for CSV
    const data = {
        // Demographics
        userId: testState.userId,
        ...testState.demographics,
        
        // Test metadata
        testDate: new Date().toISOString(),
        duration: Math.round((new Date() - testState.startTime) / 1000 / 60),
        
        // Study times: we'll stringify the array
        studyTimes: JSON.stringify(testState.studyTimes),
        
        // Free recall
        freeRecallTimes: JSON.stringify(testState.freeRecallTimes),
        freeRecallResults: JSON.stringify(testState.results.freeRecall),
        
        // Cued recall
        cuedRecallTimes: JSON.stringify(testState.cuedRecallTimes),
        cuedRecallResults: JSON.stringify(testState.results.cuedRecall),
        
        // Delayed free recall
        delayedFreeRecallTime: testState.delayedFreeRecallTime,
        delayedFreeResults: JSON.stringify(testState.results.delayedFree),
        
        // Delayed cued recall
        delayedCuedRecallTimes: JSON.stringify(testState.delayedCuedRecallTimes),
        delayedCuedResults: JSON.stringify(testState.results.delayedCued),
        
        // Word list
        wordList: JSON.stringify(testState.studyWords.map(w => ({
            word: w.word,
            category: w.category,
            set: w.set,
            learned: w.learned,
            attempts: w.attempts
        })))
    };
    
    // Convert to CSV
    const csvHeaders = Object.keys(data);
    const csvRow = csvHeaders.map(header => {
        // Escape quotes and wrap in quotes if contains comma
        let value = data[header];
        if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
        }
        return value;
    });
    
    const csvContent = [csvHeaders.join(','), csvRow.join(',')].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FCSRT_${testState.userId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function uploadResults() {
    // Prepare data for upload - stringify complex data for Apps Script
    const data = {
        userId: testState.userId,
        initials: testState.demographics.initials,
        birthYear: testState.demographics.birthYear,
        age: testState.demographics.age,
        gender: testState.demographics.gender,
        education: testState.demographics.education,
        nativeEnglish: testState.demographics.nativeEnglish,
        testDate: new Date().toISOString(),
        duration: Math.round((new Date() - testState.startTime) / 1000 / 60),
        studyTimes: JSON.stringify(testState.studyTimes),
        freeRecallTimes: JSON.stringify(testState.freeRecallTimes),
        freeRecallResults: JSON.stringify(testState.results.freeRecall),
        cuedRecallTimes: JSON.stringify(testState.cuedRecallTimes),
        cuedRecallResults: JSON.stringify(testState.results.cuedRecall),
        stroopEffectivenessScore: testState.stroopEffectivenessScore,
        stroopTrials: JSON.stringify(testState.stroopTrials),
        delayedFreeRecallTime: testState.delayedFreeRecallTime,
        delayedFreeResults: JSON.stringify(testState.results.delayedFree),
        delayedCuedRecallTimes: JSON.stringify(testState.delayedCuedRecallTimes),
        delayedCuedResults: JSON.stringify(testState.results.delayedCued),
        wordList: JSON.stringify(testState.studyWords.map(w => ({
            word: w.word,
            category: w.category,
            set: w.set,
            learned: w.learned,
            attempts: w.attempts
        })))
    };
    
    // Use the provided Google Apps Script URL for uploading results
    const endpointUrl = 'https://script.google.com/macros/s/AKfycbwKFpfr_FR8cr4LemaA1W-tdx6V7QYe3KZIj7UJLTJCN2r6a9iDfJmT6TBz6g8V8rcB/exec';
    
    fetch(endpointUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        // With no-cors mode, we can't check response.ok, so we assume success
        setTimeout(() => showUploadSuccess(), 1000);
    })
    .catch(error => {
        console.error('Upload error:', error);
        showUploadFailure();
    });
}

function showUploadSuccess() {
    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) {
        uploadStatus.innerHTML = `
            <p class="upload-status__title upload-status__title--success">✓ Results uploaded successfully!</p>
            <p class="upload-status__hint upload-status__hint--success">Thank you for completing the test. Your data has been saved.</p>
        `;
        uploadStatus.classList.remove('upload-status--pending');
        uploadStatus.classList.add('upload-status--success');
    }
    
    // Show restart button
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'block';
        document.getElementById('restart-test').onclick = () => location.reload();
    }
}

function showUploadFailure() {
    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) {
        uploadStatus.innerHTML = `
            <p class="upload-status__title upload-status__title--error">✗ Upload failed</p>
            <p class="upload-status__hint upload-status__hint--error">We couldn't upload your results automatically. Please download them and email to:</p>
            <p class="upload-status__hint upload-status__hint--error"><strong>fcsrt.data@example.com</strong></p>
            <p class="upload-status__hint upload-status__hint--error">Subject line: <strong>Failed Data Upload</strong></p>
            <button id="download-results" class="btn btn-secondary">Download results</button>
        `;
        uploadStatus.classList.remove('upload-status--pending');
        uploadStatus.classList.add('upload-status--error');
        
        // Attach download handler
        document.getElementById('download-results').onclick = downloadResults;
    }
    
    // Show restart button
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) {
        actionButtons.style.display = 'block';
        document.getElementById('restart-test').onclick = () => location.reload();
    }
}

// Dev Controls Functions
function createDevControls() {
    if (document.getElementById('dev-controls')) return; // Prevent duplicate creation
    
    const devPanel = document.createElement('div');
    devPanel.id = 'dev-controls';
    devPanel.innerHTML = `
        <div class="dev-header">
            <h3>🔧 Dev Controls (Alpha)</h3>
            <button id="toggle-dev" class="dev-btn-small">−</button>
        </div>
        <div class="dev-content">
            <div class="dev-section">
                <h4>Test Words</h4>
                <div id="dev-words-list"></div>
            </div>
            <div class="dev-section">
                <h4>Quick Navigation</h4>
                <button class="dev-btn" onclick="devSkipToRecall()">Skip to Recall</button>
                <button class="dev-btn" onclick="devSkipToDelayed()">Skip to Delayed</button>
                <button class="dev-btn" onclick="devSkipToResults()">Skip to Results</button>
                <button class="dev-btn" onclick="devCompleteStudy()">Complete Study</button>
            </div>
            <div class="dev-section">
                <h4>Current State</h4>
                <div id="dev-status"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(devPanel);
    
    // Toggle functionality
    document.getElementById('toggle-dev').onclick = function() {
        const content = devPanel.querySelector('.dev-content');
        const toggle = this;
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '−';
        } else {
            content.style.display = 'none';
            toggle.textContent = '+';
        }
    };
    
    updateDevControls();
}

function updateDevControls() {
    const devPanel = document.getElementById('dev-controls');
    if (!devPanel) return;
    
    // Update words list
    const wordsList = devPanel.querySelector('#dev-words-list');
    if (testState.studyWords && testState.studyWords.length > 0) {
        const categorizedWords = {};
        testState.studyWords.forEach(wordObj => {
            if (!categorizedWords[wordObj.category]) {
                categorizedWords[wordObj.category] = [];
            }
            categorizedWords[wordObj.category].push(wordObj);
        });
        
        let wordsHTML = '';
        Object.keys(categorizedWords).forEach(category => {
            wordsHTML += `<div class="dev-category">
                <strong>${category}:</strong> 
                ${categorizedWords[category].map(w => 
                    `<span class="dev-word ${w.learned ? 'learned' : ''}">${w.word}</span>`
                ).join(', ')}
            </div>`;
        });
        wordsList.innerHTML = wordsHTML;
    }
    
    // Update status
    const status = devPanel.querySelector('#dev-status');
    const totalSets = testState.wordSets ? testState.wordSets.length : 1;
    const totalWords = testState.studyWords ? testState.studyWords.length : 16;
    status.innerHTML = `
        <div><strong>Phase:</strong> ${testState.currentPhase}</div>
        <div><strong>Set:</strong> ${Math.min(testState.currentSet + 1, totalSets)}/${totalSets}</div>
        <div><strong>Trial:</strong> ${testState.recallTrial + 1}</div>
        <div><strong>Learned:</strong> ${testState.studyWords ? testState.studyWords.filter(w => w.learned).length : 0}/${totalWords}</div>
    `;
}

// Dev skip functions
function devSkipToRecall() {
    // Complete all study phases
    testState.studyWords.forEach(word => word.learned = true);
    testState.currentSet = 4;
    testState.currentPhase = 'recall';
    testState.recallTrial = 0;
    startRecallPhase();
    updateDevControls();
}

function devSkipToDelayed() {
    // Complete study and immediate recall
    testState.studyWords.forEach(word => word.learned = true);
    testState.currentPhase = 'delayed';
    testState.recallTrial = 3;
    // Fill in some dummy recall data
    testState.results.freeRecall = [['dog', 'chair'], ['cat', 'table'], ['hammer']];
    testState.results.cuedRecall = [['elephant'], ['saw'], []];
    startDelayedRecall();
    updateDevControls();
}

function devSkipToResults() {
    // Complete everything and show results
    testState.studyWords.forEach(word => word.learned = true);
    testState.currentPhase = 'complete';
    // Fill in dummy data
    testState.results.freeRecall = [['dog', 'chair', 'hammer'], ['cat', 'table', 'saw'], ['elephant', 'shirt']];
    testState.results.cuedRecall = [['tiger'], ['wrench'], ['pants']];
    testState.results.delayedFree = ['dog', 'chair', 'cat'];
    testState.results.delayedCued = ['hammer', 'tiger'];
    finishTest();
    updateDevControls();
}

function devCompleteStudy() {
    // Just complete the study phase
    testState.studyWords.forEach(word => word.learned = true);
    testState.currentSet = 4;
    startRecallPhase();
    updateDevControls();
}