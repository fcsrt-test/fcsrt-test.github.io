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
    results: {
        freeRecall: [[], [], []],
        cuedRecall: [[], [], []],
        delayedFree: [],
        delayedCued: [],
        studyAttempts: []
    }
};

let WORD_DATABASE = null;
//gotta change smth

// Load word bank from JSON file
async function loadWordBank() {
    try {
        const response = await fetch('words.json');
        WORD_DATABASE = await response.json();
        console.log('Word bank loaded successfully');
    } catch (error) {
        console.error('Failed to load word bank:', error);
        // Fallback word bank in case JSON fails to load
        WORD_DATABASE = {
            animal: ['dog', 'cat', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'rabbit'],
            tool: ['hammer', 'screwdriver', 'wrench', 'saw', 'drill', 'pliers', 'chisel', 'file'],
            furniture: ['chair', 'table', 'sofa', 'bed', 'desk', 'bookshelf', 'dresser', 'cabinet'],
            clothing: ['shirt', 'pants', 'shoes', 'hat', 'jacket', 'socks', 'dress', 'sweater']
        };
    }
}

function selectRandomWords() {
    if (!WORD_DATABASE) {
        console.error('Word database not loaded');
        return [];
    }
    
    const categories = Object.keys(WORD_DATABASE);
    const selectedWords = [];
    
    // Create 4 sets of 4 words (one from each category per set)
    for (let set = 0; set < 4; set++) {
        const setWords = [];
        categories.forEach(category => {
            const availableWords = WORD_DATABASE[category].filter(word => 
                !selectedWords.some(w => w.word === word)
            );
            const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            setWords.push({
                word: randomWord,
                category: category,
                set: set,
                learned: false,
                attempts: 0
            });
        });
        
        // Shuffle words within the set
        setWords.sort(() => 0.5 - Math.random());
        selectedWords.push(...setWords);
    }
    
    return selectedWords;
}


function showDemographicsScreen() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('demographics-screen').style.display = 'block';
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
    const priorTesting = document.getElementById('prior-testing').value;
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(birthYear);
    
    testState.userId = generateUserId(initials, birthYear);
    
    testState.demographics = {
        userId: testState.userId,
        initials: initials.toUpperCase(),
        birthYear: parseInt(birthYear),
        age: age,
        gender: gender,
        education: education,
        nativeEnglish: nativeEnglish,
        priorTesting: priorTesting,
        testDate: new Date().toISOString()
    };
    
    document.getElementById('display-user-id').textContent = testState.userId;
    document.querySelector('.participant-id-display').style.display = 'block';
    
    setTimeout(() => {
        startTest();
    }, 2000);
}

// Initialize the test when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    await loadWordBank();
    
    const beginTestButton = document.getElementById('begin-test');
    const demographicsForm = document.getElementById('demographics-form');
    
    if (beginTestButton) {
        beginTestButton.addEventListener('click', showDemographicsScreen);  // CHANGED
    } else {
        console.error("Element with ID 'begin-test' not found.");
    }
    
    if (demographicsForm) {
        demographicsForm.addEventListener('submit', handleDemographicsSubmit);  // ADDED
    }
});

function startTest() {
    // Hide demographics screen (not welcome screen)
    document.getElementById('demographics-screen').style.display = 'none';
    
    // Show test area
    document.getElementById('test-area').style.display = 'block';
    
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
    showStudyItem();
}

function showStudyItem() {
    const currentSet = testState.studyWords.filter(w => w.set === testState.currentSet);
    const unlearnedWords = currentSet.filter(w => !w.learned);
    
    if (unlearnedWords.length === 0) {
        testState.currentSet++;
        if (testState.currentSet >= 4) {
            console.log('Study phase complete');
            // Transition to recall phase
            startRecallPhase();
            return;
        }
        showStudyItem();
        return;
    }
    
    const targetWord = unlearnedWords[0];
    const cueElement = document.getElementById('study-cue');
    const gridElement = document.getElementById('study-grid');
    const progressElement = document.getElementById('study-progress');
    
    // Update progress bar
    const totalLearned = testState.studyWords.filter(w => w.learned).length;
    const progress = (totalLearned / 16) * 100;
    const progressBar = progressElement.querySelector('.progress-bar');
    progressBar.style.width = progress + '%';
    
    // Show cue for target word
    cueElement.textContent = `Which one is ${targetWord.category === 'animal' ? 'an' : 'a'} ${targetWord.category}?`;
    
    // Show current set of 4 words
    gridElement.innerHTML = '';
    currentSet.forEach(wordObj => {
        const div = document.createElement('div');
        div.className = wordObj.learned ? 'study-item correct' : 'study-item';
        div.textContent = wordObj.word;
        if (!wordObj.learned) {
            div.onclick = () => selectStudyItem(wordObj.word === targetWord.word, div, wordObj);
        }
        gridElement.appendChild(div);
    });
}

