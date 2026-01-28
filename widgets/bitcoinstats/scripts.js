/// <reference path="../../sdk/v1/scripts.js" />

function normalizeBaseUrl(url) {
    return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchJson(net, url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await net.fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} from ${url}`);
        }
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

// Minimal QR code generator (based on qrcode-generator by Kazuhiko Arase).
function createQrSvg(text, size = 120) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const cellSize = Math.max(1, Math.floor(size / qr.getModuleCount()));
    const qrSize = cellSize * qr.getModuleCount();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(qrSize));
    svg.setAttribute('height', String(qrSize));
    svg.setAttribute('viewBox', `0 0 ${qrSize} ${qrSize}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', String(qrSize));
    bg.setAttribute('height', String(qrSize));
    bg.setAttribute('fill', 'white');
    svg.appendChild(bg);
    for (let row = 0; row < qr.getModuleCount(); row += 1) {
        for (let col = 0; col < qr.getModuleCount(); col += 1) {
            if (qr.isDark(row, col)) {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', String(col * cellSize));
                rect.setAttribute('y', String(row * cellSize));
                rect.setAttribute('width', String(cellSize));
                rect.setAttribute('height', String(cellSize));
                rect.setAttribute('fill', '#111');
                svg.appendChild(rect);
            }
        }
    }
    return svg;
}

// QR code generator implementation.
const QRErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2,
};

const QRMaskPattern = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
};

function qrcode(typeNumber, errorCorrectLevel) {
    return new QRCodeModel(typeNumber, QRErrorCorrectLevel[errorCorrectLevel]);
}

class QRCodeModel {
    constructor(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    addData(data) {
        const newData = new QR8bitByte(data);
        this.dataList.push(newData);
        this.dataCache = null;
    }

    isDark(row, col) {
        if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
            throw new Error(`${row},${col}`);
        }
        return this.modules[row][col];
    }

    getModuleCount() {
        return this.moduleCount;
    }

    make() {
        if (this.typeNumber < 1) {
            this.typeNumber = this.getBestTypeNumber();
        }
        this.makeImpl(false, this.getBestMaskPattern());
    }

    makeImpl(test, maskPattern) {
        this.moduleCount = this.typeNumber * 4 + 17;
        this.modules = new Array(this.moduleCount);
        for (let row = 0; row < this.moduleCount; row += 1) {
            this.modules[row] = new Array(this.moduleCount);
            for (let col = 0; col < this.moduleCount; col += 1) {
                this.modules[row][col] = null;
            }
        }

        this.setupPositionProbePattern(0, 0);
        this.setupPositionProbePattern(this.moduleCount - 7, 0);
        this.setupPositionProbePattern(0, this.moduleCount - 7);
        this.setupPositionAdjustPattern();
        this.setupTimingPattern();
        this.setupTypeInfo(test, maskPattern);
        if (this.typeNumber >= 7) {
            this.setupTypeNumber(test);
        }

        if (this.dataCache == null) {
            this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
        }

        this.mapData(this.dataCache, maskPattern);
    }

