/*global ChessBoard*/
'use strict';

document.addEventListener('DOMContentLoaded', main);

/**
 * Hides the spining loading animation.
 */
function loaded() {
    var loader = document.querySelector('#loader');
    loader.parentElement.removeChild(loader);
    document.querySelector('main').classList.remove('hidden');
}

function main() {
    var peer, board, game;
    var orientation = location.hash.length === 0 ? 'w' : 'b',
        isConnected = false;

    peer = new Peer(location.hash.split('#').pop());

    peer.onWSOpen = function(id){
        var link = location.href + '#' + id;
        document.querySelector('#link').href = link;
        document.querySelector('#link').innerHTML = link;
        loaded();
        status('Waiting for opponent...');
    };

    /**
     * Function that fires when a square is clicked on the board.
     * @function 
     * @param {string} clickedSquare ID of clicked square.
     * @param {array} selectedSquares List of all the selected squares.
     */
    function onSquareClick(clickedSquare, selectedSquares) {
        if (!checkTurn()) {
            board.unselectSquare(clickedSquare);
            return;
        }

        if (selectedSquares.length === 0) {
            if (game.moves({
                square: clickedSquare
            }).length > 0) {
                board.selectSquare(clickedSquare);
            }

            return;
        }

        var selectedSquare = selectedSquares[0];

        if (clickedSquare === selectedSquare) {
            board.unselectSquare(clickedSquare);
            return;
        }

        var clickedPieceObject = game.get(clickedSquare);
        var selectedPieceObject = game.get(selectedSquare);

        if (clickedPieceObject && (clickedPieceObject.color === selectedPieceObject.color)) {
            board.unselectSquare(clickedSquare);
            return;
        }

        var legalMoves = game.moves({
            square: selectedSquare,
            verbose: true
        });
        var isMoveLegal = legalMoves.filter(function(move) {
            return move.to === clickedSquare;
        }).length > 0;

        if (!isMoveLegal) {
            status('Invalid move. Try Again.');
            return;
        }

        if (selectedPieceObject.type === 'p' && (clickedSquare[1] === '1' || clickedSquare[1] === '8')) { // Promotion
            board.askPromotion(selectedPieceObject.color, function(shortPiece) {
                move(selectedSquare, clickedSquare, shortPiece);
            });
        }
        else {
            move(selectedSquare, clickedSquare);
        }
    }

    /**
     * Moves a chess piece from one given location to another given location.
     * @function
     * @param {string} from Current location of piece.
     * @param {string} to The location to move the piece to.
     * @param {string} promotionShortPiece 
     */
    function move(from, to, promotionShortPiece) {
        game.move({
            from: from,
            to: to,
            promotion: promotionShortPiece
        });

        board.setPosition(game.fen());

        peer.send(String(game.fen()));
        checkGameStatus();
        board.unselectAllSquares();
    }
    
    /**
     * Checks the game status and update the status board accordingly.
     */
    function checkGameStatus() {
        if (game.game_over()) {
            if (game.in_draw()) {
                status('Game Over. It\'s a DRAW.');
            }
            status('Game Over. You have ' + (game.turn() === orientation ? 'LOST' : 'WON'));
        }
        else if (game.in_check()) {
            status((game.turn() === orientation ? 'You are' : 'Opponent is') + ' in CHECK.');
        }
        else {
            status((game.turn() === orientation ? 'Your' : 'Opponent\'s') + ' turn.');
        }
    }
  
    /**
     * Checks if user can play this turn.
     * @returns {boolean}
     */
    function checkTurn() {
        if (game.game_over()) {
            checkGameStatus();
            return false;
        } else if (!isConnected) {
            status('Connection to your opponent has been lost.');
            return false;
        } else if (game.turn() !== orientation) {
            status('Not your turn');
            return false;
        }
        return true;
    }

    /**
     * Updates the status UI element.
     * @param {string} string
     */
    function status(string) {
        document.getElementById('msg').innerHTML = string;
    }

    
    peer.onConnect = function () {
        if (orientation === 'w') {
            status('Connected to opponent, play your turn.');

        }
        else {
            status('Connected to opponent, waiting for him/her to play...');
            loaded();
        }

        isConnected = true;
        document.querySelector('header').classList.add('hidden');
        document.querySelector('.blur').classList.remove('blur');
    };

    peer.onData = function (data) {
        var fen = String(data);
        game.load(fen);
        board.setPosition(game.fen());
        checkGameStatus();
    };

    peer.onClose = function () {
        isConnected = false;
    };

    game = Chess();
    board = new ChessBoard('board', {
        onSquareClick: onSquareClick,
        orientation: orientation
    });
    peer.signal();
}
