/* === Renderer 类 — Canvas 渲染 + 粒子特效 === */

// 6 种动物的 emoji
const PIECE_EMOJI = ['🐱', '🐶', '🐰', '🐼', '🐸', '🦊'];

// 对应边框 & 粒子颜色
const PIECE_COLORS = [
    '#FF6B6B', // 红 — 小猫
    '#FFA94D', // 橙 — 小狗
    '#FFD43B', // 黄 — 兔子
    '#69DB7C', // 绿 — 熊猫
    '#4DABF7', // 蓝 — 青蛙
    '#DA77F2', // 紫 — 狐狸
];

// 卡片背景的浅色版本
const PIECE_BG = [
    '#FFF0F0',
    '#FFF4EB',
    '#FFFDEB',
    '#EDFFF0',
    '#EDF6FF',
    '#F9EDFF',
];

const CELL_SIZE = 50;     // 每个格子的大小
const GAP = 3;            // 格子间距
const PADDING = 8;        // 棋盘边距
const REMOVAL_DURATION = 350; // 消除动画持续时间（毫秒）

class Renderer {
    constructor(canvas, board) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.board = board;
        this.selectedRow = null;
        this.selectedCol = null;

        // 粒子系统
        this.particles = [];

        // 消除动画中的棋子
        this.removingAnimations = []; // { row, col, type, elapsed }
    }

    /**
     * 设置画布大小
     */
    init() {
        const totalSize = CELL_SIZE * this.board.cols + GAP * (this.board.cols - 1) + PADDING * 2;
        this.canvas.width = totalSize;
        this.canvas.height = totalSize;
        this.totalSize = totalSize;
    }

    /**
     * 每帧更新（由 Game 的动画循环调用）
     * @param {number} deltaTime 帧间隔（毫秒）
     */
    update(deltaTime) {
        const dt = deltaTime / 1000;

        // 更新消除动画进度
        for (const anim of this.removingAnimations) {
            anim.elapsed += deltaTime;
        }
        this.removingAnimations = this.removingAnimations.filter(
            a => a.elapsed < REMOVAL_DURATION
        );

        // 更新粒子
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // 重力
            p.vx *= 0.97;     // 空气阻力
        }
        this.particles = this.particles.filter(p => p.life > 0);
    }

    /**
     * 消除动画是否全部完成
     */
    isRemovalComplete() {
        return this.removingAnimations.length === 0;
    }

    /**
     * 启动消除动画
     */
    startRemovalAnimation(matchSet) {
        for (const coord of matchSet) {
            const [r, c] = coord.split(',').map(Number);
            const type = this.board.grid[r][c];
            if (type !== null && type !== undefined) {
                this.removingAnimations.push({
                    row: r, col: c, type: type, elapsed: 0,
                });
                this.spawnParticles(r, c, type);
            }
        }
    }

    /**
     * 粒子爆炸
     */
    spawnParticles(row, col, type) {
        const { x, y } = this.getPixelPos(row, col);
        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;
        const color = PIECE_COLORS[type];
        const count = 10 + Math.floor(Math.random() * 8);

        // 彩色方块粒子
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
            const speed = 50 + Math.random() * 140;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 40,
                life: 0.25 + Math.random() * 0.5,
                maxLife: 0.25 + Math.random() * 0.5,
                color: color,
                size: 2 + Math.random() * 5,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12,
            });
        }

        // 白色星光粒子
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 90;
            this.particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: 0.12 + Math.random() * 0.3,
                maxLife: 0.12 + Math.random() * 0.3,
                color: '#FFFFFF',
                size: 1 + Math.random() * 3,
                rotation: 0,
                rotSpeed: 0,
            });
        }
    }

    // ==================== 渲染 ====================

    render() {
        const ctx = this.ctx;
        const { rows, cols } = this.board;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 棋盘背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        this.drawRoundRect(0, 0, this.totalSize, this.totalSize, 18);
        ctx.fill();

        // 收集正在消除的棋子
        const removingCoords = new Set(
            this.removingAnimations.map(a => `${a.row},${a.col}`)
        );

        // 画普通棋子
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (removingCoords.has(`${r},${c}`)) continue;
                const type = this.board.grid[r]?.[c];
                if (type !== null && type !== undefined) {
                    this.drawPiece(r, c, type, 1);
                }
            }
        }

        // 画正在消除的棋子（缩放旋转淡出）
        for (const anim of this.removingAnimations) {
            const progress = Math.min(anim.elapsed / REMOVAL_DURATION, 1);
            const eased = 1 - Math.pow(1 - progress, 2);
            const scale = 1 - eased * 0.85;
            const alpha = 1 - eased;
            const rotation = eased * 0.4;
            this.drawPieceAnimated(anim.row, anim.col, anim.type, scale, alpha, rotation);
        }

        // 选中高亮
        if (this.selectedRow !== null && this.selectedCol !== null &&
            !removingCoords.has(`${this.selectedRow},${this.selectedCol}`)) {
            this.drawSelection(this.selectedRow, this.selectedCol);
        }

        // 粒子层
        this.drawParticles();
    }

    /**
     * 画粒子
     */
    drawParticles() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            const size = p.size * (0.5 + alpha * 0.5);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation + p.rotSpeed * (1 - alpha));

            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;

            ctx.fillStyle = p.color;
            ctx.fillRect(-size / 2, -size / 2, size, size);

            ctx.restore();
        }
    }

    /**
     * 画普通棋子 — 白色卡片 + emoji 动物
     */
    drawPiece(row, col, type, alpha = 1) {
        const ctx = this.ctx;
        const { x, y } = this.getPixelPos(row, col);
        const radius = 10;
        const px = x + 1;
        const py = y + 1;
        const pw = CELL_SIZE - 2;
        const ph = CELL_SIZE - 2;

        ctx.save();
        ctx.globalAlpha = alpha;

        // 卡片阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // 白色圆角卡片
        this.roundRectPath(px, py, pw, ph, radius);
        const bgGrad = ctx.createLinearGradient(px, py, px, py + ph);
        bgGrad.addColorStop(0, '#FFFFFF');
        bgGrad.addColorStop(1, PIECE_BG[type]);
        ctx.fillStyle = bgGrad;
        ctx.fill();

        // 清除阴影，画彩色边框
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = PIECE_COLORS[type];
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 顶部高光
        const hlGrad = ctx.createLinearGradient(px, py, px, py + ph * 0.35);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.fill();

        // 绘制动物 emoji（居中）
        const fontSize = 30;
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_EMOJI[type], px + pw / 2, py + ph / 2 + 1);

        ctx.restore();
    }

    /**
     * 画消除动画中的棋子
     */
    drawPieceAnimated(row, col, type, scale, alpha, rotation) {
        const ctx = this.ctx;
        const { x, y } = this.getPixelPos(row, col);
        const radius = 10;
        const pw = CELL_SIZE - 2;
        const ph = CELL_SIZE - 2;
        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(cx, cy);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        const halfW = pw / 2;
        const halfH = ph / 2;

        // 发光
        ctx.shadowColor = PIECE_COLORS[type];
        ctx.shadowBlur = 14 * scale;

        this.roundRectPath(-halfW, -halfH, pw, ph, radius);

        const bgGrad = ctx.createLinearGradient(-halfW, -halfH, -halfW, halfH);
        bgGrad.addColorStop(0, '#FFFFFF');
        bgGrad.addColorStop(1, PIECE_BG[type]);
        ctx.fillStyle = bgGrad;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.strokeStyle = PIECE_COLORS[type];
        ctx.lineWidth = 2.5;
        ctx.stroke();

        const hlGrad = ctx.createLinearGradient(-halfW, -halfH, -halfW, halfH * 0.35);
        hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
        hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = hlGrad;
        ctx.fill();

        // Emoji
        const fontSize = 30;
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PIECE_EMOJI[type], 0, 1);

        ctx.restore();
    }

    /**
     * 选中高亮
     */
    drawSelection(row, col) {
        const ctx = this.ctx;
        const { x, y } = this.getPixelPos(row, col);
        const rx = x + 1;
        const ry = y + 1;
        const rw = CELL_SIZE - 2;
        const rh = CELL_SIZE - 2;

        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowBlur = 16;
        this.roundRectPath(rx, ry, rw, rh, 12);
        ctx.stroke();

        // 内圈金色闪光
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        this.roundRectPath(rx + 3, ry + 3, rw - 6, rh - 6, 8);
        ctx.stroke();

        ctx.restore();
    }

    // ==================== 坐标转换 ====================

    getPixelPos(row, col) {
        return {
            x: PADDING + col * (CELL_SIZE + GAP),
            y: PADDING + row * (CELL_SIZE + GAP),
        };
    }

    getGridPos(pixelX, pixelY) {
        const col = Math.floor((pixelX - PADDING) / (CELL_SIZE + GAP));
        const row = Math.floor((pixelY - PADDING) / (CELL_SIZE + GAP));
        if (this.board.inBounds(row, col)) {
            return { row, col };
        }
        return null;
    }

    // ==================== 选择状态 ====================

    setSelection(row, col) {
        this.selectedRow = row;
        this.selectedCol = col;
    }

    clearSelection() {
        this.selectedRow = null;
        this.selectedCol = null;
    }

    // ==================== 工具方法 ====================

    roundRectPath(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    drawRoundRect(x, y, w, h, r) {
        this.roundRectPath(x, y, w, h, r);
    }
}
