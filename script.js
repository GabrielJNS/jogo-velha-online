const firebaseConfig = {
    apiKey: "AIzaSyDjyK1m44L76tvpRtV6KhEmHHumHxeNqy4",
    authDomain: "meu-jogo-velha.firebaseapp.com",
    databaseURL: "https://meu-jogo-velha-default-rtdb.firebaseio.com",
    projectId: "meu-jogo-velha",
    storageBucket: "meu-jogo-velha.firebasestorage.app",
    messagingSenderId: "699322233191",
    appId: "1:699322233191:web:cbf9ca5cc9153b2b2b7fc2"
};

firebase.initializeApp(firebaseConfig);
firebase.auth().signInAnonymously();

const database = firebase.database();

let currentGameId = null;
let playerSymbol = null;
let currentTurn = 'X';
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let gameActive = true;
let winningLine = [];
let loserStarts = 'X';

const boardDiv = document.getElementById('board');
const joinBoardDiv = document.getElementById('join-board');
const createGameBtn = document.getElementById('create-game');
const restartBtn = document.getElementById('restart-game');
const shareBtn = document.getElementById('share-game');
const setupDiv = document.getElementById('game-setup');
const gameAreaDiv = document.getElementById('game-area');
const joinAreaDiv = document.getElementById('join-area');
const gameStatus = document.getElementById('game-status');
const joinStatus = document.getElementById('join-status');
const winnerOverlay = document.getElementById('winner-overlay');
const winnerText = document.getElementById('winner-text');
const scoreXElement = document.getElementById('score-x');
const scoreOElement = document.getElementById('score-o');
const scoreDrawElement = document.getElementById('score-draw');

let currentListenerRef = null;

window.addEventListener('load', () => {
    const savedGameId = localStorage.getItem('jogoVelha_gameId');
    const savedSymbol = localStorage.getItem('jogoVelha_symbol');
    if (savedGameId && savedSymbol) {
        joinGame(savedGameId, savedSymbol, true);
    }
});

function updateScoreboard(data) {
    scoreXElement.textContent = data?.scores?.X || 0;
    scoreOElement.textContent = data?.scores?.O || 0;
    scoreDrawElement.textContent = data?.scores?.draw || 0;
}

function renderBoard(element, boardData, winLine, isInteractive) {
    element.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = boardData[i];
        if (boardData[i] === 'X') cell.classList.add('X');
        if (boardData[i] === 'O') cell.classList.add('O');
        if (winLine && winLine.includes(i)) cell.classList.add('win');

        if (isInteractive && gameActive && boardData[i] === '' && currentTurn === playerSymbol) {
            cell.addEventListener('click', () => makeMove(i));
        }
        element.appendChild(cell);
    }
}

function checkWinner(board) {
    const patterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];
    for (const pattern of patterns) {
        const [a,b,c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: pattern };
        }
    }
    if (!board.includes('')) return { winner: 'VELHA', line: [] };
    return null;
}

function updateStatusText() {
    const result = checkWinner(gameBoard);
    let text = '';
    if (result?.winner === 'X') text = 'X venceu';
    else if (result?.winner === 'O') text = 'O venceu';
    else if (result?.winner === 'VELHA') text = 'Velha';
    else text = `Vez de ${currentTurn}`;
    gameStatus.textContent = text;
    joinStatus.textContent = text;
}

function showWinnerMessage(msg) {
    winnerText.textContent = msg;
    winnerOverlay.classList.add('show');
    setTimeout(() => winnerOverlay.classList.remove('show'), 2500);
}

async function makeMove(index) {
    if (!gameActive) return;
    const gameRef = database.ref(`games/${currentGameId}`);
    const snapshot = await gameRef.get();
    const data = snapshot.val();
    if (!data) return;
    if (data.board[index] !== '') return;
    if (data.currentTurn !== playerSymbol) return;

    const newBoard = [...data.board];
    newBoard[index] = playerSymbol;
    const result = checkWinner(newBoard);
    let nextStarter = data.loserStarts || 'X';
    if (result?.winner === 'X') nextStarter = 'O';
    if (result?.winner === 'O') nextStarter = 'X';

    const scores = data.scores || { X:0, O:0, draw:0 };
    if (result?.winner === 'X') scores.X++;
    if (result?.winner === 'O') scores.O++;
    if (result?.winner === 'VELHA') scores.draw++;

    await gameRef.update({
        board: newBoard,
        currentTurn: result ? nextStarter : (playerSymbol === 'X' ? 'O' : 'X'),
        gameActive: result ? false : true,
        winner: result?.winner || null,
        winningLine: result?.line || [],
        loserStarts: nextStarter,
        scores: scores
    });
}

