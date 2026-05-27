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

const db = firebase.database();

const boardElement = document.getElementById("board");

const createRoomButton = document.getElementById("create-room");

const restartGameButton = document.getElementById("restart-game");

const shareRoomButton = document.getElementById("share-room");

const playerNameInput = document.getElementById("player-name");

const playerXElement = document.getElementById("player-x");

const playerOElement = document.getElementById("player-o");

const roomCodeElement = document.getElementById("room-code");

const statusElement = document.getElementById("status");

const scoreXElement = document.getElementById("score-x");

const scoreOElement = document.getElementById("score-o");

const scoreDrawElement = document.getElementById("score-draw");

const overlay = document.getElementById("overlay");

const winnerText = document.getElementById("winner-text");

let roomId = null;

let playerSymbol = null;

let playerName = null;

let gameRef = null;

const wins = [

    [0,1,2],
    [3,4,5],
    [6,7,8],

    [0,3,6],
    [1,4,7],
    [2,5,8],

    [0,4,8],
    [2,4,6]

];

window.onload = () => {

    const room = new URLSearchParams(window.location.search).get("room");

    if(room){

        joinRoom(room);

    }

};

function renderBoard(board, winLine = []){

    boardElement.innerHTML = "";

    board.forEach((cellValue,index)=>{

        const cell = document.createElement("div");

        cell.classList.add("cell");

        if(cellValue){

            cell.classList.add(cellValue);

        }

        if(winLine.includes(index)){

            cell.classList.add("win");

        }

        cell.innerText = cellValue;

        cell.onclick = () => makeMove(index);

        boardElement.appendChild(cell);

    });

}

function checkWinner(board){

    for(const combo of wins){

        const [a,b,c] = combo;

        if(

            board[a] &&
            board[a] === board[b] &&
            board[a] === board[c]

        ){

            return {

                winner: board[a],
                line: combo

            };

        }

    }

    if(!board.includes("")){

        return {

            winner:"DRAW",
            line:[]

        };

    }

    return null;

}

async function createRoom(){

    playerName = playerNameInput.value.trim();

    if(!playerName){

        alert("Digite seu nome");

        return;

    }

    playerSymbol = "X";

    const room = db.ref("rooms").push();

    roomId = room.key;

    await room.set({

        board:["","","","","","","","",""],

        turn:"X",

        active:true,

        winner:null,

        winLine:[],

        loserStarts:"O",

        scores:{

            X:0,
            O:0,
            draw:0

        },

        players:{

            X:{

                name:playerName

            },

            O:{

                name:"Esperando..."

            }

        }

    });

    startGame();

}

async function joinRoom(id){

    playerName = prompt("Digite seu nome");

    if(!playerName){

        return;

    }

    const ref = db.ref("rooms/" + id);

    const snap = await ref.get();

    const data = snap.val();

    if(!data){

        alert("Sala não encontrada");

        return;

    }

    if(data.players.O.name !== "Esperando..."){

        alert("Sala cheia");

        return;

    }

    await ref.child("players/O").set({

        name:playerName

    });

    roomId = id;

    playerSymbol = "O";

    startGame();

}

function startGame(){

    roomCodeElement.innerText = "Sala: " + roomId;

    gameRef = db.ref("rooms/" + roomId);

    gameRef.on("value",snapshot=>{

        const data = snapshot.val();

        if(!data){

            return;

        }

        renderBoard(data.board,data.winLine);

        playerXElement.innerText = data.players.X.name;

        playerOElement.innerText = data.players.O.name;

        scoreXElement.innerText = data.scores.X;

        scoreOElement.innerText = data.scores.O;

        scoreDrawElement.innerText = data.scores.draw;

        if(data.active){

            statusElement.innerText = "Vez de " + data.turn;

        }

        if(data.winner === "X"){

            statusElement.innerText = data.players.X.name + " venceu";

            showWinner(data.players.X.name + " venceu");

        }

        if(data.winner === "O"){

            statusElement.innerText = data.players.O.name + " venceu";

            showWinner(data.players.O.name + " venceu");

        }

        if(data.winner === "DRAW"){

            statusElement.innerText = "Deu velha";

            showWinner("Deu velha");

        }

    });

}

async function makeMove(index){

    const snap = await gameRef.get();

    const data = snap.val();

    if(!data.active){

        return;

    }

    if(data.turn !== playerSymbol){

        return;

    }

    if(data.board[index] !== ""){

        return;

    }

    const newBoard = [...data.board];

    newBoard[index] = playerSymbol;

    const result = checkWinner(newBoard);

    let nextTurn = playerSymbol === "X" ? "O" : "X";

    let loserStarts = data.loserStarts;

    const scores = data.scores;

    if(result){

        if(result.winner === "X"){

            scores.X++;

            loserStarts = "O";

        }

        if(result.winner === "O"){

            scores.O++;

            loserStarts = "X";

        }

        if(result.winner === "DRAW"){

            scores.draw++;

        }

    }

    await gameRef.update({

        board:newBoard,

        turn:result ? loserStarts : nextTurn,

        active:!result,

        winner:result ? result.winner : null,

        winLine:result ? result.line : [],

        loserStarts,

        scores

    });

}

async function restartGame(){

    const snap = await gameRef.get();

    const data = snap.val();

    await gameRef.update({

        board:["","","","","","","","",""],

        turn:data.loserStarts,

        active:true,

        winner:null,

        winLine:[]

    });

}

function showWinner(text){

    winnerText.innerText = text;

    overlay.classList.add("show");

    setTimeout(()=>{

        overlay.classList.remove("show");

    },2500);

}

function shareRoom(){

    const link = window.location.origin + window.location.pathname + "?room=" + roomId;

    navigator.clipboard.writeText(link);

    alert("Link copiado");

}

createRoomButton.onclick = createRoom;

restartGameButton.onclick = restartGame;

shareRoomButton.onclick = shareRoom;const firebaseConfig = {
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