function selectStudyItem(isCorrect, element, wordObj) {
    wordObj.attempts++;
    
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
            <div class="recall-interface">
                <h2>Trial ${testState.recallTrial + 1} - Free Recall</h2>
                <p>Type all the words you remember from the study phase (one word per line):</p>
                <textarea id="recall-input" placeholder="Enter words, one per line..."></textarea>
                <button id="recall-submit">Submit</button>
                <div id="recalled-words-display"></div>
            </div>
        `;
        
        document.getElementById('recall-submit').onclick = submitFreeRecall;
    } else {
        // Start delayed recall after a brief pause
        testArea.innerHTML = `
            <div class="recall-interface">
                <h2>Please wait...</h2>
                <p>The test will continue in a moment with the final recall phase.</p>
            </div>
        `;
        
        setTimeout(() => {
            startDelayedRecall();
        }, 3000);
    }
}

function submitFreeRecall() {
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
        // All words were recalled, move to next trial
        testState.recallTrial++;
        showRecallInterface();
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
        <div class="recall-interface">
            <h2>Trial ${testState.recallTrial + 1} - Cued Recall</h2>
            <p>For each category, try to recall any words you remember:</p>
            <div id="cued-recall-container"></div>
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
            <p>What ${currentCategory === 'animal' ? 'animals' : `${currentCategory}s`} do you remember? (Enter each word on a new line)</p>
            <textarea id="cued-input" placeholder="Enter words, one per line..." rows="4"></textarea>
            <button id="cued-submit">Submit</button>
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
}

function submitCategoryAnswer(currentCategory, missedInCategory) {
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
    if (correctWordsInCategory.length > 0) {
        inputElement.style.backgroundColor = '#d4edda';
    } else {
        inputElement.style.backgroundColor = '#f8d7da';
    }
    
    console.log('Cued missed words:', testState.cuedMissedWords);
    console.log('Still missed this category:', stillMissed);

    setTimeout(() => {
        testState.currentCuedIndex++;
        console.log('Category index:', testState.currentCuedIndex, 'Total categories:', testState.categoriesWithMissedWords.length);
        console.log('Total cued missed words so far:', testState.cuedMissedWords);
        showNextCategoryPrompt();
    }, 1000);
}

function startDelayedRecall() {
    testState.currentPhase = 'delayed';
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Final Free Recall</h2>
            <p>Try to remember all the words from the beginning of the test (one word per line):</p>
            <textarea id="delayed-recall-input" placeholder="Enter words, one per line..."></textarea>
            <button id="delayed-recall-submit">Submit</button>
        </div>
    `;
    
    document.getElementById('delayed-recall-submit').onclick = submitDelayedFreeRecall;
}

function submitDelayedFreeRecall() {
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
        // All words were recalled, finish test
        finishTest();
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
        <div class="recall-interface">
            <h2>Final Cued Recall</h2>
            <p>For each category, try to recall any remaining words:</p>
            <div id="delayed-cued-container"></div>
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
            <p>What ${currentCategory === 'animal' ? 'animals' : `${currentCategory}s`} do you remember? (Enter each word on a new line)</p>
            <textarea id="delayed-cued-input" placeholder="Enter words, one per line..." rows="4"></textarea>
            <button id="delayed-cued-submit">Submit</button>
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
}

function submitDelayedCategoryAnswer(currentCategory, missedInCategory) {
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
    
    // Show feedback
    const inputElement = document.getElementById('delayed-cued-input');
    if (correctWordsInCategory.length > 0) {
        inputElement.style.backgroundColor = '#d4edda';
    } else {
        inputElement.style.backgroundColor = '#f8d7da';
    }
    
    setTimeout(() => {
        testState.currentCuedIndex++;
        showNextDelayedCategoryPrompt();
    }, 1000);
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
        <div class="results-display">
            <h2>Test Complete!</h2>
            <div class="results-summary">
                <h3>Results Summary</h3>
                <p><strong>Test Duration:</strong> ${duration} minutes</p>
                <p><strong>Total Words:</strong> ${totalWords}</p>
                
                <h4>Immediate Recall (3 trials)</h4>
                <p><strong>Free Recall Scores:</strong> ${freeRecallScores.join(', ')} / ${totalWords}</p>
                <p><strong>Total Cued Recall:</strong> ${cuedRecallScores.reduce((a, b) => a + b, 0)} words</p>
                
                <h4>Delayed Recall</h4>
                <p><strong>Delayed Free Recall:</strong> ${delayedFreeScore} / ${totalWords}</p>
                <p><strong>Delayed Cued Recall:</strong> ${delayedCuedScore} words</p>
                
                <h4>Total Recall Score</h4>
                <p><strong>Best Free Recall:</strong> ${Math.max(...freeRecallScores)} / ${totalWords}</p>
                <p><strong>Total Recall (Free + Cued):</strong> ${Math.max(...freeRecallScores) + Math.max(...cuedRecallScores)} / ${totalWords}</p>
            </div>
            
            <button id="download-results">Download Detailed Results</button>
            <button id="restart-test">Take Test Again</button>
        </div>
    `;
    
    document.getElementById('download-results').onclick = downloadResults;
    document.getElementById('restart-test').onclick = () => location.reload();
}

function downloadResults() {
    const results = {
        userId: testState.userId,
        demographics: testState.demographics,
        testDate: new Date().toISOString(),
        duration: Math.round((new Date() - testState.startTime) / 1000 / 60),
        studyWords: testState.studyWords,
        freeRecallTrials: testState.results.freeRecall,
        cuedRecallTrials: testState.results.cuedRecall,
        delayedFreeRecall: testState.results.delayedFree,
        delayedCuedRecall: testState.results.delayedCued,
        scores: {
            freeRecallScores: testState.results.freeRecall.map(trial => trial.length),
            totalCuedRecall: testState.results.cuedRecall.reduce((sum, trial) => sum + trial.length, 0),
            delayedFreeScore: testState.results.delayedFree.length,
            delayedCuedScore: testState.results.delayedCued.length
        }
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FCSRT_${testState.userId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    status.innerHTML = `
        <div><strong>Phase:</strong> ${testState.currentPhase}</div>
        <div><strong>Set:</strong> ${testState.currentSet + 1}/4</div>
        <div><strong>Trial:</strong> ${testState.recallTrial + 1}</div>
        <div><strong>Learned:</strong> ${testState.studyWords ? testState.studyWords.filter(w => w.learned).length : 0}/16</div>
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