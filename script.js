document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const workbook = XLSX.read(event.target.result, { type: 'binary' });
            // Process the workbook here...
        };
        reader.readAsBinaryString(file);
    });
});

document.addEventListener('DOMContentLoaded', function (){
    const beginTestButton = document.getElementById('begin-test');
    const studyGrid = document.getElementById('study-grid');
    const studyProgress = document.getElementById('study-progress');
    
    console.log(beginTestButton); // Check the value of beginTestButton

    if (beginTestButton) {
        beginTestButton.addEventListener('click', startTest);
    }else{
        console.error("Element with ID 'begin-test' not found.")
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
})




function showStudyItem() {
    const currentSet = testState.studyWords.filter(w => w.set === testState.currentSet);
    const unlearnedWords = currentSet.filter(w => !w.learned);
    const targetWord = unlearnedWords[0];
    const cueElement = document.getElementById('study-cue');
    const gridElement = document.getElementById('study-grid');
    const progressElement = document.getElementById('study-progress');
    
    // Update progress
    const totalLearned = testState.studyWords.filter(w => w.learned).length;
    const progress = (totalLearned / (4 * 4)) * 100;
    progressElement.style.width = progress + '%';
    
    // Show cue for target word
    cueElement.textContent = `Which one is a ${targetWord.category}?`;
    
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

function selectRandomWords() {
    const xlsxFile = 'words.xlsx'; // Name of the XLSX file
    const workbook = XLSX.readFile(xlsxFile);
    const sheetName = workbook.SheetNames[0]; // Assume the first sheet
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Convert to JSON

    const categories = data[0]; // Category names
    const words = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        for (let j = 0; j < row.length; j++) {
            const word = {
                word: row[j],
                category: categories[j],
                learned: false,
                attempts: 0,
                set: Math.floor(Math.random() * 4) // Random set
            };
            words.push(word);
        }
    }

    // Shuffle the words array
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    return words;
}