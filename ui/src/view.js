var m = require('mithril');

var chessground = require('chessground');

function wheel(ctrl, e) {
    if (e.target.tagName !== 'PIECE' && e.target.tagName !== 'SQUARE' && !e.target.classList.contains('cg-board')) return;
    m.redraw();
    e.preventDefault();
    return false;
}

function visualBoard(ctrl) {
    return m('div.lichess_board_wrap', [
        m('div.lichess_board', {
            config: function(el, isUpdate) {
                if (!isUpdate) el.addEventListener('wheel', function(e) {
                    return wheel(ctrl, e);
                });
            }
        }, [
            chessground.view(ctrl.ground),
            ctrl.promotion.view()
        ])
    ]);
}

module.exports = visualBoard;
