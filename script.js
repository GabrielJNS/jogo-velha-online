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
let playerSymbol = 'X';
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

const chooseX = document.getElementById('choose-x');
const chooseO = document.getElementById('choose-o');

const winnerOverlay = document.getElementById('winner-overlay');
const winnerText = document.getElementById('winner-text');

const scoreXElement = document.getElementById('score-x');
const scoreOElement = document.getElementById('score-o');
const scoreDrawElement = document.getElementById('score-draw');

chooseX.addEventListener('click', () => {

    playerSymbol = 'X';

    chooseX.classList.add('active');

    chooseO.classList.remove('active');
});

chooseO.addEventListener('click', () => {

    playerSymbol = 'O';

    chooseO.classList.add('active');

    chooseX.classList.remove('active');
});

function updateScoreboard(data) {

    scoreXElement.textContent = data?.scores?.X || 0;

    scoreOElement.textContent = data?.scores?.O || 0;

    scoreDrawElement.textContent = data?.scores?.draw || 0;
}

function renderBoard(element) {

    element.innerHTML = '';

    for(let i = 0; i < 9; i++) {

        const cell = document.createElement('div');

        cell.classList.add('cell');

        cell.textContent = gameBoard[i];

        if(gameBoard[i] === 'X') {
            cell.classList.add('X');
        }

        if(gameBoard[i] === 'O') {
            cell.classList.add('O');
        }

        if(winningLine.includes(i)) {
            cell.classList.add('win');
        }

        if(
            gameActive &&
            gameBoard[i] === '' &&
            currentTurn === playerSymbol
        ) {
            cell.addEventListener('click', () => makeMove(i));
        }

        element.appendChild(cell);
    }
}

function checkWinner(board) {

    const patterns = [
        [0,1,2],
        [3,4,5],
        [6,7,8],
        [0,3,6],
        [1,4,7],
        [2,5,8],
        [0,4,8],
        [2,4,6]
    ];

    for(const pattern of patterns) {

        const [a,b,c] = pattern;

        if(
            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]
        ) {

            return {
                winner: board[a],
                line: pattern
            };
        }
    }

    if(!board.includes('')) {

        return {
            winner: 'VELHA',
            line: []
        };
    }

    return null;
}

function updateStatus() {

    let text = '';

    const result = checkWinner(gameBoard);

    if(result?.winner === 'X') {
        text = 'X venceu';
    }
    else if(result?.winner === 'O') {
        text = 'O venceu';
    }
    else if(result?.winner === 'VELHA') {
        text = 'Velha';
    }
    else {
        text = `Vez de ${currentTurn}`;
    }

    gameStatus.textContent = text;
    joinStatus.textContent = text;
}

function showWinner(text) {

    winnerText.textContent = text;

    winnerOverlay.classList.add('show');

    setTimeout(() => {

        winnerOverlay.classList.remove('show');

    }, 2500);
}

async function makeMove(index) {

    if(!gameActive) return;

    const gameRef = database.ref(`games/${currentGameId}`);

    const snapshot = await gameRef.get();

    const data = snapshot.val();

    if(!data) return;

    if(data.board[index] !== '') return;

    if(data.currentTurn !== playerSymbol) return;

    const newBoard = [...data.board];

    newBoard[index] = playerSymbol;

    const result = checkWinner(newBoard);

    let nextStarter = data.loserStarts || 'X';

    if(result?.winner === 'X') {
        nextStarter = 'O';
    }

    if(result?.winner === 'O') {
        nextStarter = 'X';
    }

    const scores = data.scores || {

        X:0,
        O:0,
        draw:0
    };

    if(result?.winner === 'X') {
        scores.X++;
    }

    if(result?.winner === 'O') {
        scores.O++;
    }

    if(result?.winner === 'VELHA') {
        scores.draw++;
    }

    await gameRef.update({

        board: newBoard,

        currentTurn: result ? nextStarter : playerSymbol === 'X' ? 'O' : 'X',

        gameActive: result ? false : true,

        winner: result?.winner || null,

        winningLine: result?.line || [],

        loserStarts: nextStarter,

        scores: scores
    });
}

async function createNewGame() {

    const newGameRef = database.ref('games').push();

    currentGameId = newGameRef.key;

    currentTurn = playerSymbol;

    gameBoard = ['', '', '', '', '', '', '', '', ''];

    winningLine = [];

    gameActive = true;

    await newGameRef.set({

        board: gameBoard,

        currentTurn: currentTurn,

        gameActive: true,

        winner: null,

        winningLine: [],

        loserStarts: playerSymbol === 'X' ? 'O' : 'X',

        scores: {

            X:0,
            O:0,
            draw:0
        },

        players: {

            X: playerSymbol === 'X',

            O: playerSymbol === 'O'
        }
    });

    setupDiv.style.display = 'none';

    gameAreaDiv.style.display = 'block';

    renderBoard(boardDiv);

    updateStatus();

    listenGame();
}

function listenGame() {

    const gameRef = database.ref(`games/${currentGameId}`);

    gameRef.on('value', (snapshot) => {

        const data = snapshot.val();

        if(!data) return;

        gameBoard = data.board || gameBoard;

        currentTurn = data.currentTurn || currentTurn;

        gameActive = data.gameActive;

        winningLine = data.winningLine || [];

        loserStarts = data.loserStarts || loserStarts;

        updateScoreboard(data);

        renderBoard(boardDiv);

        renderBoard(joinBoardDiv);

        updateStatus();

        if(data.winner === 'X') {
            showWinner('X venceu');
        }

        if(data.winner === 'O') {
            showWinner('O venceu');
        }

        if(data.winner === 'VELHA') {
            showWinner('Velha');
        }
    });
}

async function joinGame(gameId) {

    const gameRef = database.ref(`games/${gameId}`);

    const snapshot = await gameRef.get();

    const data = snapshot.val();

    if(!data) {

        alert('Sala não encontrada');

        return;
    }

    if(data.players.X && data.players.O) {

        alert('Sala cheia');

        return;
    }

    if(!data.players.X) {

        playerSymbol = 'X';

        await gameRef.child('players/X').set(true);
    }
    else {

        playerSymbol = 'O';

        await gameRef.child('players/O').set(true);
    }

    currentGameId = gameId;

    setupDiv.style.display = 'none';

    joinAreaDiv.style.display = 'block';

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

    if(navigator.share) {

        navigator.share({

            title:'Jogo da Velha',

            text:'Vamos jogar',

            url:link
        });
    }
    else {

        prompt('Copie o link:', link);
    }
}

createGameBtn.addEventListener('click', createNewGame);

restartBtn.addEventListener('click', restartGame);

shareBtn.addEventListener('click', shareGame);

const params = new URLSearchParams(window.location.search);

const roomId = params.get('room');

if(roomId) {

    joinGame(roomId);
}