    setupPositionProbePattern(row, col) {
        for (let r = -1; r <= 7; r += 1) {
            if (row + r <= -1 || this.moduleCount <= row + r) continue;
            for (let c = -1; c <= 7; c += 1) {
                if (col + c <= -1 || this.moduleCount <= col + c) continue;
                if (
                    (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                    (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                    (2 <= r && r <= 4 && 2 <= c && c <= 4)
                ) {
                    this.modules[row + r][col + c] = true;
                } else {
                    this.modules[row + r][col + c] = false;
                }
            }
        }
    }

    getBestMaskPattern() {
        let minLostPoint = 0;
        let pattern = 0;
        for (let i = 0; i < 8; i += 1) {
            this.makeImpl(true, i);
            const lostPoint = QRUtil.getLostPoint(this);
            if (i === 0 || minLostPoint > lostPoint) {
                minLostPoint = lostPoint;
                pattern = i;
            }
        }
        return pattern;
    }

    createMovieClip() {}

    setupTimingPattern() {
        for (let r = 8; r < this.moduleCount - 8; r += 1) {
            if (this.modules[r][6] != null) {
                continue;
            }
            this.modules[r][6] = r % 2 === 0;
        }
        for (let c = 8; c < this.moduleCount - 8; c += 1) {
            if (this.modules[6][c] != null) {
                continue;
            }
            this.modules[6][c] = c % 2 === 0;
        }
    }

    setupPositionAdjustPattern() {
        const pos = QRUtil.getPatternPosition(this.typeNumber);
        for (let i = 0; i < pos.length; i += 1) {
            for (let j = 0; j < pos.length; j += 1) {
                const row = pos[i];
                const col = pos[j];
                if (this.modules[row][col] != null) {
                    continue;
                }
                for (let r = -2; r <= 2; r += 1) {
                    for (let c = -2; c <= 2; c += 1) {
                        if (
                            r === -2 ||
                            r === 2 ||
                            c === -2 ||
                            c === 2 ||
                            (r === 0 && c === 0)
                        ) {
                            this.modules[row + r][col + c] = true;
                        } else {
                            this.modules[row + r][col + c] = false;
                        }
                    }
                }
            }
        }
    }

    setupTypeNumber(test) {
        const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
        for (let i = 0; i < 18; i += 1) {
            const mod = !test && ((bits >> i) & 1) === 1;
            this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod;
        }
        for (let i = 0; i < 18; i += 1) {
            const mod = !test && ((bits >> i) & 1) === 1;
            this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
        }
    }

    setupTypeInfo(test, maskPattern) {
        const data = (this.errorCorrectLevel << 3) | maskPattern;
        const bits = QRUtil.getBCHTypeInfo(data);
        for (let i = 0; i < 15; i += 1) {
            const mod = !test && ((bits >> i) & 1) === 1;
            if (i < 6) {
                this.modules[i][8] = mod;
            } else if (i < 8) {
                this.modules[i + 1][8] = mod;
            } else {
                this.modules[this.moduleCount - 15 + i][8] = mod;
            }
        }
        for (let i = 0; i < 15; i += 1) {
            const mod = !test && ((bits >> i) & 1) === 1;
            if (i < 8) {
                this.modules[8][this.moduleCount - i - 1] = mod;
            } else if (i < 9) {
                this.modules[8][15 - i - 1 + 1] = mod;
            } else {
                this.modules[8][15 - i - 1] = mod;
            }
        }
        this.modules[this.moduleCount - 8][8] = !test;
    }

    mapData(data, maskPattern) {
        let inc = -1;
        let row = this.moduleCount - 1;
        let bitIndex = 7;
        let byteIndex = 0;
        for (let col = this.moduleCount - 1; col > 0; col -= 2) {
            if (col === 6) col -= 1;
            while (true) {
                for (let c = 0; c < 2; c += 1) {
                    if (this.modules[row][col - c] == null) {
                        let dark = false;
                        if (byteIndex < data.length) {
                            dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                        }
                        const mask = QRUtil.getMask(maskPattern, row, col - c);
                        if (mask) {
                            dark = !dark;
                        }
                        this.modules[row][col - c] = dark;
                        bitIndex -= 1;
                        if (bitIndex === -1) {
                            byteIndex += 1;
                            bitIndex = 7;
                        }
                    }
                }
                row += inc;
                if (row < 0 || this.moduleCount <= row) {
                    row -= inc;
                    inc = -inc;
                    break;
                }
            }
        }
    }

    getBestTypeNumber() {
        for (let typeNumber = 1; typeNumber < 40; typeNumber += 1) {
            const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
            const buffer = new QRBitBuffer();
            for (let i = 0; i < this.dataList.length; i += 1) {
                const data = this.dataList[i];
                buffer.put(data.mode, 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                data.write(buffer);
            }
            let totalDataCount = 0;
            for (let i = 0; i < rsBlocks.length; i += 1) {
                totalDataCount += rsBlocks[i].dataCount;
            }
            if (buffer.getLengthInBits() <= totalDataCount * 8) {
                return typeNumber;
            }
        }
        return 40;
    }

    static createData(typeNumber, errorCorrectLevel, dataList) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        const buffer = new QRBitBuffer();
        for (let i = 0; i < dataList.length; i += 1) {
            const data = dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
            data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i += 1) {
            totalDataCount += rsBlocks[i].dataCount;
        }
        if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw new Error(`code length overflow. (${buffer.getLengthInBits()} > ${totalDataCount * 8})`);
        }
        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
        }
        while (buffer.getLengthInBits() % 8 !== 0) {
            buffer.putBit(false);
        }
        while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) {
                break;
            }
            buffer.put(QRUtil.PAD0, 8);
            if (buffer.getLengthInBits() >= totalDataCount * 8) {
                break;
            }
            buffer.put(QRUtil.PAD1, 8);
        }
        return QRCodeModel.createBytes(buffer, rsBlocks);
    }

    static createBytes(buffer, rsBlocks) {
        let offset = 0;
        let maxDcCount = 0;
        let maxEcCount = 0;
        const dcdata = new Array(rsBlocks.length);
        const ecdata = new Array(rsBlocks.length);
        for (let r = 0; r < rsBlocks.length; r += 1) {
            const dcCount = rsBlocks[r].dataCount;
            const ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);
            for (let i = 0; i < dcdata[r].length; i += 1) {
                dcdata[r][i] = 0xff & buffer.buffer[i + offset];
            }
            offset += dcCount;
            const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
            const modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);
            for (let i = 0; i < ecdata[r].length; i += 1) {
                const modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
            }
        }
        const totalCodeCount = rsBlocks.reduce((acc, block) => acc + block.totalCount, 0);
        const data = new Array(totalCodeCount);
        let index = 0;
        for (let i = 0; i < maxDcCount; i += 1) {
            for (let r = 0; r < rsBlocks.length; r += 1) {
                if (i < dcdata[r].length) {
                    data[index] = dcdata[r][i];
                    index += 1;
                }
            }
        }
        for (let i = 0; i < maxEcCount; i += 1) {
            for (let r = 0; r < rsBlocks.length; r += 1) {
                if (i < ecdata[r].length) {
                    data[index] = ecdata[r][i];
                    index += 1;
                }
            }
        }
        return data;
    }
}