async function createNewGame() {
    if (currentListenerRef) currentListenerRef.off();

    const newGameRef = database.ref('games').push();
    currentGameId = newGameRef.key;
    playerSymbol = 'X';
    currentTurn = 'X';
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    winningLine = [];
    gameActive = true;
    loserStarts = 'O';

    await newGameRef.set({
        board: gameBoard,
        currentTurn: currentTurn,
        gameActive: true,
        winner: null,
        winningLine: [],
        loserStarts: loserStarts,
        scores: { X:0, O:0, draw:0 },
        players: { X: true, O: false }
    });

    localStorage.setItem('jogoVelha_gameId', currentGameId);
    localStorage.setItem('jogoVelha_symbol', playerSymbol);

    setupDiv.style.display = 'none';
    gameAreaDiv.style.display = 'block';
    joinAreaDiv.style.display = 'none';

    renderBoard(boardDiv, gameBoard, winningLine, true);
    updateStatusText();
    listenGame();
}

function listenGame() {
    if (currentListenerRef) currentListenerRef.off();
    const gameRef = database.ref(`games/${currentGameId}`);
    currentListenerRef = gameRef;

    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        gameBoard = data.board || gameBoard;
        currentTurn = data.currentTurn || currentTurn;
        gameActive = data.gameActive;
        winningLine = data.winningLine || [];
        loserStarts = data.loserStarts || loserStarts;
        updateScoreboard(data);

        if (gameAreaDiv.style.display === 'block') {
            renderBoard(boardDiv, gameBoard, winningLine, true);
        } else if (joinAreaDiv.style.display === 'block') {
            renderBoard(joinBoardDiv, gameBoard, winningLine, true);
        }

        updateStatusText();

        if (data.winner === 'X') showWinnerMessage('X venceu');
        if (data.winner === 'O') showWinnerMessage('O venceu');
        if (data.winner === 'VELHA') showWinnerMessage('Velha');
    });
}

async function joinGame(gameId, symbol, isReconnect = false) {
    const gameRef = database.ref(`games/${gameId}`);
    const snapshot = await gameRef.get();
    const data = snapshot.val();
    if (!data) {
        alert('Sala não encontrada');
        return;
    }

    if (isReconnect && symbol) {
        const slot = (symbol === 'X') ? 'X' : 'O';
        if (data.players[slot] === true) {
            currentGameId = gameId;
            playerSymbol = symbol;
            setupDiv.style.display = 'none';
            gameAreaDiv.style.display = (playerSymbol === 'X') ? 'block' : 'none';
            joinAreaDiv.style.display = (playerSymbol === 'O') ? 'block' : 'none';
            if (playerSymbol === 'X') renderBoard(boardDiv, gameBoard, winningLine, true);
            else renderBoard(joinBoardDiv, gameBoard, winningLine, true);
            listenGame();
            return;
        } else {
            localStorage.removeItem('jogoVelha_gameId');
            localStorage.removeItem('jogoVelha_symbol');
            window.location.reload();
            return;
        }
    }

    let assignedSymbol = null;
    if (!data.players.X) {
        assignedSymbol = 'X';
        await gameRef.child('players/X').set(true);
    } else if (!data.players.O) {
        assignedSymbol = 'O';
        await gameRef.child('players/O').set(true);
    } else {
        alert('Sala cheia');
        return;
    }

    playerSymbol = assignedSymbol;
    currentGameId = gameId;
    localStorage.setItem('jogoVelha_gameId', currentGameId);
    localStorage.setItem('jogoVelha_symbol', playerSymbol);

    setupDiv.style.display = 'none';
    if (playerSymbol === 'X') {
        gameAreaDiv.style.display = 'block';
        joinAreaDiv.style.display = 'none';
    } else {
        gameAreaDiv.style.display = 'none';
        joinAreaDiv.style.display = 'block';
    }
    listenGame();
}

async function restartGame() {
    const gameRef = database.ref(`games/${currentGameId}`);
    await gameRef.update({
        board: ['', '', '', '', '', '', '', '', ''],
        currentTurn: loserStarts,
        gameActive: true,
        winner: null,
        winningLine: []
    });
}

function shareGame() {
    const link = `${window.location.origin}${window.location.pathname}?room=${currentGameId}`;
    if (navigator.share) {
        navigator.share({ title: 'Jogo da Velha', text: 'Vamos jogar!', url: link });
    } else {
        prompt('Copie o link:', link);
    }
}

createGameBtn.addEventListener('click', createNewGame);
restartBtn.addEventListener('click', restartGame);
shareBtn.addEventListener('click', shareGame);

const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');
if (roomFromUrl) {
    joinGame(roomFromUrl, null, false);
}
