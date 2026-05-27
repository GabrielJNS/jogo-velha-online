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

    const scores = {
        X:data.scores.X,
        O:data.scores.O,
        draw:data.scores.draw
    };

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

    if(!roomId){

        alert("Crie uma sala primeiro");
        return;

    }

    const link = window.location.origin + window.location.pathname + "?room=" + roomId;

    navigator.clipboard.writeText(link);

    alert("Link copiado");

}

createRoomButton.onclick = createRoom;

restartGameButton.onclick = restartGame;

shareRoomButton.onclick = shareRoom;
