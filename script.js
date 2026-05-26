// --- Configuração do Firebase (será preenchida depois) ---
  const firebaseConfig = {

    apiKey: "AIzaSyDjyK1m44L76tvpRtV6KhEmHHumHxeNqy4",

    authDomain: "meu-jogo-velha.firebaseapp.com",

    databaseURL: "https://meu-jogo-velha-default-rtdb.firebaseio.com",

    projectId: "meu-jogo-velha",

    storageBucket: "meu-jogo-velha.firebasestorage.app",

    messagingSenderId: "699322233191",

    appId: "1:699322233191:web:cbf9ca5cc9153b2b2b7fc2"

  };



// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Variáveis Globais ---
let currentGameId = null;      // ID da sala atual
let playerSymbol = null;       // 'X' ou 'O' para o jogador atual
let currentTurn = 'X';         // De quem é a vez ('X' começa)
let gameActive = true;          // Se o jogo ainda está ativo
let gameBoard = ['', '', '', '', '', '', '', '', '']; // Estado do tabuleiro

// --- Elementos DOM ---
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

// --- Funções Auxiliares do Jogo ---
function renderBoard(boardElement, isJoinBoard = false) {
    boardElement.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = gameBoard[i];
        if (!isJoinBoard && gameActive && gameBoard[i] === '' && currentTurn === playerSymbol) {
            cell.addEventListener('click', () => makeMove(i));
        } else if (isJoinBoard && gameActive && gameBoard[i] === '' && currentTurn === playerSymbol) {
            cell.addEventListener('click', () => makeMove(i));
        }
        boardElement.appendChild(cell);
    }
}

function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Linhas
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colunas
        [0, 4, 8], [2, 4, 6]             // Diagonais
    ];
    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
            gameActive = false;
            return gameBoard[a];
        }
    }
    if (!gameBoard.includes('')) {
        gameActive = false;
        return 'empate';
    }
    return null;
}

function updateGameStatus() {
    const winner = checkWinner();
    let statusText = '';
    if (winner === 'X') {
        statusText = '🎉 Jogador X venceu! 🎉';
    } else if (winner === 'O') {
        statusText = '🎉 Jogador O venceu! 🎉';
    } else if (winner === 'empate') {
        statusText = '😲 Empate! 😲';
    } else {
        statusText = `Vez do jogador: ${currentTurn}`;
    }
    if (gameAreaDiv.style.display !== 'none') {
        gameStatusSpan.textContent = statusText;
    } else {
        joinStatusSpan.textContent = statusText;
    }
}

async function makeMove(index) {
    if (!gameActive || gameBoard[index] !== '' || currentTurn !== playerSymbol) return;
    
    // Atualiza localmente
    gameBoard[index] = playerSymbol;
    renderBoard(boardDiv);
    renderBoard(joinBoardDiv, true);
    
    const winner = checkWinner();
    let gameOver = false;
    let winnerSymbol = null;
    if (winner) {
        gameActive = false;
        gameOver = true;
        winnerSymbol = winner;
    }
    
    // Envia a jogada para o Firebase
    if (currentGameId) {
        await database.ref(`games/${currentGameId}`).update({
            board: gameBoard,
            currentTurn: currentTurn === 'X' ? 'O' : 'X',
            gameActive: gameActive,
            winner: winnerSymbol,
            lastMove: Date.now()
        });
    }
    
    if (!gameOver) {
        currentTurn = currentTurn === 'X' ? 'O' : 'X';
        updateGameStatus();
        renderBoard(boardDiv);
        renderBoard(joinBoardDiv, true);
    } else {
        updateGameStatus();
    }
}

// --- Funções do Firebase e Multiplayer ---
async function createNewGame() {
    const newGameRef = database.ref('games').push();
    currentGameId = newGameRef.key;
    playerSymbol = 'X';
    currentTurn = 'X';
    gameActive = true;
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    
    await newGameRef.set({
        board: gameBoard,
        currentTurn: currentTurn,
        gameActive: gameActive,
        players: {
            player1: 'X',
            player2: null
        },
        winner: null,
        createdAt: Date.now()
    });
    
    setupDiv.style.display = 'none';
    gameAreaDiv.style.display = 'block';
    joinAreaDiv.style.display = 'none';
    renderBoard(boardDiv);
    updateGameStatus();
    
    // Escuta as mudanças no Firebase
    listenToGameChanges();
}

function listenToGameChanges() {
    if (!currentGameId) return;
    const gameRef = database.ref(`games/${currentGameId}`);
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Verifica se o segundo jogador entrou
            if (data.players.player2 && !playerSymbol) {
                playerSymbol = 'O';
                if (gameAreaDiv.style.display !== 'none') {
                    gameAreaDiv.style.display = 'none';
                    joinAreaDiv.style.display = 'block';
                }
                renderBoard(joinBoardDiv, true);
                updateGameStatus();
            }
            
            // Atualiza o estado do jogo
            if (data.board) gameBoard = data.board;
            if (data.currentTurn) currentTurn = data.currentTurn;
            if (data.gameActive !== undefined) gameActive = data.gameActive;
            
            // Re-renderiza o tabuleiro correto
            if (playerSymbol === 'X') {
                renderBoard(boardDiv);
                renderBoard(joinBoardDiv, true);
            } else {
                renderBoard(joinBoardDiv, true);
                renderBoard(boardDiv);
            }
            updateGameStatus();
        }
    });
}

async function joinGame(gameId) {
    currentGameId = gameId;
    const gameRef = database.ref(`games/${gameId}`);
    const snapshot = await gameRef.get();
    const gameData = snapshot.val();
    
    if (gameData && !gameData.players.player2) {
        playerSymbol = 'O';
        await gameRef.child('players/player2').set('O');
        setupDiv.style.display = 'none';
        gameAreaDiv.style.display = 'none';
        joinAreaDiv.style.display = 'block';
        renderBoard(joinBoardDiv, true);
        updateGameStatus();
        listenToGameChanges();
    } else {
        alert('Esta sala não existe ou já está cheia!');
        window.location.href = window.location.pathname;
    }
}

function shareGameLink() {
    const gameLink = `${window.location.origin}${window.location.pathname}?room=${currentGameId}`;
    if (navigator.share) {
        navigator.share({
            title: 'Jogo da Velha Online',
            text: 'Venha jogar comigo!',
            url: gameLink,
        });
    } else {
        prompt('Compartilhe este link com seu amigo:', gameLink);
    }
}

// --- Event Listeners e Inicialização ---
createGameBtn.addEventListener('click', createNewGame);
restartBtn.addEventListener('click', () => {
    if (currentGameId) {
        database.ref(`games/${currentGameId}`).remove();
        createNewGame();
    }
});
shareBtn.addEventListener('click', shareGameLink);

// Verifica se entrou com um link de convite (ex: ?room=123)
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
if (roomId) {
    joinGame(roomId);
} else {
    setupDiv.style.display = 'block';
}