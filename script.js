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
        testDate: new Date().toISOString()
    };
    
    // Hide the form
    document.getElementById('demographics-form').style.display = 'none';
    
    // Create and show user ID with Begin Test button
    const demographicsScreen = document.getElementById('demographics-screen');
    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.innerHTML = `
        <div style="padding: 20px; background: #d4edda; border: 2px solid #27ae60; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 18px; margin-bottom: 10px;">Your User ID is:</p>
            <p style="font-size: 24px; font-weight: bold; color: #27ae60; margin-bottom: 10px;">${testState.userId}</p>
            <p style="font-size: 14px; color: #155724;">Please save this ID for future sessions.</p>
        </div>
        <button id="begin-test-button" style="background: #3498db; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-top: 20px;">Begin Test</button>
    `;
    demographicsScreen.appendChild(messageDiv);
    
    // Add event listener to the Begin Test button
    document.getElementById('begin-test-button').addEventListener('click', startTest);
}

// Initialize the test when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    await loadWordBank();
    
    const beginTestButton = document.getElementById('begin-test');
    const demographicsForm = document.getElementById('demographics-form');
    const yesReturningBtn = document.getElementById('yes-returning');
    const noReturningBtn = document.getElementById('no-returning');
    const submitUserIdBtn = document.getElementById('submit-user-id');
    
    if (beginTestButton) {
        beginTestButton.addEventListener('click', showReturningUserScreen);
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
});

function showReturningUserScreen() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('returning-user-screen').style.display = 'block';
}

function showUserIdScreen() {
    document.getElementById('returning-user-screen').style.display = 'none';
    document.getElementById('user-id-screen').style.display = 'block';
}

function showDemographicsScreen() {
    document.getElementById('returning-user-screen').style.display = 'none';
    document.getElementById('demographics-screen').style.display = 'block';
}

async function handleUserIdSubmit() {
    const userId = document.getElementById('user-id-input').value.trim();
    if (!userId) {
        document.getElementById('user-id-message').textContent = 'Please enter your User ID';
        return;
    }
    
    try {
        // Check if user exists
        const response = await fetch('https://script.google.com/macros/s/AKfycbwKFpfr_FR8cr4LemaA1W-tdx6V7QYe3KZIj7UJLTJCN2r6a9iDfJmT6TBz6g8V8rcB/exec?action=checkUser&userId=' + encodeURIComponent(userId));
        const data = await response.json();
        
        if (data.exists) {
            testState.userId = userId;
            testState.demographics = data.demographics;
            
            // Hide user ID screen and show test area
            document.getElementById('user-id-screen').style.display = 'none';
            document.getElementById('test-area').style.display = 'block';
            
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
            document.getElementById('user-id-message').textContent = 'User ID not found. Please try again or take as a new participant.';
        }
    } catch (error) {
        console.error('Error checking user ID:', error);
        document.getElementById('user-id-message').textContent = 'Error checking user ID. Please try again.';
    }
}

function startTest() {
    // Hide all other screens
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('returning-user-screen').style.display = 'none';
    document.getElementById('user-id-screen').style.display = 'none';
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
    
    // Show current set of 4 words - shuffle the order for this presentation
    gridElement.innerHTML = '';
    
    // Shuffle the current set
    const shuffledSet = [...currentSet];
    for (let i = shuffledSet.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSet[i], shuffledSet[j]] = [shuffledSet[j], shuffledSet[i]];
    }
    
    shuffledSet.forEach(wordObj => {
        const div = document.createElement('div');
        div.className = wordObj.learned ? 'study-item correct' : 'study-item';
        div.textContent = wordObj.word;
        if (!wordObj.learned) {
            div.onclick = () => selectStudyItem(wordObj.word === targetWord.word, div, wordObj);
        }
        gridElement.appendChild(div);
    });
    
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
            <div class="recall-interface">
                <h2>Trial ${testState.recallTrial + 1} - Free Recall</h2>
                <p>Type all the words you remember from the study phase (one word per line):</p>
                <textarea id="recall-input" placeholder="Enter words, one per line..."></textarea>
                <button id="recall-submit">Submit</button>
                <div id="recalled-words-display"></div>
            </div>
        `;
        
        document.getElementById('recall-submit').onclick = submitFreeRecall;
        
        // Record the start time for this free recall trial
        testState.freeRecallStartTime = new Date();
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
            <div id="cued-feedback" style="margin: 5px 0; font-weight: bold;"></div>
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
    document.getElementById('cued-submit').disabled = true;
    
    // Create Next button
    const nextButton = document.createElement('button');
    nextButton.id = 'cued-next';
    nextButton.textContent = 'Next';
    nextButton.onclick = () => {
        testState.currentCuedIndex++;
        showNextCategoryPrompt();
    };
    feedbackElement.appendChild(nextButton);
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
            <div id="delayed-cued-feedback" style="margin: 5px 0; font-weight: bold;"></div>
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
            
            <div id="upload-status" style="margin: 30px 0; padding: 20px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px;">
                <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">⏳ Uploading Results...</p>
                <p style="color: #856404;">Please do not close this page until upload is complete.</p>
            </div>
            
            <div id="action-buttons" style="display: none; text-align: center; margin-top: 20px;">
                <button id="restart-test" style="background: #27ae60; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Take Test Again</button>
            </div>
        </div>
    `;
    
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
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #27ae60;">✓ Results Uploaded Successfully!</p>
            <p style="color: #155724;">Thank you for completing the test. Your data has been saved.</p>
        `;
        uploadStatus.style.background = '#d4edda';
        uploadStatus.style.borderColor = '#27ae60';
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
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #e74c3c;">✗ Upload Failed</p>
            <p style="color: #721c24; margin-bottom: 15px;">We couldn't upload your results automatically. Please download them and email to:</p>
            <p style="font-weight: bold; color: #721c24; margin-bottom: 15px;">fcsrt.data@example.com</p>
            <p style="color: #721c24; margin-bottom: 15px;">Subject line: <strong>Failed Data Upload</strong></p>
            <button id="download-results" style="background: #e74c3c; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Download Results</button>
        `;
        uploadStatus.style.background = '#f8d7da';
        uploadStatus.style.borderColor = '#e74c3c';
        
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