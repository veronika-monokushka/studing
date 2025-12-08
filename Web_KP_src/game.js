class BattleshipGame {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.playerName = null;
        this.roomId = null;
        this.gameState = 'lobby'; // 'lobby', 'placement', 'battle', 'gameover'
        this.currentShip = null;
        this.shipOrientation = 'horizontal';
        this.playerShips = [];
        this.placedShips = [];
        this.opponentSunkShips = 0;
        this.isMyTurn = false;
        this.opponentId = null;
        this.playerBoard = Array(10).fill().map(() => Array(10).fill(0));
        this.opponentBoard = Array(10).fill().map(() => Array(10).fill(0));
        this.shots = [];
        this.hits = 0;
        this.misses = 0;
        this.shipsToPlace = [
            { size: 4, count: 1, placed: 0 },
            { size: 3, count: 2, placed: 0 },
            { size: 2, count: 3, placed: 0 },
            { size: 1, count: 4, placed: 0 }
        ];
        
        this.initializeWebSocket();
        this.initializeEventListeners();
        this.renderBoards();
        this.updateShipsToPlace();
    }
    
    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ Подключено к серверу');
            this.addSystemMessage('Подключено к серверу');
            this.playerName = `Игрок_${Math.floor(Math.random() * 10000)}`;
            document.getElementById('playerStatus').textContent = `Имя: ${this.playerName}`;
            document.getElementById('playerStatus').className = 'status waiting';
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Получено сообщение:', message.type, message);
                this.handleMessage(message);
            } catch (error) {
                console.error('❌ Ошибка парсинга сообщения:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('🔌 Соединение закрыто');
            this.addSystemMessage('Соединение с сервером потеряно. Переподключение...');
            document.getElementById('playerStatus').textContent = 'Переподключение...';
            document.getElementById('playerStatus').className = 'status waiting';
            setTimeout(() => this.initializeWebSocket(), 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ WebSocket ошибка:', error);
            this.addSystemMessage('Ошибка соединения');
        };
    }
    
    initializeEventListeners() {
        // Кнопки
        document.getElementById('leaveRoomBtn').addEventListener('click', () => this.leaveRoom());
        document.getElementById('refreshRoomsBtn').addEventListener('click', () => this.getRooms());
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // Корабли
        document.getElementById('rotateBtn').addEventListener('click', () => this.toggleShipOrientation());
        document.getElementById('randomPlaceBtn').addEventListener('click', () => this.randomPlaceShips());
        document.getElementById('clearShipsBtn').addEventListener('click', () => this.clearShips());
        document.getElementById('placeShipsBtn').addEventListener('click', () => this.confirmShipPlacement());
        
        // Список кораблей
        document.getElementById('shipList').addEventListener('click', (e) => {
            if (e.target.classList.contains('ship-item')) {
                const size = parseInt(e.target.dataset.size);
                this.selectShip(size);
            }
        });
        
        // Клики по доскам
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('cell') && !e.target.classList.contains('coordinates')) {
                const x = parseInt(e.target.dataset.x);
                const y = parseInt(e.target.dataset.y);
                const boardId = e.target.closest('.board').id;
                
                if (boardId === 'playerBoard' && this.gameState === 'placement') {
                    this.placeShipOnBoard(x, y);
                } else if (boardId === 'opponentBoard' && this.gameState === 'battle' && this.isMyTurn) {
                    this.shoot(x, y);
                }
            }
        });
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'rooms_list':
                this.updateRoomsList(message.rooms);
                break;
            case 'room_joined':
                this.handleRoomJoined(message);
                break;
            case 'room_update':
                this.updateRoomStatus(message);
                break;
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
            case 'left_room':
                this.handleLeftRoom();
                break;
            case 'placement_start':
                this.startPlacementPhase(message);
                break;
            case 'ships_placed_update':
                this.updateShipsPlaced(message);
                break;
            case 'ships_placed':
                this.handleShipsPlaced(message);
                break;
            case 'placement_error':
                this.showError(message.message);
                break;
            case 'game_start':
                this.startGame(message);
                break;
            case 'turn_change':
                this.changeTurn(message);
                break;
            case 'shot_result':
                this.handleShotResult(message);
                break;
            case 'game_over':
                this.gameOver(message);
                break;
            case 'chat_message':
                this.displayChatMessage(message);
                break;
            case 'error':
                this.showError(message.message);
                break;
        }
    }
    
    updateRoomsList(rooms) {
        const container = document.getElementById('roomsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!rooms || rooms.length === 0) {
            container.innerHTML = '<div class="room-item"><div>Нет доступных комнат</div></div>';
            return;
        }
        
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            
            let statusText = '';
            if (room.gameStarted) {
                roomElement.classList.add('started');
                statusText = 'В игре';
            } else if (room.playersCount >= 2) {
                roomElement.classList.add('full');
                statusText = 'Полная';
            } else {
                roomElement.classList.add('available');
                statusText = 'Свободно';
            }
            
            roomElement.innerHTML = `
                <div><strong>Комната ${room.id}</strong></div>
                <div class="room-info">
                    <span>👥 ${room.playersCount}/2</span>
                    <span>${statusText}</span>
                </div>
            `;
            
            if (room.playersCount < 2 && !room.gameStarted) {
                roomElement.addEventListener('click', () => this.joinRoom(room.id));
            }
            
            container.appendChild(roomElement);
        });
    }
    
    joinRoom(roomId) {
        console.log('Попытка входа в комнату:', roomId);
        this.sendMessage({ 
            type: 'join_room', 
            roomId: roomId 
        });
    }
    
    handleRoomJoined(message) {
        this.playerId = message.playerId;
        this.roomId = message.roomId;
        
        document.getElementById('currentPlayerId').textContent = this.playerId;
        document.getElementById('playerId').style.display = 'block';
        
        document.getElementById('playerStatus').textContent = `В комнате ${this.roomId}`;
        document.getElementById('playerStatus').className = 'status waiting';
        
        this.showGameView();
        this.addSystemMessage(`Вы присоединились к комнате ${this.roomId}`);
        
        this.getRooms();
    }
    
    updateRoomStatus(message) {
        const statusElement = document.getElementById('playerStatus');
        const playersCount = message.playersCount || (message.players ? message.players.length : 0);
        
        statusElement.textContent = `В комнате: ${playersCount}/2 игроков`;
        statusElement.className = playersCount === 2 ? 'status ready' : 'status waiting';
        
        if (message.players) {
            const otherPlayer = message.players.find(p => p.id !== this.playerId);
            this.opponentId = otherPlayer ? otherPlayer.id : null;
            
            if (otherPlayer) {
                this.addSystemMessage(`В комнате: ${otherPlayer.name || 'Игрок'}`);
            }
        }
    }
    
    startPlacementPhase(message) {
        this.gameState = 'placement';
        document.getElementById('placementPhase').classList.remove('hidden');
        document.getElementById('playerStatus').textContent = 'Расставьте корабли';
        document.getElementById('playerStatus').className = 'status ready';
        
        this.addSystemMessage('Начинаем расстановку кораблей!');
        this.clearShips(); // Сбрасываем любые ранее расставленные корабли
        this.renderBoards();
    }
    
    updateShipsPlaced(message) {
        document.getElementById('playerStatus').textContent = 
            `Расставлено кораблей: ${message.shipsPlaced}/2 игроков`;
            
        if (message.playerId !== this.playerId) {
            this.addSystemMessage('Противник расставил корабли');
        }
    }
    
    handleShipsPlaced(message) {
        this.placedShips = message.ships || [];
        this.addSystemMessage('Вы расставили все корабли! Ожидайте противника...');
        document.getElementById('placeShipsBtn').disabled = true;
        document.getElementById('placeShipsBtn').textContent = '✅ Корабли расставлены';
        
        this.updatePlayerBoard();
    }
    
    startGame(message) {
        this.gameState = 'battle';
        document.getElementById('placementPhase').classList.add('hidden');
        this.isMyTurn = message.currentPlayer === this.playerId;
        
        this.addSystemMessage('🎮 Игра началась!');
        this.updateTurnDisplay();
        this.renderBoards();
    }
    
    changeTurn(message) {
        this.isMyTurn = message.currentPlayer === this.playerId;
        this.updateTurnDisplay();
        
        if (this.isMyTurn) {
            this.addSystemMessage('🎯 Ваш ход!');
        } else {
            this.addSystemMessage('⏳ Ход противника...');
        }
    }
    
    handleShotResult(message) {
        const x = message.x;
        const y = message.y;
        
        if (message.playerId === this.playerId) {
            // Это наш выстрел по противнику
            if (message.hit) {
                this.opponentBoard[y][x] = 2; // Попадание
                this.hits++;
                this.addSystemMessage(`🎯 Вы попали в (${x},${y})!`);
                
                if (message.shipSunk) {
                    this.opponentSunkShips = (this.opponentSunkShips || 0) + 1;
                    this.addSystemMessage('💥 Вы потопили корабль противника!');
                    
                    // Помечаем клетки вокруг потопленного корабля используя данные с сервера
                    if (message.cellsAroundShip) {
                        this.markCellsAroundShip(message.cellsAroundShip, false);
                    }
                }
            } else {
                this.opponentBoard[y][x] = 3; // Промах
                this.misses++;
                this.addSystemMessage(`💧 Вы промахнулись в (${x},${y})`);
            }
        } else {
            // Это выстрел противника по нам
            if (message.hit) {
                this.playerBoard[y][x] = 2; // Попадание по нам
                this.addSystemMessage(`💥 Противник попал в (${x},${y})`);
                
                if (message.shipSunk) {
                    this.addSystemMessage('😢 Противник потопил ваш корабль!');
                    
                    // Помечаем клетки вокруг потопленного корабля на вашем поле
                    if (message.cellsAroundShip) {
                        this.markCellsAroundShip(message.cellsAroundShip, true);
                    }
                }
            } else {
                this.playerBoard[y][x] = 3; // Промах противника
                this.addSystemMessage(`🎉 Противник промахнулся в (${x},${y})`);
            }
        }
        
        this.updateCounters();
        this.renderBoards();
    }
    
    markCellsAroundShip(cells, isPlayerBoard) {
        if (!cells || !Array.isArray(cells)) return;
        
        const board = isPlayerBoard ? this.playerBoard : this.opponentBoard;
        
        cells.forEach(cell => {
            const x = cell.x;
            const y = cell.y;
            
            // Помечаем только пустые клетки (0) или промахи (3)
            if (board[y][x] === 0 || board[y][x] === 3) {
                board[y][x] = 4; // 4 = заблокированная клетка (вокруг потопленного)
            }
        });
    }

    gameOver(message) {
        this.gameState = 'gameover';
        
        if (message.winner === this.playerId) {
            this.addSystemMessage('🎉 🎉 🎉 ПОБЕДА! Вы выиграли! 🎉 🎉 🎉');
            document.getElementById('playerStatus').textContent = 'ПОБЕДА!';
            document.getElementById('playerStatus').className = 'status your-turn';
        } else {
            this.addSystemMessage('😢 Вы проиграли. Попробуйте еще раз!');
            document.getElementById('playerStatus').textContent = 'ПОРАЖЕНИЕ';
            document.getElementById('playerStatus').className = 'status opponent-turn';
        }
        
        setTimeout(() => {
            this.leaveRoom();
        }, 5000);
    }
    
    handlePlayerLeft(message) {
        this.addSystemMessage('Противник покинул комнату');
        if (this.gameState !== 'lobby') {
            this.addSystemMessage('Возвращаемся в лобби через 3 секунды...');
            setTimeout(() => this.leaveRoom(), 3000);
        }
    }
    
    handleLeftRoom() {
        this.showLobby();
        this.addSystemMessage('Вы покинули комнату');
        this.getRooms();
    }
    
    // Функции для кораблей
    selectShip(size) {
        // Если уже выбран этот же корабль - ничего не делаем
        if (this.currentShip === size) return;
        
        const shipItem = document.querySelector(`.ship-item[data-size="${size}"]`);
        const shipType = this.shipsToPlace.find(s => s.size === size);
        
        if (shipType && shipType.placed >= shipType.count) {
            this.showError(`Все ${size}-палубные корабли уже расставлены`);
            return;
        }
        
        this.currentShip = size;
        document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
        shipItem.classList.add('selected');
        
        this.addSystemMessage(`Выбран ${size}-палубный корабль`);
    }
    
    toggleShipOrientation() {
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        const btn = document.getElementById('rotateBtn');
        btn.textContent = `🔄 Повернуть: ${this.shipOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально'}`;
        
        this.addSystemMessage(`Ориентация: ${this.shipOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально'}`);
    }
    
    placeShipOnBoard(x, y) {
        if (!this.currentShip || this.gameState !== 'placement') return;
        
        const shipType = this.shipsToPlace.find(s => s.size === this.currentShip);
        if (!shipType || shipType.placed >= shipType.count) {
            this.showError(`Нельзя разместить больше ${this.currentShip}-палубных кораблей`);
            return;
        }
        
        // Проверка границ
        const canPlace = this.canPlaceShip(x, y, this.currentShip, this.shipOrientation);
        if (!canPlace.valid) {
            this.showError(canPlace.message);
            return;
        }
        
        // Размещаем корабль
        const ship = {
            size: this.currentShip,
            x: x,
            y: y,
            isHorizontal: this.shipOrientation === 'horizontal'
        };
        
        // Отмечаем клетки на доске
        for (let i = 0; i < ship.size; i++) {
            const shipX = ship.isHorizontal ? ship.x + i : ship.x;
            const shipY = ship.isHorizontal ? ship.y : ship.y + i;
            this.playerBoard[shipY][shipX] = 1;
        }
        
        this.playerShips.push(ship);
        shipType.placed++;
        
        // Обновляем интерфейс
        this.updateShipsToPlace();
        this.renderPlayerBoard();
        
        // Снимаем выделение только если все корабли данного размера расставлены
        const shipItem = document.querySelector(`.ship-item[data-size="${this.currentShip}"]`);
        
        // Проверяем, остались ли еще корабли этого размера
        if (shipType.placed >= shipType.count) {
            // Все корабли этого размера расставлены - снимаем выделение
            document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
            this.currentShip = null;
        } else {
            // Корабли этого размера еще есть - оставляем выделение
            // Уже выделено, ничего не меняем
        }
        
        this.addSystemMessage(`Размещен ${ship.size}-палубный корабль`);
    }
    
    canPlaceShip(x, y, size, orientation) {
        // Проверка границ
        if (orientation === 'horizontal') {
            if (x + size > 10) {
                return { valid: false, message: 'Корабль выходит за границы поля' };
            }
        } else {
            if (y + size > 10) {
                return { valid: false, message: 'Корабль выходит за границы поля' };
            }
        }
        
        // Проверка наложения и соседних клеток
        for (let i = 0; i < size; i++) {
            const checkX = orientation === 'horizontal' ? x + i : x;
            const checkY = orientation === 'horizontal' ? y : y + i;
            
            // Проверка самой клетки
            if (this.playerBoard[checkY][checkX] !== 0) {
                return { valid: false, message: 'Клетка уже занята' };
            }
            
            // Проверка соседних клеток
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const nx = checkX + dx;
                    const ny = checkY + dy;
                    
                    if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
                        if (this.playerBoard[ny][nx] !== 0) {
                            return { valid: false, message: 'Слишком близко к другому кораблю' };
                        }
                    }
                }
            }
        }
        
        return { valid: true, message: '' };
    }
    
    randomPlaceShips() {
        if (this.gameState !== 'placement') return;
        
        this.clearShips();
        
        const ships = [
            { size: 4, count: 1 },
            { size: 3, count: 2 },
            { size: 2, count: 3 },
            { size: 1, count: 4 }
        ];
        
        let attempts = 0;
        const maxAttempts = 1000;
        
        ships.forEach(shipType => {
            for (let i = 0; i < shipType.count; i++) {
                let placed = false;
                let attempt = 0;
                
                while (!placed && attempt < maxAttempts) {
                    attempt++;
                    attempts++;
                    
                    const x = Math.floor(Math.random() * 10);
                    const y = Math.floor(Math.random() * 10);
                    const isHorizontal = Math.random() > 0.5;
                    
                    const canPlace = this.canPlaceShip(x, y, shipType.size, isHorizontal ? 'horizontal' : 'vertical');
                    
                    if (canPlace.valid) {
                        // Размещаем корабль
                        const ship = {
                            size: shipType.size,
                            x: x,
                            y: y,
                            isHorizontal: isHorizontal
                        };
                        
                        for (let j = 0; j < ship.size; j++) {
                            const shipX = ship.isHorizontal ? ship.x + j : ship.x;
                            const shipY = ship.isHorizontal ? ship.y : ship.y + j;
                            this.playerBoard[shipY][shipX] = 1;
                        }
                        
                        this.playerShips.push(ship);
                        placed = true;
                    }
                }
            }
        });
        
        // Обновляем счетчики
        this.shipsToPlace.forEach(shipType => {
            const count = this.playerShips.filter(s => s.size === shipType.size).length;
            shipType.placed = count;
        });
        
        // После авторасстановки сбрасываем выбор
        this.currentShip = null;
        document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));

        this.updateShipsToPlace();
        this.renderPlayerBoard();
        this.addSystemMessage('Корабли расставлены автоматически');
    }
    
    clearShips() {
        this.playerShips = [];
        this.playerBoard = Array(10).fill().map(() => Array(10).fill(0));
        
        this.shipsToPlace.forEach(ship => {
            ship.placed = 0;
        });
        
        // Сбрасываем текущий выбор корабля
        this.currentShip = null;
        document.querySelectorAll('.ship-item').forEach(item => item.classList.remove('selected'));
        
        this.updateShipsToPlace();
        this.renderPlayerBoard();
        document.getElementById('placeShipsBtn').disabled = false;
        document.getElementById('placeShipsBtn').textContent = '✅ Подтвердить расстановку';
        
        this.addSystemMessage('Поле очищено');
    }
    
    confirmShipPlacement() {
        if (this.gameState !== 'placement') return;
        
        // Проверяем, что все корабли расставлены
        let allShipsPlaced = true;
        for (const shipType of this.shipsToPlace) {
            if (shipType.placed < shipType.count) {
                allShipsPlaced = false;
                this.showError(`Не расставлены все ${shipType.size}-палубные корабли`);
                break;
            }
        }
        
        if (!allShipsPlaced) return;
        
        // Отправляем корабли на сервер
        this.sendMessage({ 
            type: 'place_ships', 
            ships: this.playerShips 
        });
        
        this.placedShips = [...this.playerShips];
    }
    
    shoot(x, y) {
        if (this.gameState !== 'battle' || !this.isMyTurn) return;
        
        // Проверяем, не стреляли ли уже сюда или клетка заблокирована
        const cellValue = this.opponentBoard[y][x];
        if (cellValue !== 0 && cellValue !== 1) { // 0 - пусто, 1 - корабль (невидим для игрока)
            this.showError('Сюда уже стреляли или клетка заблокирована');
            return;
        }
        
        this.sendMessage({ 
            type: 'shoot', 
            x: x, 
            y: y 
        });
    }
    
    // Отрисовка
    renderBoards() {
        this.renderPlayerBoard();
        this.renderOpponentBoard();
    }
    
    
    renderPlayerBoard() {
        const board = document.getElementById('playerBoard');
        if (!board) return;
        
        board.innerHTML = '';
        
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                const cellValue = this.playerBoard[y][x];
                
                if (cellValue === 1) {
                    cell.classList.add('ship');
                    if (this.placedShips.length > 0) {
                        cell.classList.add('placed');
                    }
                } else if (cellValue === 2) {
                    cell.classList.add('hit');
                } else if (cellValue === 3) {
                    cell.classList.add('miss');
                } else if (cellValue === 4) {
                    cell.classList.add('blocked');
                }
                
                board.appendChild(cell);
            }
        }
    }

    renderOpponentBoard() {
        const board = document.getElementById('opponentBoard');
        if (!board) return;
        
        board.innerHTML = '';
        
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                const cellValue = this.opponentBoard[y][x];
                
                if (cellValue === 2) {
                    cell.classList.add('hit');
                } else if (cellValue === 3) {
                    cell.classList.add('miss');
                } else if (cellValue === 4) {
                    cell.classList.add('blocked');
                }
                
                board.appendChild(cell);
            }
        }
    }

    
    
    updatePlayerBoard() {
        this.renderPlayerBoard();
    }
    
    updateCounters() {
        // Корабли игрока (сколько осталось непотопленными)
        const playerLiveShips = this.playerShips.filter(ship => {
            for (let i = 0; i < ship.size; i++) {
                const shipX = ship.isHorizontal ? ship.x + i : ship.x;
                const shipY = ship.isHorizontal ? ship.y : ship.y + i;
                if (this.playerBoard[shipY][shipX] === 2) {
                    // Нашли попадание в этот корабль
                    // Проверяем, потоплен ли весь корабль
                    let allHit = true;
                    for (let j = 0; j < ship.size; j++) {
                        const checkX = ship.isHorizontal ? ship.x + j : ship.x;
                        const checkY = ship.isHorizontal ? ship.y : ship.y + j;
                        if (this.playerBoard[checkY][checkX] !== 2) {
                            allHit = false;
                            break;
                        }
                    }
                    // Если корабль потоплен, не считаем его живым
                    if (allHit) return false;
                }
            }
            return true;
        }).length;
        
        // Попадания по игроку
        const playerHits = this.playerBoard.flat().filter(cell => cell === 2).length;
        
        // Живых кораблей у игрока
        const playerShipsCount = playerLiveShips;
        document.getElementById('playerShipsCount').textContent = `${playerShipsCount}/10`;
        document.getElementById('playerHitsCount').textContent = playerHits;
        
        // Попадания по противнику
        const opponentHits = this.opponentBoard.flat().filter(cell => cell === 2).length;
        
        // считаем через shipSunk события
        if (!this.opponentSunkShips) this.opponentSunkShips = 0;
        
        document.getElementById('opponentHitsCount').textContent = opponentHits;
        document.getElementById('sunkShipsCount').textContent = `${this.opponentSunkShips || 0}/10`;
    }
    
    updateShipsToPlace() {
        let totalToPlace = 0;
        let totalPlaced = 0;
        
        this.shipsToPlace.forEach(ship => {
            totalToPlace += ship.count;
            totalPlaced += ship.placed;
        });
        
        const status = document.getElementById('placementStatus');
        if (status) {
            status.textContent = `Осталось расставить: ${totalToPlace - totalPlaced} кораблей`;
            status.style.color = totalPlaced === totalToPlace ? '#27ae60' : '#e74c3c';
        }
        
        // Обновляем кнопки кораблей
        document.querySelectorAll('.ship-item').forEach(item => {
            const size = parseInt(item.dataset.size);
            const shipType = this.shipsToPlace.find(s => s.size === size);
            
            if (shipType) {
                const remaining = shipType.count - shipType.placed;
                item.textContent = `${size}-палубный (${remaining} осталось)`;
                
                if (shipType.placed >= shipType.count) {
                    item.classList.add('placed');
                    item.classList.remove('selected');
                } else {
                    item.classList.remove('placed');
                }
            }
        });
        
        // Активируем кнопку подтверждения если все корабли расставлены
        const placeBtn = document.getElementById('placeShipsBtn');
        if (placeBtn) {
            placeBtn.disabled = totalPlaced !== totalToPlace;
        }
    }
    
    updateTurnDisplay() {
        const statusElement = document.getElementById('playerStatus');
        if (!statusElement) return;
        
        if (this.isMyTurn) {
            statusElement.textContent = '🎯 Ваш ход!';
            statusElement.className = 'status your-turn';
        } else {
            statusElement.textContent = '⏳ Ход противника';
            statusElement.className = 'status opponent-turn';
        }
    }
    
    // Чат
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (text && this.ws.readyState === WebSocket.OPEN) {
            this.sendMessage({ 
                type: 'chat_message', 
                text: text 
            });
            input.value = '';
        }
    }
    
    displayChatMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.playerId === this.playerId ? 'player' : 'opponent'}`;
        
        const time = message.timestamp || new Date().toLocaleTimeString();
        const name = message.playerId === this.playerId ? 'Вы' : (message.playerName || 'Противник');
        
        messageElement.innerHTML = `
            <div style="font-weight: bold; color: ${message.playerId === this.playerId ? '#27ae60' : '#e74c3c'}">
                ${name} (${time}):
            </div>
            <div>${message.text}</div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    addSystemMessage(text) {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.textContent = `[Система] ${text}`;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Навигация
    showLobby() {
        this.gameState = 'lobby';
        this.playerId = null;
        this.roomId = null;
        this.currentShip = null;
        this.playerShips = [];
        this.placedShips = [];
        this.playerBoard = Array(10).fill().map(() => Array(10).fill(0));
        this.opponentBoard = Array(10).fill().map(() => Array(10).fill(0));
        
        document.getElementById('lobbyView').classList.remove('hidden');
        document.getElementById('gameView').classList.add('hidden');
        document.getElementById('leaveRoomBtn').classList.add('hidden');
        document.getElementById('placementPhase').classList.add('hidden');
        document.getElementById('playerId').style.display = 'none';
        
        document.getElementById('playerStatus').textContent = 'Выберите комнату';
        document.getElementById('playerStatus').className = 'status waiting';
        
        this.clearShips();
        this.renderBoards();
    }
    
    showGameView() {
        document.getElementById('lobbyView').classList.add('hidden');
        document.getElementById('gameView').classList.remove('hidden');
        document.getElementById('leaveRoomBtn').classList.remove('hidden');
    }
    
    leaveRoom() {
        this.sendMessage({ type: 'leave_room' });
    }
    
    getRooms() {
        this.sendMessage({ type: 'get_rooms' });
    }
    
    // Вспомогательные функции
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket не подключен');
            this.addSystemMessage('Нет подключения к серверу');
        }
    }
    
    showError(message) {
        console.error('Ошибка:', message);
        this.addSystemMessage(`❌ ${message}`);
        alert(`Ошибка: ${message}`);
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('load', () => {
    const game = new BattleshipGame();
    window.battleshipGame = game; // Для отладки в консоли
});