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
        WORD_DATABASE = await response.json();
        console.log('Word bank loaded successfully');
    } catch (error) {
        console.error('Failed to load word bank:', error);
        // Fallback word bank in case JSON fails to load
        WORD_DATABASE = {
            animal: ['dog', 'cat', 'elephant', 'tiger'],
            tool: ['hammer', 'screwdriver', 'wrench', 'saw'],
            furniture: ['chair', 'table', 'sofa', 'bed'],
            clothing: ['shirt', 'pants', 'shoes', 'hat']
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

document.addEventListener('DOMContentLoaded', async function() {
    // Load word bank first
    await loadWordBank();
    
    const beginTestButton = document.getElementById('begin-test');
    
    if (beginTestButton) {
        beginTestButton.addEventListener('click', startTest);
    } else {
        console.error("Element with ID 'begin-test' not found.");
    }
    
    function startTest() {
        testState.studyWords = selectRandomWords();
        startStudyPhase();
    }

    function startStudyPhase() {
        testState.currentSet = 0;
        testState.learnedInCurrentSet = 0;
        showStudyItem();
    }
});

// Keep your existing showStudyItem and selectStudyItem functions
function showStudyItem() {
    const currentSet = testState.studyWords.filter(w => w.set === testState.currentSet);
    const unlearnedWords = currentSet.filter(w => !w.learned);
    
    if (unlearnedWords.length === 0) {
        testState.currentSet++;
        if (testState.currentSet >= 4) {
            console.log('Study phase complete');
            return;
        }
        showStudyItem();
        return;
    }
    
    const targetWord = unlearnedWords[0];
    const cueElement = document.getElementById('study-cue');
    const gridElement = document.getElementById('study-grid');
    const progressElement = document.getElementById('study-progress');
    
    // Update progress
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
        }, 1000);
    } else {
        element.className = 'study-item incorrect';
        setTimeout(() => {
            element.className = 'study-item';
        }, 1000);
    }
}