class QR8bitByte {
    constructor(data) {
        this.mode = QRUtil.MODE_8BIT_BYTE;
        this.data = data;
    }
    getLength() {
        return this.data.length;
    }
    write(buffer) {
        for (let i = 0; i < this.data.length; i += 1) {
            buffer.put(this.data.charCodeAt(i), 8);
        }
    }
}

class QRBitBuffer {
    constructor() {
        this.buffer = [];
        this.length = 0;
    }
    get(index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    }
    put(num, length) {
        for (let i = 0; i < length; i += 1) {
            this.putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
    }
    getLengthInBits() {
        return this.length;
    }
    putBit(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
        }
        if (bit) {
            this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
        }
        this.length += 1;
    }
}

class QRPolynomial {
    constructor(num, shift) {
        let offset = 0;
        while (offset < num.length && num[offset] === 0) {
            offset += 1;
        }
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i += 1) {
            this.num[i] = num[i + offset];
        }
    }
    get(index) {
        return this.num[index];
    }
    getLength() {
        return this.num.length;
    }
    multiply(e) {
        const num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i += 1) {
            for (let j = 0; j < e.getLength(); j += 1) {
                num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
            }
        }
        return new QRPolynomial(num, 0);
    }
    mod(e) {
        if (this.getLength() - e.getLength() < 0) {
            return this;
        }
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i += 1) {
            num[i] = this.get(i);
        }
        for (let i = 0; i < e.getLength(); i += 1) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
    }
}

const QRMath = {
    glog(n) {
        if (n < 1) {
            throw new Error(`glog(${n})`);
        }
        return QRMath.LOG_TABLE[n];
    },
    gexp(n) {
        while (n < 0) {
            n += 255;
        }
        while (n >= 256) {
            n -= 255;
        }
        return QRMath.EXP_TABLE[n];
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256),
};

for (let i = 0; i < 8; i += 1) {
    QRMath.EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i += 1) {
    QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i += 1) {
    QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
}

