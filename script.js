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
    immediateRecallAttempt: 0,
    results: {
        freeRecall: [[], [], []],
        cuedRecall: [[], [], []],
        delayedFree: [],
        delayedCued: [],
        studyAttempts: [],
        immediateRecall: [[], [], [], []] // Track immediate recall for each set
    }
};

let WORD_DATABASE = null;

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

// Initialize the test when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Load word bank first
    await loadWordBank();
    
    const beginTestButton = document.getElementById('begin-test');
    
    if (beginTestButton) {
        beginTestButton.addEventListener('click', startTest);
    } else {
        console.error("Element with ID 'begin-test' not found.");
    }
});

function startTest() {
    // Hide welcome screen
    document.getElementById('welcome-screen').style.display = 'none';
    
    // Show test area
    document.getElementById('test-area').style.display = 'block';
    
    // Initialize test
    testState.studyWords = selectRandomWords();
    testState.startTime = new Date();
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
        // All items in current set learned, test immediate recall
        testImmediateRecall();
        return;
    }
    
    // Ensure study interface is displayed
    restoreStudyInterface();
    
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

function restoreStudyInterface() {
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div id="study-progress">
            <div class="progress-bar"></div>
        </div>
        <div id="study-cue"></div>
        <div id="study-grid"></div>
    `;
}

function selectStudyItem(isCorrect, element, wordObj) {
    wordObj.attempts++;
    
    if (isCorrect) {
        wordObj.learned = true;
        element.className = 'study-item correct';
        testState.learnedInCurrentSet++;
        
        setTimeout(() => {
            showStudyItem();
        }, 1000);
    } else {
        element.className = 'study-item incorrect';
        setTimeout(() => {
            element.className = 'study-item';
        }, 1000);
    }
}

// New function to test immediate recall after each set
function testImmediateRecall() {
    testState.immediateRecallAttempt = 0;
    const currentSet = testState.studyWords.filter(w => w.set === testState.currentSet);
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Immediate Recall - Set ${testState.currentSet + 1}</h2>
            <p>Now I'll give you the categories. Tell me the word that goes with each category.</p>
            <div id="immediate-recall-container"></div>
        </div>
    `;
    
    testState.currentImmediateIndex = 0;
    testState.immediateRecallResults = [];
    testState.failedImmediateRecall = [];
    showNextImmediateRecallItem(currentSet);
}

function showNextImmediateRecallItem(currentSet) {
    if (testState.currentImmediateIndex >= currentSet.length) {
        // Finished testing all items in set
        if (testState.failedImmediateRecall.length > 0) {
            // Show remedial learning for failed items
            showRemedialLearning();
        } else {
            // All items recalled, move to next set or main recall phase
            testState.results.immediateRecall[testState.currentSet] = testState.immediateRecallResults;
            advanceToNextSet();
        }
        return;
    }
    
    const currentWord = currentSet[testState.currentImmediateIndex];
    const container = document.getElementById('immediate-recall-container');
    
    container.innerHTML = `
        <div class="cued-item">
            <p>What was the <strong>${currentWord.category}</strong>?</p>
            <input type="text" id="immediate-input" placeholder="Enter your answer...">
            <button id="immediate-submit">Submit</button>
        </div>
    `;
    
    document.getElementById('immediate-input').focus();
    document.getElementById('immediate-submit').onclick = () => submitImmediateAnswer(currentWord, currentSet);
    
    // Allow Enter key to submit
    document.getElementById('immediate-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitImmediateAnswer(currentWord, currentSet);
        }
    });
}

function submitImmediateAnswer(targetWord, currentSet) {
    const answer = document.getElementById('immediate-input').value.toLowerCase().trim();
    
    if (answer === targetWord.word.toLowerCase()) {
        testState.immediateRecallResults.push(targetWord.word.toLowerCase());
        document.getElementById('immediate-input').style.backgroundColor = '#d4edda';
        setTimeout(() => {
            testState.currentImmediateIndex++;
            showNextImmediateRecallItem(currentSet);
        }, 1000);
    } else {
        // Failed to recall - add to remedial learning list
        testState.failedImmediateRecall.push(targetWord);
        document.getElementById('immediate-input').style.backgroundColor = '#f8d7da';
        setTimeout(() => {
            testState.currentImmediateIndex++;
            showNextImmediateRecallItem(currentSet);
        }, 1000);
    }
}

