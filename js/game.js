/* === Game 类 — 游戏主控制器（动画循环驱动） === */

class Game {
    constructor() {
        this.board = new Board(ROWS, COLS);
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas, this.board);

        // 游戏状态
        this.state = 'IDLE'; // IDLE | SELECTED | SWAPPING | ANIMATING
        this.selectedRow = null;
        this.selectedCol = null;

        // 分数和步数
        this.score = 0;
        this.movesLeft = 30;

        // 动画循环相关
        this.animFrameId = null;
        this.lastTime = 0;
        this.pendingAction = null; // 动画完成后要执行的回调

        // 连击计数
        this.comboCount = 0;

        this.init();
    }

    /**
     * 初始化游戏
     */
    init() {
        this.board.initBoard();
        this.renderer.init();
        this.renderer.render();
        this.updateUI();
        this.bindEvents();
        this.startLoop();
    }

    /**
     * 启动动画循环
     */
    startLoop() {
        this.lastTime = performance.now();
        const loop = (now) => {
            const deltaTime = Math.min(now - this.lastTime, 50); // 防止大帧跳跃
            this.lastTime = now;

            // 更新渲染器（粒子、消除动画）
            this.renderer.update(deltaTime);

            // 重新绘制
            this.renderer.render();

            // 消除动画完成后，执行待处理动作
            if (this.pendingAction && this.renderer.isRemovalComplete()) {
                const action = this.pendingAction;
                this.pendingAction = null;
                action();
            }

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    // ==================== 输入处理 ====================

    bindEvents() {
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;
            this.handleInput(x, y);
        });
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.handleInput(x, y);
    }

    handleInput(pixelX, pixelY) {
        if (this.movesLeft <= 0) return;
        // 动画进行中不接受输入
        if (this.state === 'SWAPPING' || this.state === 'ANIMATING') return;

        const pos = this.renderer.getGridPos(pixelX, pixelY);
        if (!pos) return;

        const { row, col } = pos;
        const piece = this.board.getPiece(row, col);
        if (piece === null) return;

        if (this.state === 'IDLE') {
            this.selectPiece(row, col);
        } else if (this.state === 'SELECTED') {
            if (row === this.selectedRow && col === this.selectedCol) {
                this.deselectPiece();
            } else if (this.board.isAdjacent(this.selectedRow, this.selectedCol, row, col)) {
                this.trySwap(this.selectedRow, this.selectedCol, row, col);
            } else {
                this.selectPiece(row, col);
            }
        }
    }

    // ==================== 选择与交换 ====================

    selectPiece(row, col) {
        this.selectedRow = row;
        this.selectedCol = col;
        this.state = 'SELECTED';
        this.renderer.setSelection(row, col);
    }

    deselectPiece() {
        this.selectedRow = null;
        this.selectedCol = null;
        this.state = 'IDLE';
        this.renderer.clearSelection();
    }

    trySwap(row1, col1, row2, col2) {
        this.state = 'SWAPPING';
        this.renderer.clearSelection();

        // 执行交换
        this.board.swap(row1, col1, row2, col2);

        // 检测匹配
        const matches = this.board.findAllMatches();

        if (matches.size > 0) {
            this.movesLeft--;
            this.state = 'ANIMATING';
            this.comboCount = 0;
            this.processMatches(matches);
        } else {
            // 无匹配，换回来
            this.board.swap(row1, col1, row2, col2);
            this.state = 'IDLE';
            this.selectedRow = null;
            this.selectedCol = null;
        }

        this.updateUI();
    }

    // ==================== 消除流程 ====================

    /**
     * 处理匹配消除（动画驱动）
     */
    processMatches(matches) {
        this.comboCount++;

        // 计算分数
        const count = matches.size;
        let points = count * 10;
        if (count >= 5) points += 30;
        else if (count >= 4) points += 15;
        // 连击加成
        const comboBonus = Math.min(this.comboCount - 1, 5) * 5;
        points += comboBonus;
        this.score += points;

        // 启动消除动画
        this.renderer.startRemovalAnimation(matches);

        // 从棋盘移除
        this.board.removeMatches(matches);

        if (this.comboCount > 1) {
            this.showCombo(this.comboCount);
        }

        this.updateUI();

        // 动画完成后 → 下落 → 填充 → 连锁检测
        this.pendingAction = () => this.afterRemoval();
    }

    /**
     * 消除动画完成后：下落 + 填充 + 连锁检测
     */
    afterRemoval() {
        this.board.applyGravity();
        this.board.refillBoard();

        // 检测连锁
        const newMatches = this.board.findAllMatches();
        if (newMatches.size > 0) {
            // 连锁消除！
            this.processMatches(newMatches);
        } else {
            // 没有更多匹配了，回到空闲
            this.state = 'IDLE';
            this.selectedRow = null;
            this.selectedCol = null;
            this.comboCount = 0;
            this.updateUI();
        }
    }

    /**
     * 显示连击提示
     */
    showCombo(count) {
        const hint = document.querySelector('.hint');
        const combos = ['', '', '🔥 双连击！', '⚡ 三连击！', '💥 四连击！', '🌟 五连击！'];
        const text = count <= 5 ? combos[count] : `🌈 ${count}连击！太强了！`;
        hint.textContent = text;
        hint.style.transform = 'scale(1.3)';
        hint.style.color = '#FFD700';
        setTimeout(() => {
            hint.style.transform = 'scale(1)';
            hint.style.color = 'rgba(255, 255, 255, 0.7)';
        }, 600);
    }

    // ==================== UI ====================

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('moves').textContent = this.movesLeft;

        if (this.movesLeft <= 0 && this.state === 'IDLE') {
            document.querySelector('.hint').textContent = '🎉 游戏结束！刷新页面重新开始';
            document.querySelector('.hint').style.color = '#FFD700';
        }
    }
}

// === 启动游戏 ===
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