const QRUtil = {
    PATTERN_POSITION_TABLE: [
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
        [6, 30, 54],
        [6, 32, 58],
        [6, 34, 62],
        [6, 26, 46, 66],
        [6, 26, 48, 70],
        [6, 26, 50, 74],
        [6, 30, 54, 78],
        [6, 30, 56, 82],
        [6, 30, 58, 86],
        [6, 34, 62, 90],
        [6, 28, 50, 72, 94],
        [6, 26, 50, 74, 98],
        [6, 30, 54, 78, 102],
        [6, 28, 54, 80, 106],
        [6, 32, 58, 84, 110],
        [6, 30, 58, 86, 114],
        [6, 34, 62, 90, 118],
        [6, 26, 50, 74, 98, 122],
        [6, 30, 54, 78, 102, 126],
        [6, 26, 52, 78, 104, 130],
        [6, 30, 56, 82, 108, 134],
        [6, 34, 60, 86, 112, 138],
        [6, 30, 58, 86, 114, 142],
        [6, 34, 62, 90, 118, 146],
        [6, 30, 54, 78, 102, 126, 150],
        [6, 24, 50, 76, 102, 128, 154],
        [6, 28, 54, 80, 106, 132, 158],
        [6, 32, 58, 84, 110, 136, 162],
        [6, 26, 54, 82, 110, 138, 166],
        [6, 30, 58, 86, 114, 142, 170],
    ],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
    G18:
        (1 << 12) |
        (1 << 11) |
        (1 << 10) |
        (1 << 9) |
        (1 << 8) |
        (1 << 5) |
        (1 << 2) |
        (1 << 0),
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    MODE_8BIT_BYTE: 1 << 2,
    PAD0: 0xec,
    PAD1: 0x11,
    getBCHTypeInfo(data) {
        let d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
            d ^= QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15));
        }
        return ((data << 10) | d) ^ QRUtil.G15_MASK;
    },
    getBCHTypeNumber(data) {
        let d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
            d ^= QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18));
        }
        return (data << 12) | d;
    },
    getBCHDigit(data) {
        let digit = 0;
        while (data !== 0) {
            digit += 1;
            data >>>= 1;
        }
        return digit;
    },
    getPatternPosition(typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
    },
    getMask(maskPattern, i, j) {
        switch (maskPattern) {
            case QRMaskPattern.PATTERN000:
                return (i + j) % 2 === 0;
            case QRMaskPattern.PATTERN001:
                return i % 2 === 0;
            case QRMaskPattern.PATTERN010:
                return j % 3 === 0;
            case QRMaskPattern.PATTERN011:
                return (i + j) % 3 === 0;
            case QRMaskPattern.PATTERN100:
                return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
            case QRMaskPattern.PATTERN101:
                return ((i * j) % 2 + (i * j) % 3) === 0;
            case QRMaskPattern.PATTERN110:
                return (((i * j) % 2 + (i * j) % 3) % 2) === 0;
            case QRMaskPattern.PATTERN111:
                return (((i * j) % 3 + (i + j) % 2) % 2) === 0;
            default:
                throw new Error(`bad maskPattern:${maskPattern}`);
        }
    },
    getErrorCorrectPolynomial(errorCorrectLength) {
        let a = new QRPolynomial([1], 0);
        for (let i = 0; i < errorCorrectLength; i += 1) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
        }
        return a;
    },
    getLengthInBits(mode, type) {
        if (1 <= type && type < 10) {
            switch (mode) {
                case QRUtil.MODE_8BIT_BYTE:
                    return 8;
                default:
                    throw new Error(`mode:${mode}`);
            }
        } else if (type < 27) {
            switch (mode) {
                case QRUtil.MODE_8BIT_BYTE:
                    return 16;
                default:
                    throw new Error(`mode:${mode}`);
            }
        } else if (type < 41) {
            switch (mode) {
                case QRUtil.MODE_8BIT_BYTE:
                    return 16;
                default:
                    throw new Error(`mode:${mode}`);
            }
        } else {
            throw new Error(`type:${type}`);
        }
    },
    getLostPoint(qrcodeInstance) {
        const moduleCount = qrcodeInstance.getModuleCount();
        let lostPoint = 0;
        for (let row = 0; row < moduleCount; row += 1) {
            for (let col = 0; col < moduleCount; col += 1) {
                let sameCount = 0;
                const dark = qrcodeInstance.isDark(row, col);
                for (let r = -1; r <= 1; r += 1) {
                    if (row + r < 0 || moduleCount <= row + r) {
                        continue;
                    }
                    for (let c = -1; c <= 1; c += 1) {
                        if (col + c < 0 || moduleCount <= col + c) {
                            continue;
                        }
                        if (r === 0 && c === 0) {
                            continue;
                        }
                        if (dark === qrcodeInstance.isDark(row + r, col + c)) {
                            sameCount += 1;
                        }
                    }
                }
                if (sameCount > 5) {
                    lostPoint += 3 + sameCount - 5;
                }
            }
        }
        for (let row = 0; row < moduleCount - 1; row += 1) {
            for (let col = 0; col < moduleCount - 1; col += 1) {
                let count = 0;
                if (qrcodeInstance.isDark(row, col)) count += 1;
                if (qrcodeInstance.isDark(row + 1, col)) count += 1;
                if (qrcodeInstance.isDark(row, col + 1)) count += 1;
                if (qrcodeInstance.isDark(row + 1, col + 1)) count += 1;
                if (count === 0 || count === 4) {
                    lostPoint += 3;
                }
            }
        }
        for (let row = 0; row < moduleCount; row += 1) {
            for (let col = 0; col < moduleCount - 6; col += 1) {
                if (
                    qrcodeInstance.isDark(row, col) &&
                    !qrcodeInstance.isDark(row, col + 1) &&
                    qrcodeInstance.isDark(row, col + 2) &&
                    qrcodeInstance.isDark(row, col + 3) &&
                    qrcodeInstance.isDark(row, col + 4) &&
                    !qrcodeInstance.isDark(row, col + 5) &&
                    qrcodeInstance.isDark(row, col + 6)
                ) {
                    lostPoint += 40;
                }
            }
        }
        for (let col = 0; col < moduleCount; col += 1) {
            for (let row = 0; row < moduleCount - 6; row += 1) {
                if (
                    qrcodeInstance.isDark(row, col) &&
                    !qrcodeInstance.isDark(row + 1, col) &&
                    qrcodeInstance.isDark(row + 2, col) &&
                    qrcodeInstance.isDark(row + 3, col) &&
                    qrcodeInstance.isDark(row + 4, col) &&
                    !qrcodeInstance.isDark(row + 5, col) &&
                    qrcodeInstance.isDark(row + 6, col)
                ) {
                    lostPoint += 40;
                }
            }
        }
        let darkCount = 0;
        for (let col = 0; col < moduleCount; col += 1) {
            for (let row = 0; row < moduleCount; row += 1) {
                if (qrcodeInstance.isDark(row, col)) {
                    darkCount += 1;
                }
            }
        }
        const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5;
        lostPoint += ratio * 10;
        return lostPoint;
    },
};

class QRRSBlock {
    constructor(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
    }
    static getRSBlocks(typeNumber, errorCorrectLevel) {
        const rsBlock = QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
        if (rsBlock == null) {
            throw new Error(`bad rs block @ typeNumber:${typeNumber} / errorCorrectLevel:${errorCorrectLevel}`);
        }
        const length = rsBlock.length / 3;
        const list = [];
        for (let i = 0; i < length; i += 1) {
            const count = rsBlock[i * 3];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];
            for (let j = 0; j < count; j += 1) {
                list.push(new QRRSBlock(totalCount, dataCount));
            }
        }
        return list;
    }
}

