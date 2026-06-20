/* === Board 类 — 棋盘逻辑 === */

const ROWS = 9;
const COLS = 9;
const PIECE_TYPES = 6; // 6 种颜色的棋子

class Board {
    constructor(rows = ROWS, cols = COLS) {
        this.rows = rows;
        this.cols = cols;
        this.grid = []; // grid[row][col] = type(0-5) | null
    }

    /**
     * 初始化棋盘：随机填充棋子，确保没有初始的 3 连
     */
    initBoard() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                let type;
                do {
                    type = Math.floor(Math.random() * PIECE_TYPES);
                } while (this.wouldMatch(r, c, type));
                this.grid[r][c] = type;
            }
        }
    }

    /**
     * 检查在 (row, col) 放置 type 棋子是否会产生 3 连
     * （只检查左方和上方，因为棋盘是从左上到右下生成的）
     */
    wouldMatch(row, col, type) {
        // 检查左边两个是否与当前棋子同色
        if (col >= 2 &&
            this.grid[row][col - 1] === type &&
            this.grid[row][col - 2] === type) {
            return true;
        }
        // 检查上边两个是否与当前棋子同色
        if (row >= 2 &&
            this.grid[row - 1] !== undefined &&
            this.grid[row - 1][col] === type &&
            this.grid[row - 2] !== undefined &&
            this.grid[row - 2][col] === type) {
            return true;
        }
        return false;
    }

    /**
     * 在棋盘范围内吗？
     */
    inBounds(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    /**
     * 获取棋子类型
     */
    getPiece(row, col) {
        if (!this.inBounds(row, col)) return null;
        return this.grid[row][col];
    }

    /**
     * 交换两颗棋子（直接修改 grid）
     */
    swap(row1, col1, row2, col2) {
        const temp = this.grid[row1][col1];
        this.grid[row1][col1] = this.grid[row2][col2];
        this.grid[row2][col2] = temp;
    }

    /**
     * 查找所有匹配（横向 + 纵向 3连及以上）
     * 返回 Set of "row,col" 字符串
     */
    findAllMatches() {
        const matches = new Set();

        // 横向扫描
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 2; c++) {
                const type = this.grid[r][c];
                if (type === null) continue;
                let count = 1;
                while (c + count < this.cols && this.grid[r][c + count] === type) {
                    count++;
                }
                if (count >= 3) {
                    for (let i = 0; i < count; i++) {
                        matches.add(`${r},${c + i}`);
                    }
                }
                // 跳过已匹配的（如果不跳过，外层 for 循环的 c++ 会推进）
                // 注意：这里我选择不跳过，让外层自然推进，Set 会去重
            }
        }

        // 纵向扫描
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                const type = this.grid[r][c];
                if (type === null) continue;
                let count = 1;
                while (r + count < this.rows && this.grid[r + count][c] === type) {
                    count++;
                }
                if (count >= 3) {
                    for (let i = 0; i < count; i++) {
                        matches.add(`${r + i},${c}`);
                    }
                }
            }
        }

        return matches;
    }

    /**
     * 移除匹配的棋子（设为 null）
     * 返回移除的数量
     */
    removeMatches(matchSet) {
        for (const coord of matchSet) {
            const [r, c] = coord.split(',').map(Number);
            this.grid[r][c] = null;
        }
        return matchSet.size;
    }

    /**
     * 重力下落：将空位上方的棋子向下移动
     * 返回是否有棋子移动
     */
    applyGravity() {
        let moved = false;
        for (let c = 0; c < this.cols; c++) {
            // 从底部向上扫描
            let writeRow = this.rows - 1;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] !== null) {
                    if (r !== writeRow) {
                        this.grid[writeRow][c] = this.grid[r][c];
                        this.grid[r][c] = null;
                        moved = true;
                    }
                    writeRow--;
                }
            }
        }
        return moved;
    }

    /**
     * 填充空位：从顶部生成新棋子
     * 返回填充的数量
     */
    refillBoard() {
        let filled = 0;
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] === null) {
                    this.grid[r][c] = Math.floor(Math.random() * PIECE_TYPES);
                    filled++;
                }
            }
        }
        return filled;
    }

    /**
     * 检查两个位置是否相邻（上下左右）
     */
    isAdjacent(row1, col1, row2, col2) {
        const dr = Math.abs(row1 - row2);
        const dc = Math.abs(col1 - col2);
        return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }
}
