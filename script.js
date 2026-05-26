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

const database = firebase.database();

let currentGameId = null;
let playerSymbol = null;
let currentTurn = 'X';
let gameActive = true;
let gameBoard = ['', '', '', '', '', '', '', '', ''];
let winningLine = [];

const setupDiv = document.getElementById('game-setup');
const gameAreaDiv = document.getElementById('game-area');
const joinAreaDiv = document.getElementById('join-area');

const createGameBtn = document.getElementById('create-game');
const restartBtn = document.getElementById('restart-game');
const shareBtn = document.getElementById('share-game');

const boardDiv = document.getElementById('board');
const joinBoardDiv = document.getElementById('join-board');

const gameStatusSpan = document.getElementById('game-status');
const joinStatusSpan = document.getElementById('join-status');

function renderBoard(boardElement) {

    boardElement.innerHTML = '';

    for (let i = 0; i < 9; i++) {

        const cell = document.createElement('div');

        cell.classList.add('cell');

        cell.textContent = gameBoard[i];

        if (gameBoard[i] === 'X') {
            cell.classList.add('X');
        }

        if (gameBoard[i] === 'O') {
            cell.classList.add('O');
        }

        if (winningLine.includes(i)) {
            cell.classList.add('win');
        }

        if (
            gameActive &&
            gameBoard[i] === '' &&
            currentTurn === playerSymbol
        ) {
            cell.addEventListener('click', () => makeMove(i));
        }

        boardElement.appendChild(cell);
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

    for (const pattern of patterns) {

        const [a,b,c] = pattern;

        if (
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

    if (!board.includes('')) {

        return {
            winner: 'empate',
            line: []
        };
    }

    return null;
}

function updateGameStatus() {

    let text = '';

    const result = checkWinner(gameBoard);

    if (result?.winner === 'X') {
        text = '🎉 Jogador X venceu!';
    }
    else if (result?.winner === 'O') {
        text = '🎉 Jogador O venceu!';
    }
    else if (result?.winner === 'empate') {
        text = '😲 Empate!';
    }
    else {
        text = `Vez do jogador ${currentTurn}`;
    }

    gameStatusSpan.textContent = text;
    joinStatusSpan.textContent = text;
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

    await gameRef.update({

        board: newBoard,

        currentTurn: playerSymbol === 'X' ? 'O' : 'X',

        gameActive: result ? false : true,

        winner: result?.winner || null,

        winningLine: result?.line || []

    });
}

async function createNewGame() {

    const newGameRef = database.ref('games').push();

    currentGameId = newGameRef.key;

    playerSymbol = 'X';

    currentTurn = 'X';

    gameActive = true;

    gameBoard = ['', '', '', '', '', '', '', '', ''];

    winningLine = [];

    await newGameRef.set({

        board: gameBoard,

        currentTurn: currentTurn,

        gameActive: true,

        winner: null,

        winningLine: [],

        players: {

            player1: 'X',

            player2: null

        }
    });

    setupDiv.style.display = 'none';

    gameAreaDiv.style.display = 'block';

    renderBoard(boardDiv);

    updateGameStatus();

    listenToGameChanges();
}

function listenToGameChanges() {

    if (!currentGameId) return;

    const gameRef = database.ref(`games/${currentGameId}`);

    gameRef.on('value', (snapshot) => {

        const data = snapshot.val();

        if (!data) return;

        gameBoard = data.board || gameBoard;

        currentTurn = data.currentTurn || currentTurn;

        gameActive = data.gameActive;

        winningLine = data.winningLine || [];

        renderBoard(boardDiv);

        renderBoard(joinBoardDiv);

        updateGameStatus();
    });
}

async function joinGame(gameId) {

    const gameRef = database.ref(`games/${gameId}`);

    const snapshot = await gameRef.get();

    const gameData = snapshot.val();

    if (!gameData) {

        alert('Sala não encontrada');

        return;
    }

    if (gameData.players.player2) {

        alert('Sala cheia');

        return;
    }

    await gameRef.child('players/player2').set('O');

    currentGameId = gameId;

    playerSymbol = 'O';

    setupDiv.style.display = 'none';

    joinAreaDiv.style.display = 'block';

    listenToGameChanges();
}

function shareGameLink() {

    const link = `${window.location.origin}${window.location.pathname}?room=${currentGameId}`;

    if (navigator.share) {

        navigator.share({
            title: 'Jogo da Velha',
            text: 'Vem jogar comigo',
            url: link
        });

    } else {

        prompt('Copie o link:', link);
    }
}

createGameBtn.addEventListener('click', createNewGame);

restartBtn.addEventListener('click', async () => {

    if (!currentGameId) return;

    await database.ref(`games/${currentGameId}`).update({

        board: ['', '', '', '', '', '', '', '', ''],

        currentTurn: 'X',

        gameActive: true,

        winner: null,

        winningLine: []

    });
});

shareBtn.addEventListener('click', shareGameLink);

const urlParams = new URLSearchParams(window.location.search);

const roomId = urlParams.get('room');

if (roomId) {

    joinGame(roomId);

} else {

    setupDiv.style.display = 'block';
}
