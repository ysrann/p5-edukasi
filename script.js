// BOARD CONFIGURATION
const BOARD_SIZE = 100;
const ROWS = 10;
const COLS = 10;

// Ladder and Snake positions
// key: start point, value: end point
const ladders = {
  3: 22,
  8: 30,
  28: 55,
  58: 77,
  75: 86,
  80: 99,
};

const snakes = {
  17: 7,
  52: 29,
  57: 40,
  62: 22,
  88: 18,
  95: 24,
  97: 76,
};

// Question points (10 points)
const questionPoints = [5, 14, 33, 44, 47, 59, 63, 72, 83, 91];

// Pertanyaan Pilihan Ganda (Pengetahuan Umum Indonesia)
const questions = [
  {
    question: "Ibukota Indonesia adalah?",
    options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
    answer: 0,
  },
  {
    question: "Pulau terbesar di Indonesia?",
    options: ["Sumatra", "Kalimantan", "Jawa", "Sulawesi"],
    answer: 1,
  },
  {
    question: "Pahlawan nasional berasal dari Jawa Timur?",
    options: ["Sudirman", "Diponegoro", "Sutomo", "Cut Nyak Dhien"],
    answer: 2,
  },
  {
    question: "Lambang negara Indonesia?",
    options: ["Garuda Pancasila", "Bhinneka Tunggal Ika", "Merah Putih", "Garuda Wisnu"],
    answer: 0,
  },
  {
    question: "Bahasa resmi Indonesia?",
    options: ["Jawa", "Sunda", "Indonesia", "Melayu"],
    answer: 2,
  },
  {
    question: "Presiden pertama Indonesia?",
    options: ["Soekarno", "Soeharto", "Jokowi", "Habibie"],
    answer: 0,
  },
  {
    question: "Lagu kebangsaan Indonesia?",
    options: ["Indonesia Raya", "Tanah Airku", "Bagimu Negeri", "Halo Halo Bandung"],
    answer: 0,
  },
  {
    question: "Lembaga legislatif Indonesia?",
    options: ["DPR", "MPR", "DPRD", "Semua benar"],
    answer: 3,
  },
  {
    question: "Hari kemerdekaan Indonesia?",
    options: ["17 Agustus 1945", "20 Mei 1908", "28 Oktober 1928", "1 Juni 1945"],
    answer: 0,
  },
  {
    question: "Makanan khas Indonesia?",
    options: ["Sushi", "Nasi Goreng", "Pizza", "Taco"],
    answer: 1,
  },
];

// Game State
let playerPositions = [0, 0]; // index 0: player 1, index 1: player 2
let currentPlayer = 0; // 0 or 1
let isMoving = false;
let questionActive = false;
let currentQuestionIndex = null;
let questionTimer;
let questionTimeLeft = 10;
let answeredQuestions = new Set(); // track question indices already answered (reset if landed again)

// DOM Elements
const board = document.getElementById("board");
const diceResult = document.getElementById("dice-result");
const rollDiceBtn = document.getElementById("roll-dice-btn");
const turnInfo = document.getElementById("turn-info");
const questionContainer = document.getElementById("question-container");
const questionText = document.getElementById("question-text");
const answersDiv = document.getElementById("answers");
const timerDiv = document.getElementById("timer");
const winnerDiv = document.getElementById("winner");

// Create board cells
function createBoard() {
  // Because ular tangga papan zigzag dari bawah ke atas:
  // Baris ganjil dari kiri ke kanan, baris genap dari kanan ke kiri
  for (let row = ROWS - 1; row >= 0; row--) {
    let isEvenRow = (ROWS - 1 - row) % 2 === 1;
    for (let col = 0; col < COLS; col++) {
      let cellNum = row * COLS + (isEvenRow ? COLS - 1 - col : col) + 1;
      const cell = document.createElement("div");
      cell.classList.add("cell");

      // Tentukan tipe cell
      if (ladders[cellNum]) cell.classList.add("ladder");
      else if (snakes[cellNum]) cell.classList.add("snake");
      else if (questionPoints.includes(cellNum)) cell.classList.add("question");
      else cell.classList.add("normal");

      cell.dataset.cellNum = cellNum;
      const spanNum = document.createElement("span");
      spanNum.classList.add("number");
      spanNum.textContent = cellNum;
      cell.appendChild(spanNum);
      board.appendChild(cell);
    }
  }
}

// Posisi pixel pion dari cell
function getCellPosition(cellNum) {
  // hitung posisi absolut di dalam papan
  // hitung posisi row dan col seperti createBoard
  const index = cellNum - 1;
  const row = Math.floor(index / COLS);
  const rowFromBottom = ROWS - 1 - row;
  const isEvenRow = rowFromBottom % 2 === 1;
  let col;
  if (!isEvenRow) {
    col = index % COLS;
  } else {
    col = COLS - 1 - (index % COLS);
  }
  // hitung posisi pixel
  const cellSize = board.clientWidth / COLS;
  const x = col * cellSize + cellSize / 2;
  const y = rowFromBottom * cellSize + cellSize / 2;
  return { x, y, cellSize };
}

// Create and position pawns
const pawn1 = document.createElement("div");
pawn1.id = "pawn1";
pawn1.classList.add("pawn");
board.appendChild(pawn1);

