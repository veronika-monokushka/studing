const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  let filePath = '';
  
  // Определяем путь к файлу
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  } else if (req.url === '/style.css') {
    filePath = path.join(__dirname, 'style.css');
    res.setHeader('Content-Type', 'text/css');
  } else if (req.url === '/game.js') {
    filePath = path.join(__dirname, 'game.js');
    res.setHeader('Content-Type', 'application/javascript');
  } else {
    res.writeHead(404);
    res.end();
    return;
  }
  
  // Читаем и отдаем файл
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    
    // Устанавливаем заголовки в зависимости от типа файла
    if (req.url === '/' || req.url === '/index.html') {
      res.setHeader('Content-Type', 'text/html');
    }
    
    res.writeHead(200);
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

const rooms = new Map();
const MAX_ROOMS = 5;
const BOARD_SIZE = 10;

// Инициализация комнат
for (let i = 1; i <= MAX_ROOMS; i++) {
  rooms.set(i, {
    id: i,
    players: [],
    boards: new Map(),
    currentPlayer: null,
    gameStarted: false,
    shipsPlaced: 0,
    ships: new Map(), // Добавляем для отслеживания расставленных кораблей
  });
}

function createEmptyBoard() {
  return Array(BOARD_SIZE)
    .fill()
    .map(() => Array(BOARD_SIZE).fill(0));
}

function isValidShipPlacement(board, ship, x, y, isHorizontal) {
  const size = ship.size;

  // Проверка границ
  if (isHorizontal) {
    if (x + size > BOARD_SIZE) return false;
  } else {
    if (y + size > BOARD_SIZE) return false;
  }

  // Проверка наложения и соседних клеток
  for (let i = 0; i < size; i++) {
    const checkX = isHorizontal ? x + i : x;
    const checkY = isHorizontal ? y : y + i;

    // Проверка самой клетки
    if (board[checkY][checkX] !== 0) return false;

    // Проверка соседних клеток
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = checkX + dx;
        const ny = checkY + dy;

        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          if (board[ny][nx] !== 0) return false;
        }
      }
    }
  }

  return true;
}

// Добавляем счетчик сообщений для каждого игрока
const messageRates = new Map();