QRRSBlock.RS_BLOCK_TABLE = [
    [1, 26, 19],
    [1, 26, 16],
    [1, 26, 13],
    [1, 26, 9],
    [1, 44, 34],
    [1, 44, 28],
    [1, 44, 22],
    [1, 44, 16],
    [1, 70, 55],
    [1, 70, 44],
    [2, 35, 17],
    [2, 35, 13],
    [1, 100, 80],
    [2, 50, 32],
    [2, 50, 24],
    [4, 25, 9],
    [1, 134, 108],
    [2, 67, 43],
    [2, 33, 15, 2, 34, 16],
    [2, 33, 11, 2, 34, 12],
    [2, 86, 68],
    [4, 43, 27],
    [4, 43, 19],
    [4, 43, 15],
    [2, 98, 78],
    [4, 49, 31],
    [2, 32, 14, 4, 33, 15],
    [4, 39, 13, 1, 40, 14],
    [2, 121, 97],
    [2, 60, 38, 2, 61, 39],
    [4, 40, 18, 2, 41, 19],
    [4, 40, 14, 2, 41, 15],
    [2, 146, 116],
    [3, 58, 36, 2, 59, 37],
    [4, 36, 16, 4, 37, 17],
    [4, 36, 12, 4, 37, 13],
    [2, 86, 68, 2, 87, 69],
    [4, 69, 43, 1, 70, 44],
    [6, 43, 19, 2, 44, 20],
    [6, 43, 15, 2, 44, 16],
    [4, 101, 81],
    [1, 80, 50, 4, 81, 51],
    [4, 50, 22, 4, 51, 23],
    [3, 36, 12, 8, 37, 13],
    [2, 116, 92, 2, 117, 93],
    [6, 58, 36, 2, 59, 37],
    [4, 46, 20, 6, 47, 21],
    [7, 42, 14, 4, 43, 15],
    [4, 133, 107],
    [8, 59, 37, 1, 60, 38],
    [8, 44, 20, 4, 45, 21],
    [12, 33, 11, 4, 34, 12],
    [3, 145, 115, 1, 146, 116],
    [4, 64, 40, 5, 65, 41],
    [11, 36, 16, 5, 37, 17],
    [11, 36, 12, 5, 37, 13],
    [5, 109, 87, 1, 110, 88],
    [5, 65, 41, 5, 66, 42],
    [5, 54, 24, 7, 55, 25],
    [11, 36, 12, 7, 37, 13],
    [5, 122, 98, 1, 123, 99],
    [7, 73, 45, 3, 74, 46],
    [15, 43, 19, 2, 44, 20],
    [3, 45, 15, 13, 46, 16],
    [1, 135, 107, 5, 136, 108],
    [10, 74, 46, 1, 75, 47],
    [1, 50, 22, 15, 51, 23],
    [2, 42, 14, 17, 43, 15],
    [5, 150, 120, 1, 151, 121],
    [9, 69, 43, 4, 70, 44],
    [17, 50, 22, 1, 51, 23],
    [2, 42, 14, 19, 43, 15],
    [3, 141, 113, 4, 142, 114],
    [3, 70, 44, 11, 71, 45],
    [17, 47, 21, 4, 48, 22],
    [9, 39, 13, 16, 40, 14],
    [3, 135, 107, 5, 136, 108],
    [3, 67, 41, 13, 68, 42],
    [15, 54, 24, 5, 55, 25],
    [15, 43, 15, 10, 44, 16],
    [4, 144, 116, 4, 145, 117],
    [17, 68, 42],
    [17, 50, 22, 6, 51, 23],
    [19, 46, 16, 6, 47, 17],
    [2, 139, 111, 7, 140, 112],
    [17, 74, 46],
    [7, 54, 24, 16, 55, 25],
    [34, 37, 13],
    [4, 151, 121, 5, 152, 122],
    [4, 75, 47, 14, 76, 48],
    [11, 54, 24, 14, 55, 25],
    [16, 45, 15, 14, 46, 16],
    [6, 147, 117, 4, 148, 118],
    [6, 73, 45, 14, 74, 46],
    [11, 54, 24, 16, 55, 25],
    [30, 46, 16, 2, 47, 17],
    [8, 132, 106, 4, 133, 107],
    [8, 75, 47, 13, 76, 48],
    [7, 54, 24, 22, 55, 25],
    [22, 45, 15, 13, 46, 16],
    [10, 142, 114, 2, 143, 115],
    [19, 74, 46, 4, 75, 47],
    [28, 50, 22, 6, 51, 23],
    [33, 46, 16, 4, 47, 17],
    [8, 152, 122, 4, 153, 123],
    [22, 73, 45, 3, 74, 46],
    [8, 53, 23, 26, 54, 24],
    [12, 45, 15, 28, 46, 16],
    [3, 147, 117, 10, 148, 118],
    [3, 73, 45, 23, 74, 46],
    [4, 54, 24, 31, 55, 25],
    [11, 45, 15, 31, 46, 16],
    [7, 146, 116, 7, 147, 117],
    [21, 73, 45, 7, 74, 46],
    [1, 53, 23, 37, 54, 24],
    [19, 45, 15, 26, 46, 16],
    [5, 145, 115, 10, 146, 116],
    [19, 75, 47, 10, 76, 48],
    [15, 54, 24, 25, 55, 25],
    [23, 45, 15, 25, 46, 16],
    [13, 145, 115, 3, 146, 116],
    [2, 74, 46, 29, 75, 47],
    [42, 54, 24, 1, 55, 25],
    [23, 45, 15, 28, 46, 16],
    [17, 145, 115],
    [10, 74, 46, 23, 75, 47],
    [10, 54, 24, 35, 55, 25],
    [19, 45, 15, 35, 46, 16],
    [17, 145, 115, 1, 146, 116],
    [14, 74, 46, 21, 75, 47],
    [29, 54, 24, 19, 55, 25],
    [11, 45, 15, 46, 46, 16],
    [13, 145, 115, 6, 146, 116],
    [14, 74, 46, 23, 75, 47],
    [44, 54, 24, 7, 55, 25],
    [59, 46, 16, 1, 47, 17],
    [12, 151, 121, 7, 152, 122],
    [12, 75, 47, 26, 76, 48],
    [39, 54, 24, 14, 55, 25],
    [22, 45, 15, 41, 46, 16],
    [6, 151, 121, 14, 152, 122],
    [6, 75, 47, 34, 76, 48],
    [46, 54, 24, 10, 55, 25],
    [2, 45, 15, 64, 46, 16],
    [17, 152, 122, 4, 153, 123],
    [29, 74, 46, 14, 75, 47],
    [49, 54, 24, 10, 55, 25],
    [24, 45, 15, 46, 46, 16],
    [4, 152, 122, 18, 153, 123],
    [13, 74, 46, 32, 75, 47],
    [48, 54, 24, 14, 55, 25],
    [42, 45, 15, 32, 46, 16],
    [20, 147, 117, 4, 148, 118],
    [40, 75, 47, 7, 76, 48],
    [43, 54, 24, 22, 55, 25],
    [10, 45, 15, 67, 46, 16],
    [19, 148, 118, 6, 149, 119],
    [18, 75, 47, 31, 76, 48],
    [34, 54, 24, 34, 55, 25],
    [20, 45, 15, 61, 46, 16],
];

