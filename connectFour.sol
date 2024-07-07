// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.19;

contract ConnectFour {
    address public owner;
    uint256 public gameIdCounter;
    uint256 public constant FEE_PERCENTAGE = 5;
    uint256 public constant TIE_PERCENTAGE = 1;
    uint256 public constant TURN_TIMEOUT = 50;

    struct Game {
        address creator;
        address opponent;
        uint256 stake;
        uint8[6][7] board;
        uint8 currentPlayer;
        bool isActive;
        uint256 lastMoveBlock;
    }

    mapping(uint256 => Game) public games;
    mapping(address => bool) public activeCreators;

    constructor() {
        owner = msg.sender;
    }

    function getGameBoard(uint256 _gameId) external view returns (uint8[6][7] memory) {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        return game.board;
    }

    function createGame(uint256 _stake) external payable {
        require(msg.value == _stake, "Incorrect stake amount");
        require(!activeCreators[msg.sender], "You already have an active game");

        games[gameIdCounter] = Game(
            msg.sender,
            address(0),
            _stake,
            [
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0]
            ],
            1,
            true,
            block.number
        );
        activeCreators[msg.sender] = true;
        gameIdCounter++;
    }

    function joinGame(uint256 _gameId) external payable {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        require(game.opponent == address(0), "Game already has an opponent");
        require(msg.sender != game.creator, "Cannot join your own game");
        require(msg.value == game.stake, "Incorrect stake amount");
        game.opponent = msg.sender;
        game.lastMoveBlock = block.number;
    }

    function cancelGame(uint256 _gameId) external {
        Game storage game = games[_gameId];
        require(game.creator == msg.sender, "Only game creator can cancel the game");
        require(game.opponent == address(0), "Game already has an opponent");
        uint256 refundAmount = game.stake * (100 - TIE_PERCENTAGE) / 100;
        uint256 feeAmount = game.stake * TIE_PERCENTAGE / 100;
        payable(game.creator).transfer(refundAmount);
        payable(owner).transfer(feeAmount);
        game.isActive = false;
        concludeGame(_gameId);
    }

    function makeMove(uint256 _gameId, uint256 _column) external {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        require(game.opponent != address(0), "Game does not have an opponent");
        require(msg.sender == game.creator || msg.sender == game.opponent, "Not a player in this game");
        require(game.currentPlayer == (msg.sender == game.creator ? 1 : 2), "Not your turn");
        require(_column < 7, "Invalid column");
        require(game.board[_column][5] == 0, "Column is full");

        uint8 row = 0;
        while (row < 6 && game.board[_column][row] != 0) {
            row++;
        }
        game.board[_column][row] = game.currentPlayer;
        game.currentPlayer = game.currentPlayer == 1 ? 2 : 1;
        game.lastMoveBlock = block.number;

        if (checkWin(game.board, _column, row)) {
            uint256 totalStake = game.stake * 2;
            uint256 winnerAmount = totalStake * (100 - FEE_PERCENTAGE) / 100;
            uint256 feeAmount = totalStake * FEE_PERCENTAGE / 100;
            payable(msg.sender).transfer(winnerAmount);
            payable(owner).transfer(feeAmount);
            game.isActive = false;
            concludeGame(_gameId);
        } else if (checkTie(game.board)) {
            uint256 refundAmount = game.stake * (100 - TIE_PERCENTAGE) / 100;
            uint256 feeAmount = game.stake * TIE_PERCENTAGE / 100;
            payable(game.creator).transfer(refundAmount);
            payable(game.opponent).transfer(refundAmount);
            payable(owner).transfer(feeAmount * 2);
            game.isActive = false;
            concludeGame(_gameId);
        }
    }

    function claimWinByTimeout(uint256 _gameId) external {
        Game storage game = games[_gameId];
        require(game.isActive, "Game is not active");
        require(game.opponent != address(0), "Game does not have an opponent");
        require(msg.sender == game.creator || msg.sender == game.opponent, "Not a player in this game");
        require(game.currentPlayer != (msg.sender == game.creator ? 1 : 2), "It's your turn");
        require(block.number > game.lastMoveBlock + TURN_TIMEOUT, "Timeout has not been reached");

        uint256 totalStake = game.stake * 2;
        uint256 winnerAmount = totalStake * (100 - FEE_PERCENTAGE) / 100;
        uint256 feeAmount = totalStake * FEE_PERCENTAGE / 100;
        payable(msg.sender).transfer(winnerAmount);
        payable(owner).transfer(feeAmount);
        game.isActive = false;
        concludeGame(_gameId);
    }

    function concludeGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        require(game.isActive == false, "Game is still active");
        delete activeCreators[game.creator];
        delete games[_gameId];
    }

    function checkWin(uint8[6][7] memory _board, uint256 _column, uint256 _row) private pure returns (bool) {
        uint8 player = _board[_column][_row];

        // Check horizontal
        uint256 count = 0;
        for (uint256 i = 0; i < 7; i++) {
            if (_board[i][_row] == player) {
                count++;
                if (count >= 4) return true;
            } else {
                count = 0;
            }
        }

        // Check vertical
        count = 0;
        for (uint256 t = 0; t < 6; t++) {
            if (_board[_column][t] == player) {
                count++;
                if (count >= 4) return true;
            } else {
                count = 0;
            }
        }

        // Check diagonal (top-left to bottom-right)
        count = 0;
        int256 c = int256(_column) - int256(_row);
        int256 r = 0;
        while (c >= 0 && c < 7 && r >= 0 && r < 6) {
            if (_board[uint256(c)][uint256(r)] == player) {
                count++;
                if (count >= 4) return true;
            } else {
                count = 0;
            }
            c++;
            r++;
        }

        // Check diagonal (top-right to bottom-left)
        count = 0;
        c = int256(_column) + int256(_row);
        r = 0;
        while (c >= 0 && c < 7 && r >= 0 && r < 6) {
            if (_board[uint256(c)][uint256(r)] == player) {
                count++;
                if (count >= 4) return true;
            } else {
                count = 0;
            }
            c--;
            r++;
        }

        return false;
    }

    function checkTie(uint8[6][7] memory _board) private pure returns (bool) {
        for (uint256 c = 0; c < 7; c++) {
            if (_board[c][5] == 0) {
                return false;
            }
        }
        return true;
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