const pawn2 = document.createElement("div");
pawn2.id = "pawn2";
pawn2.classList.add("pawn");
board.appendChild(pawn2);

function movePawn(pawn, position, animate = true) {
  const pos = getCellPosition(position === 0 ? 1 : position); // Jika 0 berarti start kotak 1
  const offset = 12; // untuk menghindari pion bertumpuk (geser sedikit)
  // Geser pion jika pemain 2 agar tidak tumpang tindih
  const x = pos.x + (pawn.id === "pawn1" ? -offset : offset);
  const y = pos.y;
  if (animate) {
    pawn.style.transition = "top 0.4s ease, left 0.4s ease";
  } else {
    pawn.style.transition = "none";
  }
  pawn.style.left = `${x}px`;
  pawn.style.top = `${y}px`;
}

// Inisialisasi posisi pion awal (start)
function initPawns() {
  movePawn(pawn1, 0, false);
  movePawn(pawn2, 0, false);
}

// Ganti giliran pemain
function switchPlayer() {
  currentPlayer = currentPlayer === 0 ? 1 : 0;
  turnInfo.textContent = `Giliran Pemain ${currentPlayer + 1} (${currentPlayer === 0 ? "Merah" : "Kuning"})`;
  rollDiceBtn.disabled = false;
}

// Roll dice
function rollDice() {
  if (isMoving || questionActive) return;
  rollDiceBtn.disabled = true;
  const dice = Math.floor(Math.random() * 6) + 1;
  diceResult.textContent = dice;
  movePlayer(dice);
}

// Move player dengan animasi satu-satu
async function movePlayer(steps) {
  isMoving = true;
  let pos = playerPositions[currentPlayer];
  for (let i = 1; i <= steps; i++) {
    pos++;
    if (pos > BOARD_SIZE) {
      pos = BOARD_SIZE;
      break;
    }
    playerPositions[currentPlayer] = pos;
    movePawn(currentPlayer === 0 ? pawn1 : pawn2, pos);
    await delay(450);
  }

  // Cek tangga atau ular
  if (ladders[pos]) {
    await delay(200);
    pos = ladders[pos];
    playerPositions[currentPlayer] = pos;
    movePawn(currentPlayer === 0 ? pawn1 : pawn2, pos);
    await delay(600);
  } else if (snakes[pos]) {
    await delay(200);
    pos = snakes[pos];
    playerPositions[currentPlayer] = pos;
    movePawn(currentPlayer === 0 ? pawn1 : pawn2, pos);
    await delay(600);
  }

  // Cek pertanyaan
  if (questionPoints.includes(pos)) {
    // Jika belum pernah menjawab benar pertanyaan ini atau sudah reset, tampilkan pertanyaan
    if (!answeredQuestions.has(pos)) {
      showQuestion(pos);
      return;
    }
  }

  checkWin(pos);
  if (!questionActive) {
    switchPlayer();
    isMoving = false;
  }
}

// Show pertanyaan pilihan ganda di titik pertanyaan
function showQuestion(position) {
  questionActive = true;
  rollDiceBtn.disabled = true;
  questionContainer.classList.remove("hidden");

  // Acak pertanyaan yang belum dijawab benar untuk posisi ini
  // Kita buat index acak dari questions list
  currentQuestionIndex = getRandomInt(0, questions.length - 1);
  const q = questions[currentQuestionIndex];
  questionText.textContent = q.question;
  answersDiv.innerHTML = "";
  for (let i = 0; i < q.options.length; i++) {
    const btn = document.createElement("button");
    btn.textContent = q.options[i];
    btn.onclick = () => answerQuestion(i, position);
    answersDiv.appendChild(btn);
  }

  questionTimeLeft = 10;
  timerDiv.textContent = `Waktu: ${questionTimeLeft} detik`;
  questionTimer = setInterval(() => {
    questionTimeLeft--;
    timerDiv.textContent = `Waktu: ${questionTimeLeft} detik`;
    if (questionTimeLeft <= 0) {
      clearInterval(questionTimer);
      failAnswer(position);
    }
  }, 1000);
}

// Menangani jawaban pertanyaan
function answerQuestion(selectedIndex, position) {
  if (!questionActive) return;
  clearInterval(questionTimer);
  const correctIndex = questions[currentQuestionIndex].answer;
  if (selectedIndex === correctIndex) {
    // Jawaban benar, tandai pertanyaan di titik ini sudah dijawab
    answeredQuestions.add(position);
    // Tutup pertanyaan dan lanjut giliran
    questionContainer.classList.add("hidden");
    questionActive = false;
    checkWin(playerPositions[currentPlayer]);
    switchPlayer();
    isMoving = false;
  } else {
    failAnswer(position);
  }
}

// Jika gagal menjawab atau waktu habis
async function failAnswer(position) {
  questionContainer.classList.add("hidden");
  questionActive = false;
  // Mundur 3 langkah
  let pos = playerPositions[currentPlayer];
  let newPos = pos - 3;
  if (newPos < 1) newPos = 1;
  playerPositions[currentPlayer] = newPos;
  movePawn(currentPlayer === 0 ? pawn1 : pawn2, newPos);
  await delay(600);
  switchPlayer();
  isMoving = false;
}

// Cek