async function getData({ net, url }) {
    const msg1 = `${url}/api/blocks/tip`;
    const msg3 = `${url}/api/mempool/summary`;
    const msg4 = `${url}/api/blockchain/next-halving`;
    const msg5 = `${url}/api/mining/next-block`;
    const msg6 = `${url}/api/blockchain/coins`;
    const msg8 = `${url}/api/networkinfo`;
    const msg9 = `${url}/api/getnettotals`;

    const results = await Promise.allSettled([
        fetchJson(net, msg1),
        fetchJson(net, msg3),
        fetchJson(net, msg4),
        fetchJson(net, msg5),
        fetchJson(net, msg6),
        fetchJson(net, msg8),
        fetchJson(net, msg9),
    ]);

    const tipRes = results[0].status === 'fulfilled' ? results[0].value : null;
    const mempoolRes = results[1].status === 'fulfilled' ? results[1].value : null;
    const halvingRes = results[2].status === 'fulfilled' ? results[2].value : null;
    const nextBlockRes = results[3].status === 'fulfilled' ? results[3].value : null;
    const coinsRes = results[4].status === 'fulfilled' ? results[4].value : null;
    const netInfoRes = results[5].status === 'fulfilled' ? results[5].value : null;
    const totalsRes = results[6].status === 'fulfilled' ? results[6].value : null;

    const blockheight = typeof tipRes?.height === 'number' ? tipRes.height : 0;
    const nextBlock = nextBlockRes || {};
    const min_fees = Number.isFinite(Number(nextBlock.minFeeRate)) ? Number(nextBlock.minFeeRate) : 0;
    const med_fees = Number.isFinite(Number(nextBlock.medianFeeRate)) ? Number(nextBlock.medianFeeRate) : 0;
    const max_fees = Number.isFinite(Number(nextBlock.maxFeeRate)) ? Number(nextBlock.maxFeeRate) : 0;

    const supply = Number.isFinite(Number(coinsRes?.supply)) ? Number(coinsRes.supply) : 0;

    const mempool_max = mempoolRes?.maxmempool ?? mempoolRes?.maxMempool ?? mempoolRes?.maxMemPool ?? 0;
    const mempool_usage = mempoolRes?.usage ?? 0;
    const txcount = mempoolRes?.size ?? 0;
    const halving = halvingRes?.blocksUntilNextHalving ?? 0;

    const connections = netInfoRes?.connections ?? 0;
    const connections_out = netInfoRes?.connections_out ?? 0;
    const connections_in = netInfoRes?.connections_in ?? 0;
    const localservices = netInfoRes?.localservices ?? '';
    const localservicesnames = Array.isArray(netInfoRes?.localservicesnames)
        ? netInfoRes.localservicesnames
        : [];
    const networks = Array.isArray(netInfoRes?.networks) ? netInfoRes.networks : [];
    const localaddresses = Array.isArray(netInfoRes?.localaddresses) ? netInfoRes.localaddresses : [];
    let version = '0.0';
    if (netInfoRes?.version != null) {
        const raw = String(netInfoRes.version).padStart(6, '0');
        const major = String(parseInt(raw.slice(0, 2), 10));
        const minor = String(parseInt(raw.slice(2, 4), 10));
        const rcNum = parseInt(raw.slice(4, 6), 10);
        version = rcNum ? `${major}.${minor}-rc${rcNum}` : `${major}.${minor}`;
    }

    

    const bytesrecv = totalsRes?.totalbytesrecv ? totalsRes.totalbytesrecv / 1000000 : 0;
    const bytessent = totalsRes?.totalbytessent ? totalsRes.totalbytessent / 1000000 : 0;

    return {
        blockheight,
        min_fees,
        med_fees,
        max_fees,
        mempool_max,
        mempool_usage,
        supply,
        txcount,
        halving,
        connections,
        connections_out,
        connections_in,
        localservices,
        localservicesnames,
        networks,
        localaddresses,
        version,
        bytesrecv,
        bytessent,
    };
}

