/*
        MAIN CONTROL METHOD

        Use CasparCG CG UPDATE commands.

        Example:
        CG 1-10 UPDATE 1 "{\"action\":\"reveal\",\"value\":\"1\"}"

        Command list:
        {"action":"reveal","value":"1"}
        {"action":"revealAll"}
        {"action":"reset"}
        {"action":"addScoreA","value":"10"}
        {"action":"addScoreB","value":"10"}
        {"action":"scoreA","value":"100"}
        {"action":"scoreB","value":"75"}
        {"action":"addStrikeA"}
        {"action":"addStrikeB"}
        {"action":"clearStrikes"}
        {"action":"multiplier","value":"2"}
        {"action":"awardAnswerToA","value":"3"}
        {"action":"awardAnswerToB","value":"3"}
        {"action":"loadRound","value":"round2"}
        {"action":"hideControls"}
        {"action":"showControls"}
    */

/* CasparCG lifecycle functions */
function play() {
}

function stop() {
}

function next() {
}

/*
    CasparCG calls update(data) when CG UPDATE is sent.
    We expect data to arrive as a JSON string.
*/
function update(data) {

    if (!data) {
        console.log("No data received.");
        return;
    }

    console.log("RAW UPDATE:", data);

    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch (error) {
            console.log("Could not parse update data:", data);
            return;
        }
    }

    console.log("UPDATE:", data);

    runCommand(data);
}

/*
    Converts command packets into board actions.
*/
function runCommand(data) {
    const command = data.action;
    const rawValue = data.value;
    console.log( rawValue);
    const numericValue = Number(rawValue);

    switch (command) {
        case "reveal":
            revealAnswer(numericValue);
            break;

        case "revealAll":
            revealAll();
            break;

        case "reset":
            resetBoard();
            break;

        case "scoreA":
            setScoreA(numericValue);
            break;

        case "scoreB":
            setScoreB(numericValue);
            break;

        case "addScoreA":
            addScoreA(numericValue);
            break;

        case "addScoreB":
            addScoreB(numericValue);
            break;

        case "addStrikeA":
            addStrikeA();
            break;

        case "addStrikeB":
            addStrikeB();
            break;

        case "clearStrikes":
            clearStrikes();
            break;

        case "multiplier":
            setMultiplier(numericValue);
            break;

        case "awardAnswerToA":
            awardAnswerToA(numericValue);
            break;

        case "awardAnswerToB":
            awardAnswerToB(numericValue);
            break;

        case "loadRound":
            loadRoundById(rawValue);
            break;

        case "hideControls":
            hideControls();
            break;

        case "showControls":
            showControls();
            break;

        default:
            console.log("Unknown command:", command, data);
    }
}

const REVEAL_FRAME_COUNT = 24;
const REVEAL_FPS = 24;

const gameState = {
    question: "",

    teamAName: "TEAM A",
    teamBName: "TEAM B",

    scoreA: 0,
    scoreB: 0,

    strikesA: 0,
    strikesB: 0,
    showStrikeAnimation: false,

    roundMultiplier: 1,

    answers: []
};

// Global variable to store loaded rounds data
let rounds = {};