function showRemedialLearning() {
    if (testState.failedImmediateRecall.length === 0) {
        testState.results.immediateRecall[testState.currentSet] = testState.immediateRecallResults;
        advanceToNextSet();
        return;
    }
    
    const failedWord = testState.failedImmediateRecall[0];
    const testArea = document.getElementById('test-area');
    
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Reminder</h2>
            <div class="remedial-item">
                <p>The <strong>${failedWord.category}</strong> was <strong>${failedWord.word}</strong></p>
                <button id="remedial-continue">Continue</button>
            </div>
        </div>
    `;
    
    document.getElementById('remedial-continue').onclick = () => {
        // Remove the shown word from failed list
        testState.failedImmediateRecall.shift();
        // Add to successfully recalled list
        testState.immediateRecallResults.push(failedWord.word.toLowerCase());
        // Continue with next failed word or advance
        showRemedialLearning();
    };
}

function advanceToNextSet() {
    testState.currentSet++;
    if (testState.currentSet >= 4) {
        console.log('Study phase complete');
        // Transition to main recall phase
        startRecallPhase();
        return;
    }
    
    // Reset learned status for words in the next set
    testState.studyWords.forEach(word => {
        if (word.set === testState.currentSet) {
            word.learned = false;
        }
    });
    
    testState.learnedInCurrentSet = 0;
    showStudyItem();
}

function startRecallPhase() {
    testState.currentPhase = 'recall';
    testState.recallTrial = 0;
    showRecallInterface();
}

function showRecallInterface() {
    if (testState.recallTrial < 3) {
        // Show distractor task before each trial
        showDistractionTask();
    } else {
        // Start delayed recall after a brief pause
        const testArea = document.getElementById('test-area');
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

function showDistractionTask() {
    const testArea = document.getElementById('test-area');
    const distractorWords = [
        "blue", "mountain", "seven", "pencil", "flower", "ocean", "three", "window", 
        "music", "cloud", "green", "river", "eight", "castle", "rainbow", "forest",
        "candle", "bridge", "purple", "garden", "moon", "butterfly", "crystal", "thunder"
    ];
    
    // Select 8 random distractor words
    const selectedWords = [];
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * distractorWords.length);
        selectedWords.push(distractorWords[randomIndex]);
        distractorWords.splice(randomIndex, 1);
    }
    
    testArea.innerHTML = `
        <div class="distraction-interface">
            <h2>Before Trial ${testState.recallTrial + 1}</h2>
            <p>Please read these words aloud for 20 seconds to clear your short-term memory:</p>
            <div id="distractor-words">
                ${selectedWords.map(word => `<span class="distractor-word">${word}</span>`).join('')}
            </div>
            <div id="countdown-display">
                <div id="countdown-timer">20</div>
                <p>seconds remaining</p>
            </div>
        </div>
    `;
    
    let countdown = 20;
    const timer = setInterval(() => {
        countdown--;
        document.getElementById('countdown-timer').textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(timer);
            showFreeRecall();
        }
    }, 1000);
}

function showFreeRecall() {
    const testArea = document.getElementById('test-area');
    
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Trial ${testState.recallTrial + 1} - Free Recall</h2>
            <p>You have 2 minutes to type all the words you remember from the study phase:</p>
            <div id="recall-timer">
                <div id="recall-countdown">120</div>
                <p>seconds remaining</p>
            </div>
            <textarea id="recall-input" placeholder="Enter words separated by commas or new lines..."></textarea>
            <button id="recall-submit">Submit Early</button>
            <div id="recalled-words-display"></div>
        </div>
    `;
    
    document.getElementById('recall-submit').onclick = submitFreeRecall;
    
    // Start 2-minute countdown
    let timeLeft = 120;
    const recallTimer = setInterval(() => {
        timeLeft--;
        const timerElement = document.getElementById('recall-countdown');
        if (timerElement) {
            timerElement.textContent = timeLeft;
            
            // Change color as time runs low
            if (timeLeft <= 30) {
                timerElement.style.color = '#e74c3c';
            } else if (timeLeft <= 60) {
                timerElement.style.color = '#f39c12';
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(recallTimer);
            // Auto-submit when time runs out
            if (document.getElementById('recall-input')) {
                submitFreeRecall();
            }
        }
    }, 1000);
    
    // Store timer reference so we can clear it if they submit early
    testState.currentTimer = recallTimer;
}

function submitFreeRecall() {
    // Clear the timer if it exists
    if (testState.currentTimer) {
        clearInterval(testState.currentTimer);
        testState.currentTimer = null;
    }
    
    const input = document.getElementById('recall-input').value;
    const recalledWords = input.toLowerCase().split(/[,\n]/).map(w => w.trim()).filter(w => w);
    
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
    
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Trial ${testState.recallTrial + 1} - Cued Recall</h2>
            <p>For the remaining categories, try to recall the word:</p>
            <div id="cued-recall-container"></div>
            <button id="cued-recall-done" style="display: none;">Continue</button>
        </div>
    `;
    
    testState.currentCuedIndex = 0;
    testState.cuedRecallResults = [];
    showNextCuedItem(notRecalled);
}

function showNextCuedItem(notRecalled) {
    if (testState.currentCuedIndex >= notRecalled.length) {
        testState.results.cuedRecall[testState.recallTrial] = testState.cuedRecallResults;
        testState.recallTrial++;
        showRecallInterface();
        return;
    }
    
    const currentWord = notRecalled[testState.currentCuedIndex];
    const container = document.getElementById('cued-recall-container');
    
    container.innerHTML = `
        <div class="cued-item">
            <p>What was the <strong>${currentWord.category}</strong>?</p>
            <input type="text" id="cued-input" placeholder="Enter your answer...">
            <button id="cued-submit">Submit</button>
        </div>
    `;
    
    document.getElementById('cued-input').focus();
    document.getElementById('cued-submit').onclick = () => submitCuedAnswer(currentWord, notRecalled);
    
    // Allow Enter key to submit
    document.getElementById('cued-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitCuedAnswer(currentWord, notRecalled);
        }
    });
}

function submitCuedAnswer(targetWord, notRecalled) {
    const answer = document.getElementById('cued-input').value.toLowerCase().trim();
    
    if (answer === targetWord.word.toLowerCase()) {
        testState.cuedRecallResults.push(targetWord.word.toLowerCase());
        document.getElementById('cued-input').style.backgroundColor = '#d4edda';
        setTimeout(() => {
            testState.currentCuedIndex++;
            showNextCuedItem(notRecalled);
        }, 1000);
    } else {
        // Failed to recall with cue - show reminder (like in study phase)
        showCuedRecallReminder(targetWord, notRecalled);
    }
}

function showCuedRecallReminder(targetWord, notRecalled) {
    const container = document.getElementById('cued-recall-container');
    
    container.innerHTML = `
        <div class="cued-item reminder-item">
            <h3>Reminder</h3>
            <p>The <strong>${targetWord.category}</strong> was <strong>${targetWord.word}</strong></p>
            <button id="reminder-continue">Continue</button>
        </div>
    `;
    
    document.getElementById('reminder-continue').onclick = () => {
        // Add to successful recall list after reminder
        testState.cuedRecallResults.push(targetWord.word.toLowerCase());
        // Continue with next word
        testState.currentCuedIndex++;
        showNextCuedItem(notRecalled);
    };
}

function startDelayedRecall() {
    testState.currentPhase = 'delayed';
    
    const testArea = document.getElementById('test-area');
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Final Free Recall</h2>
            <p>Try to remember all the words from the beginning of the test:</p>
            <textarea id="delayed-recall-input" placeholder="Enter words separated by commas or new lines..."></textarea>
            <button id="delayed-recall-submit">Submit</button>
        </div>
    `;
    
    document.getElementById('delayed-recall-submit').onclick = submitDelayedFreeRecall;
}

function submitDelayedFreeRecall() {
    const input = document.getElementById('delayed-recall-input').value;
    const recalledWords = input.toLowerCase().split(/[,\n]/).map(w => w.trim()).filter(w => w);
    
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
    
    testArea.innerHTML = `
        <div class="recall-interface">
            <h2>Final Cued Recall</h2>
            <p>For the remaining categories, try to recall the word:</p>
            <div id="delayed-cued-container"></div>
        </div>
    `;
    
    testState.currentCuedIndex = 0;
    testState.delayedCuedResults = [];
    showNextDelayedCuedItem(notRecalled);
}

function showNextDelayedCuedItem(notRecalled) {
    if (testState.currentCuedIndex >= notRecalled.length) {
        testState.results.delayedCued = testState.delayedCuedResults;
        finishTest();
        return;
    }
    
    const currentWord = notRecalled[testState.currentCuedIndex];
    const container = document.getElementById('delayed-cued-container');
    
    container.innerHTML = `
        <div class="cued-item">
            <p>What was the <strong>${currentWord.category}</strong>?</p>
            <input type="text" id="delayed-cued-input" placeholder="Enter your answer...">
            <button id="delayed-cued-submit">Submit</button>
        </div>
    `;
    
    document.getElementById('delayed-cued-input').focus();
    document.getElementById('delayed-cued-submit').onclick = () => submitDelayedCuedAnswer(currentWord, notRecalled);
    
    // Allow Enter key to submit
    document.getElementById('delayed-cued-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            submitDelayedCuedAnswer(currentWord, notRecalled);
        }
    });
}