wss.on("connection", (ws) => {
  console.log("Новое подключение");

  // Инициализация игрока
  ws.player = {
    id: Math.random().toString(36).substr(2, 9),
    room: null,
    ready: false,
    name: `Игрок_${Math.floor(Math.random() * 1000)}`,
    lastMessages: [], // Массив временных меток последних сообщений
  };

  // Инициализируем счетчик сообщений
  messageRates.set(ws.player.id, {
    count: 0,
    lastReset: Date.now()
  });

  // Отправляем список комнат при подключении
  sendRoomsList(ws);

  ws.on("message", (data) => {
    try {
      // Проверка rate limiting
      const rateInfo = messageRates.get(ws.player.id);
      const now = Date.now();
      
      // Сбрасываем счетчик каждую минуту
      if (now - rateInfo.lastReset > 60000) {
        rateInfo.count = 0;
        rateInfo.lastReset = now;
      }
      
      // Ограничиваем 60 сообщений в минуту
      if (rateInfo.count > 60) {
        console.log(`Игрок ${ws.player.id} превысил лимит сообщений`);
        sendToClient(ws, { type: "error", message: "Слишком много сообщений. Подождите." });
        return;
      }
      
      rateInfo.count++;
      
      // Проверяем размер данных
      if (data.length > 10000) {
        console.log(`Игрок ${ws.player.id} отправил слишком большое сообщение`);
        sendToClient(ws, { type: "error", message: "Сообщение слишком большое" });
        return;
      }
      
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error("Ошибка парсинга:", error);
    }
  });

  ws.on("close", () => {
    console.log("Отключение:", ws.player.id);
    // Удаляем rate limiting информацию
    messageRates.delete(ws.player.id);
    if (ws.player.room) {
      handleDisconnect(ws);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket ошибка:", error);
  });
});

function handleMessage(ws, message) {
  // Проверяем, что message - объект и имеет тип
  if (!message || typeof message !== 'object' || !message.type) {
    console.error('Некорректное сообщение:', message);
    sendToClient(ws, { type: "error", message: "Некорректное сообщение" });
    return;
  }
  
  // Проверяем тип сообщения
  const validTypes = [
    'join_room', 'leave_room', 'place_ships', 'shoot', 
    'chat_message', 'get_rooms', 'player_ready'
  ];
  
  if (!validTypes.includes(message.type)) {
    console.error('Неизвестный тип сообщения:', message.type);
    sendToClient(ws, { type: "error", message: "Неизвестный тип сообщения" });
    return;
  }
  
  console.log("Получено сообщение:", message.type);

  switch (message.type) {
    case "join_room":
      // Валидация roomId
      const roomId = parseInt(message.roomId);
      if (!validateNumber(roomId, 1, MAX_ROOMS)) {
        sendToClient(ws, { type: "error", message: "Некорректный номер комнаты" });
        return;
      }
      joinRoom(ws, roomId);
      break;
    case "leave_room":
      leaveRoom(ws);
      break;
    case "place_ships":
      placeShips(ws, message.ships);
      break;
    case "shoot":
      // Валидация координат
      if (!validateNumber(message.x, 0, BOARD_SIZE - 1) || 
          !validateNumber(message.y, 0, BOARD_SIZE - 1)) {
        sendToClient(ws, { type: "error", message: "Некорректные координаты" });
        return;
      }
      handleShoot(ws, parseInt(message.x), parseInt(message.y));
      break;
    case "chat_message":
      // Санитизация текста чата
      if (typeof message.text !== 'string') {
        sendToClient(ws, { type: "error", message: "Некорректное сообщение чата" });
        return;
      }
      const sanitizedText = sanitizeString(message.text.substring(0, 200)); // Ограничение длины
      handleChatMessage(ws, sanitizedText);
      break;
    case "get_rooms":
      sendRoomsList(ws);
      break;
    case "player_ready":
      handlePlayerReady(ws);
      break;
  }
}

function joinRoom(ws, roomId) {
  const room = rooms.get(parseInt(roomId));
  if (!room) {
    sendToClient(ws, { type: "error", message: "Комната не найдена" });
    return;
  }

  if (room.players.length >= 2) {
    sendToClient(ws, { type: "error", message: "Комната заполнена" });
    return;
  }

  if (room.gameStarted) {
    sendToClient(ws, { type: "error", message: "Игра уже началась" });
    return;
  }

  // Выходим из предыдущей комнаты, если есть
  if (ws.player.room) {
    leaveRoom(ws);
  }

  room.players.push(ws);
  ws.player.room = parseInt(roomId);

  // Инициализируем доску для игрока
  room.boards.set(ws.player.id, {
    board: createEmptyBoard(),
    ships: [],
    hits: [],
    misses: [],
  });

  room.ships.set(ws.player.id, []);

  console.log(`Игрок ${ws.player.id} вошел в комнату ${roomId}`);

  // Отправляем подтверждение входа игроку
  sendToClient(ws, {
    type: "room_joined",
    roomId: roomId,
    playerId: ws.player.id,
    playersCount: room.players.length,
  });

  // Уведомляем всех в комнате
  broadcastToRoom(room, {
    type: "room_update",
    players: room.players.map((p) => ({
      id: p.player.id,
      name: p.player.name,
      ready: p.player.ready,
    })),
    playersCount: room.players.length,
  });

  // Обновляем список комнат для всех
  sendRoomsListToAll();

  // Если комната заполнена, начинаем фазу расстановки кораблей
  if (room.players.length === 2) {
    startPlacementPhase(room);
  }
}

function leaveRoom(ws) {
  const roomId = ws.player.room;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.players = room.players.filter((player) => player !== ws);
  room.boards.delete(ws.player.id);
  room.ships.delete(ws.player.id);

  console.log(`Игрок ${ws.player.id} покинул комнату ${roomId}`);

  if (room.players.length > 0) {
    broadcastToRoom(room, {
      type: "player_left",
      playerId: ws.player.id,
      playersCount: room.players.length,
    });

    // Сбрасываем игру, если кто-то вышел
    if (room.gameStarted) {
      resetGame(room);
    } else {
      // Если игра еще не началась, просто обновляем статус
      broadcastToRoom(room, {
        type: "room_update",
        players: room.players.map((p) => ({
          id: p.player.id,
          name: p.player.name,
          ready: p.player.ready,
        })),
        playersCount: room.players.length,
      });
    }
  } else {
    // Если комната пуста, полностью сбрасываем
    resetGame(room);
  }

  ws.player.room = null;
  ws.player.ready = false;

  sendToClient(ws, { type: "left_room" });
  sendRoomsListToAll();
}

function startPlacementPhase(room) {
  room.gameStarted = true;
  room.shipsPlaced = 0;

  broadcastToRoom(room, {
    type: "placement_start",
    message: "Расставьте ваши корабли!",
    boardSize: BOARD_SIZE,
  });
}

function placeShips(ws, ships) {
  const roomId = ws.player.room;
  if (!roomId) {
    sendToClient(ws, { type: "error", message: "Вы не в комнате" });
    return;
  }

  const room = rooms.get(roomId);
  if (!room || !room.gameStarted) {
    sendToClient(ws, { type: "error", message: "Игра не началась" });
    return;
  }

  const playerBoard = room.boards.get(ws.player.id);
  if (!playerBoard) return;

  // Проверяем, что ships - массив
  if (!Array.isArray(ships)) {
    sendToClient(ws, { type: "error", message: "Некорректные данные кораблей" });
    return;
  }

  // Конфигурация кораблей
  const requiredShips = [
    { size: 4, count: 1 },
    { size: 3, count: 2 },
    { size: 2, count: 3 },
    { size: 1, count: 4 },
  ];

  const tempBoard = createEmptyBoard();
  const placedShips = [];

  try {
    // Валидация каждого корабля
    for (const ship of ships) {
      // Проверяем структуру корабля
      if (!ship || typeof ship !== 'object') {
        throw new Error("Некорректная структура корабля");
      }
      
      // Валидация размера
      if (!validateNumber(ship.size, 1, 4)) {
        throw new Error(`Неверный размер корабля: ${ship.size}`);
      }

      // Валидация координат
      if (!validateNumber(ship.x, 0, BOARD_SIZE - 1) || 
          !validateNumber(ship.y, 0, BOARD_SIZE - 1)) {
        throw new Error("Некорректные координаты корабля");
      }

      // Проверка типа ориентации
      if (typeof ship.isHorizontal !== 'boolean') {
        throw new Error("Некорректная ориентация корабля");
      }

      const shipConfig = requiredShips.find((s) => s.size === ship.size);
      if (!shipConfig) {
        throw new Error(`Неверный размер корабля: ${ship.size}`);
      }

      // Проверка размещения
      if (!isValidShipPlacement(tempBoard, ship, ship.x, ship.y, ship.isHorizontal)) {
        throw new Error("Некорректная расстановка кораблей");
      }

      // Размещаем корабль на временной доске
      for (let i = 0; i < ship.size; i++) {
        const x = ship.isHorizontal ? ship.x + i : ship.x;
        const y = ship.isHorizontal ? ship.y : ship.y + i;
        tempBoard[y][x] = 1;
      }

      placedShips.push(ship);
    }

    // Проверка количества кораблей
    const shipCounts = {};
    placedShips.forEach((ship) => {
      shipCounts[ship.size] = (shipCounts[ship.size] || 0) + 1;
    });

    for (const config of requiredShips) {
      if (shipCounts[config.size] !== config.count) {
        throw new Error(
          `Неверное количество ${config.size}-палубных кораблей. Требуется: ${
            config.count
          }, получено: ${shipCounts[config.size] || 0}`
        );
      }
    }
  } catch (error) {
    sendToClient(ws, {
      type: "placement_error",
      message: error.message,
    });
    return;
  }

  // Сохраняем корабли
  playerBoard.ships = placedShips;
  playerBoard.board = tempBoard;
  room.ships.set(ws.player.id, placedShips);
  room.shipsPlaced++;

  console.log(
    `Игрок ${ws.player.id} расставил корабли. Всего расставлено: ${room.shipsPlaced}/2`
  );

  sendToClient(ws, {
    type: "ships_placed",
    ships: placedShips,
  });

  broadcastToRoom(room, {
    type: "ships_placed_update",
    playerId: ws.player.id,
    shipsPlaced: room.shipsPlaced,
    totalPlayers: room.players.length,
  });

  // Если оба игрока расставили корабли, начинаем игру
  if (room.shipsPlaced === 2) {
    startGame(room);
  }
}

function startGame(room) {
  // Выбираем случайного игрока для первого хода
  room.currentPlayer = room.players[Math.floor(Math.random() * 2)];

  broadcastToRoom(room, {
    type: "game_start",
    currentPlayer: room.currentPlayer.player.id,
    message: "Игра началась!",
  });

  console.log(
    `Игра началась в комнате ${room.id}. Первый ход у игрока ${room.currentPlayer.player.id}`
  );
}

function handleShoot(ws, x, y) {
  const roomId = ws.player.room;
  if (!roomId) {
    sendToClient(ws, { type: "error", message: "Вы не в комнате" });
    return;
  }

  const room = rooms.get(roomId);
  if (!room || !room.gameStarted) {
    sendToClient(ws, { type: "error", message: "Игра не началась" });
    return;
  }

  // Проверяем, чей сейчас ход
  if (room.currentPlayer !== ws) {
    sendToClient(ws, { type: "error", message: "Не ваш ход" });
    return;
  }

  const opponent = room.players.find((p) => p !== ws);
  if (!opponent) {
    sendToClient(ws, { type: "error", message: "Противник не найден" });
    return;
  }

  const opponentBoard = room.boards.get(opponent.player.id);
  if (!opponentBoard) {
    sendToClient(ws, { type: "error", message: "Доска противника не найдена" });
    return;
  }

  // Проверка координат
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    sendToClient(ws, { type: "error", message: "Неверные координаты" });
    return;
  }

  // Проверка, не стреляли ли уже в эту клетку
  if (opponentBoard.board[y][x] === 2 || opponentBoard.board[y][x] === 3) {
    sendToClient(ws, { type: "error", message: "Сюда уже стреляли" });
    return;
  }

  let hit = false;
  let shipSunk = false;
  let sunkShip = null;
  let gameOver = false;
  let cellsToMark = []; // Добавляем массив для клеток вокруг потопленного корабля

  // Проверяем попадание
  if (opponentBoard.board[y][x] === 1) {
    hit = true;
    opponentBoard.board[y][x] = 2; // Помечаем как попадание

    // Ищем, в какой корабль попали
    for (const ship of opponentBoard.ships) {
      for (let i = 0; i < ship.size; i++) {
        const shipX = ship.isHorizontal ? ship.x + i : ship.x;
        const shipY = ship.isHorizontal ? ship.y : ship.y + i;

        if (shipX === x && shipY === y) {
          // Проверяем, потоплен ли корабль
          let allHit = true;
          for (let j = 0; j < ship.size; j++) {
            const checkX = ship.isHorizontal ? ship.x + j : ship.x;
            const checkY = ship.isHorizontal ? ship.y : ship.y + j;

            if (opponentBoard.board[checkY][checkX] !== 2) {
              allHit = false;
              break;
            }
          }

          if (allHit) {
            shipSunk = true;
            sunkShip = ship;
            
            // Собираем клетки вокруг потопленного корабля
            cellsToMark = getCellsAroundShip(ship, opponentBoard.board);
          }
          break;
        }
      }
      if (shipSunk) break;
    }

    // Проверяем, все ли корабли потоплены
    if (shipSunk) {
      const allShipsSunk = opponentBoard.ships.every((ship) => {
        for (let i = 0; i < ship.size; i++) {
          const shipX = ship.isHorizontal ? ship.x + i : ship.x;
          const shipY = ship.isHorizontal ? ship.y : ship.y + i;
          if (opponentBoard.board[shipY][shipX] !== 2) return false;
        }
        return true;
      });

      gameOver = allShipsSunk;
    }
  } else {
    opponentBoard.board[y][x] = 3; // Помечаем как промах
  }

  // Отправляем результат выстрела всем игрокам в комнате
  broadcastToRoom(room, {
    type: "shot_result",
    x: x,
    y: y,
    hit: hit,
    shipSunk: shipSunk,
    sunkShip: sunkShip,
    cellsAroundShip: cellsToMark, // Добавляем информацию о клетках вокруг корабля
    playerId: ws.player.id,
    targetPlayerId: opponent.player.id,
  });

  if (gameOver) {
    // Игра окончена
    setTimeout(() => {
      broadcastToRoom(room, {
        type: "game_over",
        winner: ws.player.id,
        winnerName: ws.player.name,
      });
      resetGame(room);
    }, 1000);
  } else if (!hit) {
    // Меняем ход, если был промах
    room.currentPlayer = opponent;
    broadcastToRoom(room, {
      type: "turn_change",
      currentPlayer: opponent.player.id,
    });
  }
  // Если было попадание, ход остается у того же игрока
}