async function main() {
    const { params, select, ready, net, overlay, create, view } = sdk();

    try {
        // Template URL for btc-rpc-explorer API
        const rawUrl = params.getAny('url', 'http://host.docker.internal:3002');
        const url = normalizeBaseUrl(rawUrl);
        const {
            blockheight,
            min_fees,
            med_fees,
            max_fees,
            mempool_max,
            mempool_usage,
            supply,
            txcount,
            halving,
            connections,
            connections_out,
            connections_in,
            localservices,
            localservicesnames,
            networks,
            localaddresses,
            version,
            bytesrecv,
            bytessent,
        } = await getData({ net, url });
        const container = select.id('container');
        const size = params.size;
        const theme = (params.theme || 'light').toLowerCase();
        const classNames = [size, theme];
        if (size === view.BREAKPOINTS.full.name) {
            classNames.push('large');
        }
        container.className = classNames.join(' ');

        const mempoolUsageMb = mempool_usage / 1000000;
        const mempoolMaxMb = mempool_max / 1000000;
        const mempoolPercent = mempool_max > 0 ? Math.min(100, (mempool_usage / mempool_max) * 100) : 0;

        const buildForecast = (rows) => {
            const forecast = create.element('div', { className: 'forecast' });
            for (const [label, value, kind] of rows) {
                const item = create.element('div', { className: `forecast-item${kind ? ` ${kind}` : ''}` });
                const dayLabel = create.element('div', { className: 'day-label' });
                dayLabel.appendChild(create.element('span', { className: 'day-name', textContent: label }));
                const range = create.element('div', { className: 'temp-range' });
                range.appendChild(create.element('span', { className: 'forecast-temp high', textContent: String(value) }));
                if (kind === 'mempool-usage') {
                    const bar = create.element('div', { className: 'usage-bar' });
                    const fill = create.element('div', { className: 'usage-fill' });
                    fill.style.width = `${mempoolPercent.toFixed(1)}%`;
                    bar.appendChild(fill);
                    range.appendChild(bar);
                }
                item.appendChild(dayLabel);
                item.appendChild(range);
                forecast.appendChild(item);
            }
            return forecast;
        };

        const abbreviateServiceName = (name) => {
            const map = {
                NETWORK: 'NET',
                BLOOM: 'BLM',
                WITNESS: 'WIT',
                COMPACT_FILTERS: 'CF',
                NETWORK_LIMITED: 'NET-L',
                P2P_V2: 'P2P2',
            };
            if (map[name]) {
                return map[name];
            }
            return String(name).replace(/_/g, '').slice(0, 4).toUpperCase();
        };

        const buildInfoTable = (rows) => {
            const table = create.element('div', { className: 'info-table' });
            for (const [label, value] of rows) {
                const row = create.element('div', { className: 'info-row' });
                row.appendChild(create.element('div', { className: 'info-label', textContent: label }));
                const valueCell = create.element('div', { className: 'info-value' });
                if (value && typeof value === 'object' && value.nodeType) {
                    valueCell.appendChild(value);
                } else {
                    valueCell.textContent = String(value);
                }
                row.appendChild(valueCell);
                table.appendChild(row);
            }
            return table;
        };

        const localServicesAbbr = localservicesnames.map((name) => abbreviateServiceName(name));
        const localServicesDisplay = localservices
            ? `${localservices}${localServicesAbbr.length ? ` (${localServicesAbbr.join(', ')})` : ''}`
            : localServicesAbbr.length
                ? localServicesAbbr.join(', ')
                : '—';

        const addressList = create.element('div', { className: 'address-list' });
        const addresses = localaddresses
            .map((entry) => {
                if (!entry?.address) {
                    return null;
                }
                return entry.port ? `${entry.address}:${entry.port}` : String(entry.address);
            })
            .filter(Boolean);
        if (addresses.length) {
            for (const address of addresses) {
                addressList.appendChild(create.element('div', { className: 'address-item', textContent: address }));
            }
        } else {
            addressList.appendChild(create.element('div', { className: 'address-item', textContent: '—' }));
        }

        const qrTarget = addresses[0] || '';
        const qrNode = qrTarget ? createQrSvg(qrTarget, 120) : create.element('div', { textContent: '—' });
        if (qrTarget) {
            qrNode.setAttribute('class', 'qr-code');
        }

        const networkOrder = [
            ['ipv4', 'IPv4'],
            ['ipv6', 'IPv6'],
            ['onion', 'Tor'],
            ['i2p', 'I2P'],
            ['cjdns', 'CJDNS'],
        ];
        const networkMap = new Map(networks.map((network) => [network?.name, network]));
        const networkBadges = create.element('div', { className: 'network-badges' });
        for (const [key, label] of networkOrder) {
            const netEntry = networkMap.get(key);
            const reachable = netEntry?.reachable === true;
            const badge = create.element('div', {
                className: `network-badge ${reachable ? 'status-ok' : 'status-no'}`,
            });
            badge.appendChild(create.element('span', { className: 'network-label', textContent: label }));
            badge.appendChild(create.element('span', { className: 'network-status', textContent: reachable ? 'OK' : 'NO' }));
            networkBadges.appendChild(badge);
        }

        //
        // Small
        //
        if (size === view.BREAKPOINTS.small.name) {
            container.appendChild(create.element('div', { className: 'temp', textContent: blockheight }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB` }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Mempool: ${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)} MB` }));
            container.appendChild(create.element('div', { className: 'desc', textContent: `Traffic: ↓ ${bytesrecv.toFixed(0)} | ↑ ${bytessent.toFixed(0)} MB` }));            
        }

        //
        // Medium
        //
        else if (size === view.BREAKPOINTS.medium.name) {
        }

        //
        // Large
        //
        else if (size === view.BREAKPOINTS.large.name) {

            const headline = create.element('div', { className: 'today' });
            const left = create.element('div', { className: 'left' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin Node' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`}));

            const headlineStats = [
                ['Bitcoin Version', version],
                ['Next Halving', halving],
            ];

            for (const [label, value] of headlineStats) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                right.appendChild(statItem);
            }

            headline.appendChild(left);
            headline.appendChild(right);
            container.appendChild(headline);

            const supplyFixed = Number.isFinite(supply) ? supply.toFixed(2) : '0.00';
            const supplyUs = supplyFixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const rows = [
                ['Connections ( ∑ / ↓ / ↑ )', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
                ['Mempool Usage / Max (MB)', `${mempoolUsageMb.toFixed(0)} / ${mempoolMaxMb.toFixed(0)}`, 'mempool-usage'],
                ['Bytes recv / sent (MB)', `${bytesrecv.toFixed(0)} / ${bytessent.toFixed(0)}`],
                ['Coin Supply', supplyUs],
            ];

            container.appendChild(buildForecast(rows));
        }

        //
        // Full
        //
        else if (size === view.BREAKPOINTS.full.name) {
            const layout = create.element('div', { className: 'full-layout' });
            const mainColumn = create.element('div', { className: 'full-main' });
            const sideColumn = create.element('div', { className: 'full-side' });

            const headline = create.element('div', { className: 'today' });
            const left = create.element('div', { className: 'left' });
            const right = create.element('div', { className: 'right' });

            left.appendChild(create.element('div', { className: 'location-header', textContent: 'Bitcoin Node' }));
            left.appendChild(create.element('div', { className: 'temp-large', textContent: blockheight }));
            left.appendChild(create.element('div', { className: 'desc', textContent: `Fees: ${min_fees.toFixed(2)} / ${med_fees.toFixed(2)} / ${max_fees.toFixed(0)} s/vB`}));

            const headlineStatsLeft = [
                ['Bitcoin Version', version],
                ['Blocks Until Next Halving', halving],
            ];

            for (const [label, value] of headlineStatsLeft) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                right.appendChild(statItem);
            }

            headline.appendChild(left);
            headline.appendChild(right);
            mainColumn.appendChild(headline);

            const supplyFixed = Number.isFinite(supply) ? supply.toFixed(2) : '0.00';
            const supplyUs = supplyFixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            const rows = [
                ['Local Services', `${connections} / ${connections_in} / ${connections_out}`],
                ['Mempool Tx Count', txcount],
            ];

            mainColumn.appendChild(buildForecast(rows));

            const sideHeadline = create.element('div', { className: 'today' });
            const sideStats = create.element('div', { className: 'right' });

            const headlineStatsRight = [
                ['Bitcoin Version', version],
                ['Next Halving', halving],
            ];            

            sideHeadline.appendChild(create.element('div', { className: 'location-header', textContent: '' }));
            for (const [label, value] of headlineStatsRight) {
                const statItem = create.element('div', { className: 'stat-item' });
                const statHeader = create.element('div', { className: 'stat-header' });
                statHeader.appendChild(create.element('span', { className: 'stat-label', textContent: label }));
                statItem.appendChild(statHeader);
                statItem.appendChild(create.element('div', { className: 'stat-value', textContent: String(value) }));
                sideStats.appendChild(statItem);
            }
            sideHeadline.appendChild(sideStats);

            sideColumn.appendChild(sideHeadline);
            const infoRows = [
                ['Local Services', localServicesDisplay],
                ['Local Addresses', addressList],
                ['Connect QR', qrNode],
                ['Networks', networkBadges],
            ];
            sideColumn.appendChild(buildInfoTable(infoRows));
            sideColumn.appendChild(buildForecast(rows));

            layout.appendChild(mainColumn);
            layout.appendChild(sideColumn);
            container.appendChild(layout);
        }

        //
        // Failed to match any size
        //
        else {
            container.textContent = `Size "${size}" not implemented yet. Viewport: ${window.innerWidth}x${window.innerHeight}`;
            container.style.fontSize = '24px';
        }
    } catch (error) {
        console.error('Error fetching bitcoin data:', error);
        overlay.showError(error.message || 'Unexpected error while loading bitcoin data.');
    } finally {
        ready();
    }
}

main();