function submitDelayedCuedAnswer(targetWord, notRecalled) {
    const answer = document.getElementById('delayed-cued-input').value.toLowerCase().trim();
    
    if (answer === targetWord.word.toLowerCase()) {
        testState.delayedCuedResults.push(targetWord.word.toLowerCase());
        document.getElementById('delayed-cued-input').style.backgroundColor = '#d4edda';
        setTimeout(() => {
            testState.currentCuedIndex++;
            showNextDelayedCuedItem(notRecalled);
        }, 1000);
    } else {
        document.getElementById('delayed-cued-input').style.backgroundColor = '#f8d7da';
        setTimeout(() => {
            document.getElementById('delayed-cued-input').style.backgroundColor = '';
            testState.currentCuedIndex++;
            showNextDelayedCuedItem(notRecalled);
        }, 1000);
    }
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
        testDate: new Date().toISOString(),
        duration: Math.round((new Date() - testState.startTime) / 1000 / 60),
        studyWords: testState.studyWords,
        immediateRecall: testState.results.immediateRecall,
        freeRecallTrials: testState.results.freeRecall,
        cuedRecallTrials: testState.results.cuedRecall,
        delayedFreeRecall: testState.results.delayedFree,
        delayedCuedRecall: testState.results.delayedCued
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FCSRT_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}