function getCellsAroundShip(ship, board) {
  const cells = [];
  
  for (let i = 0; i < ship.size; i++) {
    const shipX = ship.isHorizontal ? ship.x + i : ship.x;
    const shipY = ship.isHorizontal ? ship.y : ship.y + i;
    
    // Проверяем все клетки вокруг каждой клетки корабля
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = shipX + dx;
        const ny = shipY + dy;
        
        // Проверяем границы поля
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE) {
          // Добавляем только если клетка не является частью корабля (значение 1)
          // и не является уже попаданием (значение 2)
          if (board[ny][nx] !== 1 && board[ny][nx] !== 2) {
            cells.push({ x: nx, y: ny });
          }
        }
      }
    }
  }
  
  // Убираем дубликаты (если клетка попадает в зону нескольких клеток корабля)
  const uniqueCells = [];
  const seen = new Set();
  
  for (const cell of cells) {
    const key = `${cell.x},${cell.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCells.push(cell);
    }
  }
  
  return uniqueCells;
}

function handleChatMessage(ws, text) {
  const roomId = ws.player.room;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  // Текст уже санитизирован в handleMessage
  const messageText = text.trim();
  
  // Проверяем, что сообщение не пустое
  if (messageText.length === 0) return;
  
  // Ограничиваем длину сообщения
  const finalText = messageText.substring(0, 500);

  broadcastToRoom(room, {
    type: "chat_message",
    playerId: ws.player.id,
    playerName: ws.player.name,
    text: finalText,
    timestamp: new Date().toLocaleTimeString(),
  });
}

function handleDisconnect(ws) {
  console.log("Игрок отключился:", ws.player.id);
  if (ws.player.room) {
    leaveRoom(ws);
  }
}

function resetGame(room) {
  console.log("Сброс игры в комнате", room.id);

  room.gameStarted = false;
  room.shipsPlaced = 0;
  room.currentPlayer = null;

  // Сбрасываем доски всех игроков
  room.players.forEach((player) => {
    const playerId = player.player.id;
    if (room.boards.has(playerId)) {
      room.boards.set(playerId, {
        board: createEmptyBoard(),
        ships: [],
        hits: [],
        misses: [],
      });
    }
    if (room.ships.has(playerId)) {
      room.ships.set(playerId, []);
    }
    player.player.ready = false;
  });

  sendRoomsListToAll();
}

function broadcastToRoom(room, message) {
  // Проверяем, что message - объект
  if (!message || typeof message !== 'object') {
    console.error('Попытка отправить некорректное сообщение');
    return;
  }
  
  const messageString = JSON.stringify(message);
  
  // Ограничиваем размер сообщения
  if (messageString.length > 10000) {
    console.error('Сообщение слишком большое');
    return;
  }
  
  room.players.forEach((player) => {
    if (player.readyState === WebSocket.OPEN) {
      try {
        player.send(messageString);
      } catch (error) {
        console.error("Ошибка отправки сообщения:", error);
      }
    }
  });
}

function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Ошибка отправки клиенту:", error);
    }
  }
}

function sendRoomsList(ws) {
  const roomsList = Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playersCount: room.players.length,
    gameStarted: room.gameStarted,
    status: room.gameStarted
      ? "В игре"
      : room.players.length >= 2
      ? "Полная"
      : "Свободно",
  }));

  sendToClient(ws, {
    type: "rooms_list",
    rooms: roomsList,
  });
}

function sendRoomsListToAll() {
  const roomsList = Array.from(rooms.values()).map((room) => ({
    id: room.id,
    playersCount: room.players.length,
    gameStarted: room.gameStarted,
    status: room.gameStarted
      ? "В игре"
      : room.players.length >= 2
      ? "Полная"
      : "Свободно",
  }));

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendToClient(client, {
        type: "rooms_list",
        rooms: roomsList,
      });
    }
  });
}

// защита
// Добавляем функцию для санитизации строк
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  // Убираем HTML теги
  str = str.replace(/<[^>]*>/g, '');
  
  // Экранируем специальные символы
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&grave;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=\/]/g, (char) => map[char]);
}

// Функция для валидации числовых значений
function validateNumber(num, min, max) {
  const n = Number(num);
  return !isNaN(n) && n >= min && n <= max && Number.isInteger(n);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`WebSocket сервер готов`);
  console.log(`Доступно комнат: ${MAX_ROOMS}`);
});
