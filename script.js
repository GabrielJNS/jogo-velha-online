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
let isProcessing = false;
let currentListener = null;

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

function renderBoard(boardElement, isJoinBoard = false) {
    boardElement.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.textContent = gameBoard[i];
        const canClick = gameActive && gameBoard[i] === '' && currentTurn === playerSymbol && !isProcessing;
        if (canClick) {
            if ((!isJoinBoard && playerSymbol === 'X') || (isJoinBoard && playerSymbol === 'O')) {
                cell.addEventListener('click', () => makeMove(i));
            } else if (!isJoinBoard && playerSymbol === 'X') {
                cell.addEventListener('click', () => makeMove(i));
            } else if (isJoinBoard && playerSymbol === 'O') {
                cell.addEventListener('click', () => makeMove(i));
            }
        }
        boardElement.appendChild(cell);
    }
}

function checkWinner() {
    const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    for (let pattern of winPatterns) {
        const [a,b,c] = pattern;
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
    if (winner === 'X') statusText = '🎉 Jogador X venceu! 🎉';
    else if (winner === 'O') statusText = '🎉 Jogador O venceu! 🎉';
    else if (winner === 'empate') statusText = '😲 Empate! 😲';
    else statusText = `Vez do jogador: ${currentTurn}`;
    
    if (gameAreaDiv.style.display !== 'none') gameStatusSpan.textContent = statusText;
    else joinStatusSpan.textContent = statusText;
}

async function makeMove(index) {
    if (isProcessing) return;
    if (!gameActive || gameBoard[index] !== '' || currentTurn !== playerSymbol) return;
    
    isProcessing = true;
    
    gameBoard[index] = playerSymbol;
    renderBoard(boardDiv, false);
    renderBoard(joinBoardDiv, true);
    
    const winner = checkWinner();
    let gameOver = false;
    let winnerSymbol = null;
    if (winner) {
        gameActive = false;
        gameOver = true;
        winnerSymbol = winner;
    }
    
    const nextTurn = currentTurn === 'X' ? 'O' : 'X';
    
    if (currentGameId) {
        try {
            await database.ref(`games/${currentGameId}`).update({
                board: gameBoard,
                currentTurn: nextTurn,
                gameActive: gameActive,
                winner: winnerSymbol,
                lastMove: Date.now()
            });
        } catch (error) {
            console.error("Firebase error:", error);
            isProcessing = false;
            return;
        }
    }
    
    if (!gameOver) {
        currentTurn = nextTurn;
        updateGameStatus();
        renderBoard(boardDiv, false);
        renderBoard(joinBoardDiv, true);
    } else {
        updateGameStatus();
    }
    
    isProcessing = false;
}

function listenToGameChanges() {
    if (currentListener) currentListener.off();
    if (!currentGameId) return;
    const gameRef = database.ref(`games/${currentGameId}`);
    currentListener = gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        if (data.players && data.players.player2 && !playerSymbol) {
            playerSymbol = 'O';
            if (gameAreaDiv.style.display !== 'none') {
                gameAreaDiv.style.display = 'none';
                joinAreaDiv.style.display = 'block';
            }
        }
        
        if (data.board) gameBoard = [...data.board];
        if (data.currentTurn) currentTurn = data.currentTurn;
        if (data.gameActive !== undefined) gameActive = data.gameActive;
        
        if (playerSymbol === 'X') {
            renderBoard(boardDiv, false);
            renderBoard(joinBoardDiv, true);
        } else {
            renderBoard(joinBoardDiv, true);
            renderBoard(boardDiv, false);
        }
        updateGameStatus();
    });
}

async function createNewGame() {
    if (currentGameId && currentListener) {
        currentListener.off();
    }
    const newGameRef = database.ref('games').push();
    currentGameId = newGameRef.key;
    playerSymbol = 'X';
    currentTurn = 'X';
    gameActive = true;
    gameBoard = ['', '', '', '', '', '', '', '', ''];
    isProcessing = false;
    
    await newGameRef.set({
        board: gameBoard,
        currentTurn: currentTurn,
        gameActive: gameActive,
        players: { player1: 'X', player2: null },
        winner: null,
        createdAt: Date.now()
    });
    
    setupDiv.style.display = 'none';
    gameAreaDiv.style.display = 'block';
    joinAreaDiv.style.display = 'none';
    renderBoard(boardDiv, false);
    updateGameStatus();
    listenToGameChanges();
}

async function joinGame(gameId) {
    if (currentGameId && currentListener) {
        currentListener.off();
    }
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
        alert('Sala não disponível ou já cheia!');
        window.location.href = window.location.pathname;
    }
}

function shareGameLink() {
    if (!currentGameId) return;
    const gameLink = `${window.location.origin}${window.location.pathname}?room=${currentGameId}`;
    let linkDiv = document.getElementById('game-link-display');
    if (!linkDiv) {
        linkDiv = document.createElement('div');
        linkDiv.id = 'game-link-display';
        const shareBtnElem = document.getElementById('share-game');
        shareBtnElem.parentNode.insertBefore(linkDiv, shareBtnElem);
    }
    linkDiv.innerHTML = `🔗 Link para convidar: <a href="${gameLink}" target="_blank">${gameLink}</a><br><small>Clique com botão direito e copie</small>`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Jogo da Velha Online',
            text: 'Jogue comigo!',
            url: gameLink,
        }).catch(() => {});
    } else {
        navigator.clipboard.writeText(gameLink).then(() => {
            alert('Link copiado! Envie para seu amigo.');
        }).catch(() => {
            prompt('Copie o link manualmente:', gameLink);
        });
    }
}

createGameBtn.addEventListener('click', createNewGame);
restartBtn.addEventListener('click', () => {
    if (currentGameId) {
        database.ref(`games/${currentGameId}`).remove();
        createNewGame();
    }
});
shareBtn.addEventListener('click', shareGameLink);

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
if (roomId) {
    joinGame(roomId);
} else {
    setupDiv.style.display = 'block';
}