async function loadRoundsFromJSON() {
    try {
        const response = await fetch('survey.json');

        if ( ! response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        rounds = data.rounds;

        console.log('Rounds data loaded successfully:', rounds);

        // Load the first round after data is loaded
        loadRoundByIndex(0);

    } catch (error) {
        console.error('Error loading rounds data:', error);

        return;
    }
}


function revealFramePath(frameNumber) {
    return "assets/reveal/answerreveal_" +
        String(frameNumber).padStart(5, "0") +
        ".png";
}

function strikeText(count) {
    if (count <= 0) return "";
    return "X".repeat(Math.min(count, 3));
}

function renderBoard() {
    document.getElementById("question").innerText = gameState.question;

    document.getElementById("scoreA").innerHTML =
        '<div class="team-name">' + gameState.teamAName + '</div>' +
        '<div class="team-score">' + gameState.scoreA + '</div>' +
        '<div class="strike-count">' + strikeText(gameState.strikesA) + '</div>';

    document.getElementById("scoreB").innerHTML =
        '<div class="team-name">' + gameState.teamBName + '</div>' +
        '<div class="team-score">' + gameState.scoreB + '</div>' +
        '<div class="strike-count">' + strikeText(gameState.strikesB) + '</div>';

    document.getElementById("multiplier").innerText =
        gameState.roundMultiplier > 1
            ? gameState.roundMultiplier + "x POINTS"
            : "";

    document.getElementById("strikeOverlay").style.opacity =
        gameState.showStrikeAnimation ? "1" : "0";

    const answersDiv = document.getElementById("answers");
    answersDiv.innerHTML = "";

    gameState.answers.forEach(function (answer, index) {
        const tile = document.createElement("div");
        tile.className = "answer-tile";
        tile.id = "tile-" + (index + 1);
        tile.style.top = (190 + index * 138) + "px";

        const backgroundImage =
            answer.revealed ? "assets/revealed.png" : "assets/hidden.png";

        tile.innerHTML =
            '<img class="tile-bg" src="' + backgroundImage + '">' +
            '<img class="reveal-frame" src="' + revealFramePath(0) + '">' +
            '<div class="answer-content">' +
            '<span class="number ' + (answer.revealed ? 'hidden' : '') + '">' +
            (index + 1) +
            '</span>' +
            '<span class="answer ' + (answer.revealed ? '' : 'hidden') + '">' +
            answer.text +
            '</span>' +
            '<span class="points ' + (answer.revealed ? '' : 'hidden') + '">' +
            answer.points +
            '</span>' +
            '</div>';

        answersDiv.appendChild(tile);
    });
}

function playRevealAnimation(tile, onComplete) {
    const frameImage = tile.querySelector(".reveal-frame");

    let startTime = null;
    let lastFrame = -1;

    const frameDuration = 1000 / REVEAL_FPS;

    frameImage.style.display = "block";

    function step(timestamp) {
        if (!startTime) {
            startTime = timestamp;
        }

        const elapsed = timestamp - startTime;

        const frame = Math.min(
            Math.floor(elapsed / frameDuration),
            REVEAL_FRAME_COUNT - 1
        );

        if (frame !== lastFrame) {
            frameImage.src = revealFramePath(frame);
            lastFrame = frame;
        }

        if (frame < REVEAL_FRAME_COUNT - 1) {
            requestAnimationFrame(step);
        } else {
            frameImage.style.display = "none";
            onComplete();
        }
    }

    requestAnimationFrame(step);
}

function revealAnswer(number) {
    const answer = gameState.answers[number - 1];
    const tile = document.getElementById("tile-" + number);

    if (!answer || !tile) return;
    if (answer.revealed || answer.animating) return;

    answer.animating = true;

    playRevealSound();

    playRevealAnimation(tile, function () {
        answer.revealed = true;
        answer.animating = false;
        renderBoard();
    });
}

function revealAll() {
    gameState.answers.forEach(function (answer) {
        answer.revealed = true;
        answer.animating = false;
    });

    renderBoard();
}

function resetBoard() {
    gameState.answers.forEach(function (answer) {
        answer.revealed = false;
        answer.animating = false;
    });

    clearStrikes();
    renderBoard();
}

function addScoreA(points) {
    gameState.scoreA += Number(points || 0);
    renderBoard();
}

function addScoreB(points) {
    gameState.scoreB += Number(points || 0);
    renderBoard();
}

function setScoreA(points) {
    gameState.scoreA = Number(points || 0);
    renderBoard();
}

function setScoreB(points) {
    gameState.scoreB = Number(points || 0);
    renderBoard();
}

function setMultiplier(value) {
    const multiplier = Number(value || 1);
    gameState.roundMultiplier = Math.max(1, multiplier);
    renderBoard();
}

function awardAnswerToA(answerNumber) {
    const answer = gameState.answers[answerNumber - 1];
    if (!answer) return;

    addScoreA(answer.points * gameState.roundMultiplier);
}

function awardAnswerToB(answerNumber) {
    const answer = gameState.answers[answerNumber - 1];
    if (!answer) return;

    addScoreB(answer.points * gameState.roundMultiplier);
}

function triggerStrike() {
    gameState.showStrikeAnimation = true;

    playStrikeSound();
    renderBoard();

    setTimeout(function () {
        gameState.showStrikeAnimation = false;
        renderBoard();
    }, 1000);
}

function setStrikesA(number) {
    gameState.strikesA = Math.max(0, Math.min(3, Number(number || 0)));
    triggerStrike();
}

function setStrikesB(number) {
    gameState.strikesB = Math.max(0, Math.min(3, Number(number || 0)));
    triggerStrike();
}

function addStrikeA() {
    setStrikesA(gameState.strikesA + 1);
}

function addStrikeB() {
    setStrikesB(gameState.strikesB + 1);
}

function clearStrikes() {
    gameState.strikesA = 0;
    gameState.strikesB = 0;
    gameState.showStrikeAnimation = false;
    renderBoard();
}

function loadRoundByIndex(round) {
    if ( ! rounds[round] ) {
        console.log("Unknown round", round);
        return;
    }

    loadRound(rounds[round]);
}

function loadRound(roundData) {
    if (!roundData) return;

    gameState.question = roundData.question || "";
    gameState.roundMultiplier = Number(roundData.multiplier || 1);

    gameState.answers = (roundData.answers || []).map(function (answer) {
        return {
            text: answer.text,
            points: Number(answer.points || 0),
            revealed: false,
            animating: false
        };
    });

    clearStrikes();
    renderBoard();
}

function hideControls() {
    document.getElementById("testControls").classList.add("hidden-controls");
}

function showControls() {
    document.getElementById("testControls").classList.remove("hidden-controls");
}

/* Sound hooks for later */
function playRevealSound() {
}

function playStrikeSound() {
}

/* Initial load */
loadRoundsFromJSON();