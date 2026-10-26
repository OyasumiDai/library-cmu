import {
  cancelRequest,
  myLoans
} from "./chunks/chunk-OAO6RVBP.js";
import {
  cover,
  empty,
  loading,
  statusBadge
} from "./chunks/chunk-YFDTB4J4.js";
import {
  __commonJS,
  __toESM,
  actions,
  boot,
  confirmBox,
  current,
  dueLabel,
  fail,
  formatDate,
  friendly,
  html,
  icon,
  mount,
  ok,
  openModal,
  plural,
  publicSettings,
  qs,
  reveal,
  settingNumber
} from "./chunks/chunk-EIGZ5BRM.js";

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports, module) {
    module.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row2, col, value, reserved) {
      const index = row2 * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row2, col) {
      return this.data[row2 * this.size + col];
    };
    BitMatrix.prototype.xor = function(row2, col, value) {
      this.data[row2 * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row2, col) {
      return this.reservedBit[row2 * this.size + col];
    };
    module.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row2 = 0; row2 < size; row2++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module2 = data.get(row2, col);
          if (module2 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module2;
            sameCountCol = 1;
          }
          module2 = data.get(col, row2);
          if (module2 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module2;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row2 = 0; row2 < size - 1; row2++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row2, col) + data.get(row2, col + 1) + data.get(row2 + 1, col) + data.get(row2 + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row2 = 0; row2 < size; row2++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row2, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row2);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row2 = 0; row2 < size; row2++) {
          if (data.isReserved(row2, col)) continue;
          data.xor(row2, col, getMaskAt(pattern, row2, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module !== "undefined") {
      module.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row2 = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row2 + r <= -1 || size <= row2 + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row2 + r, col + c, true, true);
            } else {
              matrix.set(row2 + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row2 = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row2 + r, col + c, true, true);
            } else {
              matrix.set(row2 + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row2, col, mod;
      for (let i = 0; i < 18; i++) {
        row2 = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row2, col, mod, true);
        matrix.set(col, row2, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row2 = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row2, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row2, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row2 += inc;
          if (row2 < 0 || size <= row2) {
            row2 -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row2 = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row2 + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports.create = QRCode2.create;
    exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// src/ts/pages/borrowing.ts
var import_qrcode = __toESM(require_browser(), 1);
var TABS = [
  { id: "active", label: "Now", statuses: ["requested", "borrowed"] },
  { id: "history", label: "History", statuses: ["returned", "rejected", "cancelled"] }
];
var loans = [];
var tab = "active";
function row(loan) {
  const due = loan.status === "borrowed" ? dueLabel(loan.due_at) : null;
  return html`
    <article class="loan-row card px" data-reveal>
      ${loan.book ? cover({ id: loan.book.id, title: loan.book.title, cover_url: loan.book.cover_url }) : ""}
      <div>
        <h3 class="card__title">${loan.book?.title ?? "Removed book"} ${statusBadge(loan.status)}</h3>
        <p class="card__meta">${loan.book?.author ?? ""}</p>
        <p class="card__meta">Requested ${formatDate(loan.requested_at)}${loan.returned_at ? ` \xB7 Returned ${formatDate(loan.returned_at)}` : ""}</p>
        ${due ? html`<span class="badge badge--${due.tone}">${due.text}</span>` : ""}
        ${loan.note ? html`<p class="card__meta">Note: ${loan.note}</p>` : ""}
      </div>
      <div class="table__actions">${loan.pickup_code && (loan.status === "requested" || loan.status === "borrowed") ? html`<button class="btn btn--sm btn--accent" type="button" data-action="qr" data-id="${loan.id}">${icon("qr")} My QR</button>` : ""}${loan.status === "requested" ? html`<button class="btn btn--sm btn--danger px" type="button" data-action="cancel" data-id="${loan.id}">Cancel</button>` : ""}</div>
    </article>`;
}
function draw() {
  const counts = Object.fromEntries(TABS.map((t) => [t.id, loans.filter((l) => t.statuses.includes(l.status)).length]));
  mount(qs("#loanTabs"), html`${TABS.map((t) => html`<button class="tab" role="tab" type="button" data-action="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.label} <span class="tab__count">${counts[t.id]}</span></button>`)}`);
  const shown = loans.filter((l) => TABS.find((t) => t.id === tab).statuses.includes(l.status));
  const list = qs("#loanList");
  mount(list, shown.length ? html`<div class="stack">${shown.map(row)}</div>` : empty(tab === "active" ? "No books right now" : "No history yet", tab === "active" ? "Pick something from the catalog." : "Returned and declined books show up here."));
  reveal(list);
}
async function load() {
  mount(qs("#loanList"), loading("Checking your shelf"));
  loans = await myLoans(current().profile.id);
  draw();
}
boot(async () => {
  const settings = await publicSettings();
  const max = settingNumber(settings, "max_loans", 3);
  const days = settingNumber(settings, "loan_days", 7);
  qs("#limitNote").textContent = `Up to ${plural(max, "book")} at a time, ${plural(days, "day")} each.`;
  actions(qs("[data-page-root]"), {
    tab: (el) => {
      tab = el.dataset.tab;
      draw();
    },
    // the ONE QR the library desk scans for all of the student's books; the same one is in the email
    qr: async (el) => {
      const loan = loans.find((l) => l.id === Number(el.dataset.id));
      if (!loan?.pickup_code) return;
      const image = await import_qrcode.default.toDataURL(`${location.origin}/pickup?c=${loan.pickup_code}`, { margin: 1, width: 360, errorCorrectionLevel: "M", color: { dark: "#0b1f5c", light: "#ffffff" } });
      const mine = loans.filter((l) => l.status === "requested" || l.status === "borrowed");
      openModal("My pickup QR", html`<div class="qr-modal"><img src="${image}" alt="QR code for ${loan.pickup_code}"><span class="qr-modal__code mono">${loan.pickup_code}</span>
        <p class="text-soft">One QR for all your books. Show it at the library desk and staff scan it once.</p>
        <ul class="list">${mine.map((l) => html`<li class="list__item"><div class="list__body"><p class="list__title">${l.book?.title ?? "Book"}</p><p class="list__meta">${l.status === "requested" ? "Reserved, waiting for pickup" : "Borrowed"}</p></div></li>`)}</ul></div>`, { footer: html`<button class="btn" type="button" data-close>Done</button>` });
    },
    cancel: async (el) => {
      if (!await confirmBox("Cancel this request?", "The book goes back on the shelf for others.", "Cancel request", true)) return;
      try {
        await cancelRequest(Number(el.dataset.id));
        ok("Request cancelled.");
        await load();
      } catch (error) {
        fail(friendly(error));
      }
    }
  });
  await load();
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY2FuLXByb21pc2UuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS91dGlscy5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcXJjb2RlL2xpYi9jb3JlL2Vycm9yLWNvcnJlY3Rpb24tbGV2ZWwuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9iaXQtYnVmZmVyLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvYml0LW1hdHJpeC5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcXJjb2RlL2xpYi9jb3JlL2FsaWdubWVudC1wYXR0ZXJuLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvZmluZGVyLXBhdHRlcm4uanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9tYXNrLXBhdHRlcm4uanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9lcnJvci1jb3JyZWN0aW9uLWNvZGUuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9nYWxvaXMtZmllbGQuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9wb2x5bm9taWFsLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvcmVlZC1zb2xvbW9uLWVuY29kZXIuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS92ZXJzaW9uLWNoZWNrLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvcmVnZXguanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9tb2RlLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvdmVyc2lvbi5qcyIsICIuLi8uLi8uLi9ub2RlX21vZHVsZXMvcXJjb2RlL2xpYi9jb3JlL2Zvcm1hdC1pbmZvLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvbnVtZXJpYy1kYXRhLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvYWxwaGFudW1lcmljLWRhdGEuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9ieXRlLWRhdGEuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9rYW5qaS1kYXRhLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9kaWprc3RyYWpzL2RpamtzdHJhLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL2NvcmUvc2VnbWVudHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvY29yZS9xcmNvZGUuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvcmVuZGVyZXIvdXRpbHMuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvcmVuZGVyZXIvY2FudmFzLmpzIiwgIi4uLy4uLy4uL25vZGVfbW9kdWxlcy9xcmNvZGUvbGliL3JlbmRlcmVyL3N2Zy10YWcuanMiLCAiLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3FyY29kZS9saWIvYnJvd3Nlci5qcyIsICIuLi8uLi8uLi9zcmMvdHMvcGFnZXMvYm9ycm93aW5nLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBjYW4tcHJvbWlzZSBoYXMgYSBjcmFzaCBpbiBzb21lIHZlcnNpb25zIG9mIHJlYWN0IG5hdGl2ZSB0aGF0IGRvbnQgaGF2ZVxuLy8gc3RhbmRhcmQgZ2xvYmFsIG9iamVjdHNcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2xkYWlyL25vZGUtcXJjb2RlL2lzc3Vlcy8xNTdcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0eXBlb2YgUHJvbWlzZSA9PT0gJ2Z1bmN0aW9uJyAmJiBQcm9taXNlLnByb3RvdHlwZSAmJiBQcm9taXNlLnByb3RvdHlwZS50aGVuXG59XG4iLCAibGV0IHRvU0pJU0Z1bmN0aW9uXG5jb25zdCBDT0RFV09SRFNfQ09VTlQgPSBbXG4gIDAsIC8vIE5vdCB1c2VkXG4gIDI2LCA0NCwgNzAsIDEwMCwgMTM0LCAxNzIsIDE5NiwgMjQyLCAyOTIsIDM0NixcbiAgNDA0LCA0NjYsIDUzMiwgNTgxLCA2NTUsIDczMywgODE1LCA5MDEsIDk5MSwgMTA4NSxcbiAgMTE1NiwgMTI1OCwgMTM2NCwgMTQ3NCwgMTU4OCwgMTcwNiwgMTgyOCwgMTkyMSwgMjA1MSwgMjE4NSxcbiAgMjMyMywgMjQ2NSwgMjYxMSwgMjc2MSwgMjg3NiwgMzAzNCwgMzE5NiwgMzM2MiwgMzUzMiwgMzcwNlxuXVxuXG4vKipcbiAqIFJldHVybnMgdGhlIFFSIENvZGUgc2l6ZSBmb3IgdGhlIHNwZWNpZmllZCB2ZXJzaW9uXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB2ZXJzaW9uIFFSIENvZGUgdmVyc2lvblxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgIHNpemUgb2YgUVIgY29kZVxuICovXG5leHBvcnRzLmdldFN5bWJvbFNpemUgPSBmdW5jdGlvbiBnZXRTeW1ib2xTaXplICh2ZXJzaW9uKSB7XG4gIGlmICghdmVyc2lvbikgdGhyb3cgbmV3IEVycm9yKCdcInZlcnNpb25cIiBjYW5ub3QgYmUgbnVsbCBvciB1bmRlZmluZWQnKVxuICBpZiAodmVyc2lvbiA8IDEgfHwgdmVyc2lvbiA+IDQwKSB0aHJvdyBuZXcgRXJyb3IoJ1widmVyc2lvblwiIHNob3VsZCBiZSBpbiByYW5nZSBmcm9tIDEgdG8gNDAnKVxuICByZXR1cm4gdmVyc2lvbiAqIDQgKyAxN1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIHRvdGFsIG51bWJlciBvZiBjb2Rld29yZHMgdXNlZCB0byBzdG9yZSBkYXRhIGFuZCBFQyBpbmZvcm1hdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHZlcnNpb24gUVIgQ29kZSB2ZXJzaW9uXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgRGF0YSBsZW5ndGggaW4gYml0c1xuICovXG5leHBvcnRzLmdldFN5bWJvbFRvdGFsQ29kZXdvcmRzID0gZnVuY3Rpb24gZ2V0U3ltYm9sVG90YWxDb2Rld29yZHMgKHZlcnNpb24pIHtcbiAgcmV0dXJuIENPREVXT1JEU19DT1VOVFt2ZXJzaW9uXVxufVxuXG4vKipcbiAqIEVuY29kZSBkYXRhIHdpdGggQm9zZS1DaGF1ZGh1cmktSG9jcXVlbmdoZW1cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRhdGEgVmFsdWUgdG8gZW5jb2RlXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgRW5jb2RlZCB2YWx1ZVxuICovXG5leHBvcnRzLmdldEJDSERpZ2l0ID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgbGV0IGRpZ2l0ID0gMFxuXG4gIHdoaWxlIChkYXRhICE9PSAwKSB7XG4gICAgZGlnaXQrK1xuICAgIGRhdGEgPj4+PSAxXG4gIH1cblxuICByZXR1cm4gZGlnaXRcbn1cblxuZXhwb3J0cy5zZXRUb1NKSVNGdW5jdGlvbiA9IGZ1bmN0aW9uIHNldFRvU0pJU0Z1bmN0aW9uIChmKSB7XG4gIGlmICh0eXBlb2YgZiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBFcnJvcignXCJ0b1NKSVNGdW5jXCIgaXMgbm90IGEgdmFsaWQgZnVuY3Rpb24uJylcbiAgfVxuXG4gIHRvU0pJU0Z1bmN0aW9uID0gZlxufVxuXG5leHBvcnRzLmlzS2FuamlNb2RlRW5hYmxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHR5cGVvZiB0b1NKSVNGdW5jdGlvbiAhPT0gJ3VuZGVmaW5lZCdcbn1cblxuZXhwb3J0cy50b1NKSVMgPSBmdW5jdGlvbiB0b1NKSVMgKGthbmppKSB7XG4gIHJldHVybiB0b1NKSVNGdW5jdGlvbihrYW5qaSlcbn1cbiIsICJleHBvcnRzLkwgPSB7IGJpdDogMSB9XG5leHBvcnRzLk0gPSB7IGJpdDogMCB9XG5leHBvcnRzLlEgPSB7IGJpdDogMyB9XG5leHBvcnRzLkggPSB7IGJpdDogMiB9XG5cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmFtIGlzIG5vdCBhIHN0cmluZycpXG4gIH1cblxuICBjb25zdCBsY1N0ciA9IHN0cmluZy50b0xvd2VyQ2FzZSgpXG5cbiAgc3dpdGNoIChsY1N0cikge1xuICAgIGNhc2UgJ2wnOlxuICAgIGNhc2UgJ2xvdyc6XG4gICAgICByZXR1cm4gZXhwb3J0cy5MXG5cbiAgICBjYXNlICdtJzpcbiAgICBjYXNlICdtZWRpdW0nOlxuICAgICAgcmV0dXJuIGV4cG9ydHMuTVxuXG4gICAgY2FzZSAncSc6XG4gICAgY2FzZSAncXVhcnRpbGUnOlxuICAgICAgcmV0dXJuIGV4cG9ydHMuUVxuXG4gICAgY2FzZSAnaCc6XG4gICAgY2FzZSAnaGlnaCc6XG4gICAgICByZXR1cm4gZXhwb3J0cy5IXG5cbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIEVDIExldmVsOiAnICsgc3RyaW5nKVxuICB9XG59XG5cbmV4cG9ydHMuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQgKGxldmVsKSB7XG4gIHJldHVybiBsZXZlbCAmJiB0eXBlb2YgbGV2ZWwuYml0ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIGxldmVsLmJpdCA+PSAwICYmIGxldmVsLmJpdCA8IDRcbn1cblxuZXhwb3J0cy5mcm9tID0gZnVuY3Rpb24gZnJvbSAodmFsdWUsIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAoZXhwb3J0cy5pc1ZhbGlkKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZnJvbVN0cmluZyh2YWx1ZSlcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBkZWZhdWx0VmFsdWVcbiAgfVxufVxuIiwgImZ1bmN0aW9uIEJpdEJ1ZmZlciAoKSB7XG4gIHRoaXMuYnVmZmVyID0gW11cbiAgdGhpcy5sZW5ndGggPSAwXG59XG5cbkJpdEJ1ZmZlci5wcm90b3R5cGUgPSB7XG5cbiAgZ2V0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICBjb25zdCBidWZJbmRleCA9IE1hdGguZmxvb3IoaW5kZXggLyA4KVxuICAgIHJldHVybiAoKHRoaXMuYnVmZmVyW2J1ZkluZGV4XSA+Pj4gKDcgLSBpbmRleCAlIDgpKSAmIDEpID09PSAxXG4gIH0sXG5cbiAgcHV0OiBmdW5jdGlvbiAobnVtLCBsZW5ndGgpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnB1dEJpdCgoKG51bSA+Pj4gKGxlbmd0aCAtIGkgLSAxKSkgJiAxKSA9PT0gMSlcbiAgICB9XG4gIH0sXG5cbiAgZ2V0TGVuZ3RoSW5CaXRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMubGVuZ3RoXG4gIH0sXG5cbiAgcHV0Qml0OiBmdW5jdGlvbiAoYml0KSB7XG4gICAgY29uc3QgYnVmSW5kZXggPSBNYXRoLmZsb29yKHRoaXMubGVuZ3RoIC8gOClcbiAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoIDw9IGJ1ZkluZGV4KSB7XG4gICAgICB0aGlzLmJ1ZmZlci5wdXNoKDApXG4gICAgfVxuXG4gICAgaWYgKGJpdCkge1xuICAgICAgdGhpcy5idWZmZXJbYnVmSW5kZXhdIHw9ICgweDgwID4+PiAodGhpcy5sZW5ndGggJSA4KSlcbiAgICB9XG5cbiAgICB0aGlzLmxlbmd0aCsrXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCaXRCdWZmZXJcbiIsICIvKipcbiAqIEhlbHBlciBjbGFzcyB0byBoYW5kbGUgUVIgQ29kZSBzeW1ib2wgbW9kdWxlc1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBzaXplIFN5bWJvbCBzaXplXG4gKi9cbmZ1bmN0aW9uIEJpdE1hdHJpeCAoc2l6ZSkge1xuICBpZiAoIXNpemUgfHwgc2l6ZSA8IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0JpdE1hdHJpeCBzaXplIG11c3QgYmUgZGVmaW5lZCBhbmQgZ3JlYXRlciB0aGFuIDAnKVxuICB9XG5cbiAgdGhpcy5zaXplID0gc2l6ZVxuICB0aGlzLmRhdGEgPSBuZXcgVWludDhBcnJheShzaXplICogc2l6ZSlcbiAgdGhpcy5yZXNlcnZlZEJpdCA9IG5ldyBVaW50OEFycmF5KHNpemUgKiBzaXplKVxufVxuXG4vKipcbiAqIFNldCBiaXQgdmFsdWUgYXQgc3BlY2lmaWVkIGxvY2F0aW9uXG4gKiBJZiByZXNlcnZlZCBmbGFnIGlzIHNldCwgdGhpcyBiaXQgd2lsbCBiZSBpZ25vcmVkIGR1cmluZyBtYXNraW5nIHByb2Nlc3NcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gIHJvd1xuICogQHBhcmFtIHtOdW1iZXJ9ICBjb2xcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdmFsdWVcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVzZXJ2ZWRcbiAqL1xuQml0TWF0cml4LnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocm93LCBjb2wsIHZhbHVlLCByZXNlcnZlZCkge1xuICBjb25zdCBpbmRleCA9IHJvdyAqIHRoaXMuc2l6ZSArIGNvbFxuICB0aGlzLmRhdGFbaW5kZXhdID0gdmFsdWVcbiAgaWYgKHJlc2VydmVkKSB0aGlzLnJlc2VydmVkQml0W2luZGV4XSA9IHRydWVcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGJpdCB2YWx1ZSBhdCBzcGVjaWZpZWQgbG9jYXRpb25cbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICByb3dcbiAqIEBwYXJhbSAge051bWJlcn0gIGNvbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuQml0TWF0cml4LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAocm93LCBjb2wpIHtcbiAgcmV0dXJuIHRoaXMuZGF0YVtyb3cgKiB0aGlzLnNpemUgKyBjb2xdXG59XG5cbi8qKlxuICogQXBwbGllcyB4b3Igb3BlcmF0b3IgYXQgc3BlY2lmaWVkIGxvY2F0aW9uXG4gKiAodXNlZCBkdXJpbmcgbWFza2luZyBwcm9jZXNzKVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSAgcm93XG4gKiBAcGFyYW0ge051bWJlcn0gIGNvbFxuICogQHBhcmFtIHtCb29sZWFufSB2YWx1ZVxuICovXG5CaXRNYXRyaXgucHJvdG90eXBlLnhvciA9IGZ1bmN0aW9uIChyb3csIGNvbCwgdmFsdWUpIHtcbiAgdGhpcy5kYXRhW3JvdyAqIHRoaXMuc2l6ZSArIGNvbF0gXj0gdmFsdWVcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBiaXQgYXQgc3BlY2lmaWVkIGxvY2F0aW9uIGlzIHJlc2VydmVkXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9ICAgcm93XG4gKiBAcGFyYW0ge051bWJlcn0gICBjb2xcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbkJpdE1hdHJpeC5wcm90b3R5cGUuaXNSZXNlcnZlZCA9IGZ1bmN0aW9uIChyb3csIGNvbCkge1xuICByZXR1cm4gdGhpcy5yZXNlcnZlZEJpdFtyb3cgKiB0aGlzLnNpemUgKyBjb2xdXG59XG5cbm1vZHVsZS5leHBvcnRzID0gQml0TWF0cml4XG4iLCAiLyoqXG4gKiBBbGlnbm1lbnQgcGF0dGVybiBhcmUgZml4ZWQgcmVmZXJlbmNlIHBhdHRlcm4gaW4gZGVmaW5lZCBwb3NpdGlvbnNcbiAqIGluIGEgbWF0cml4IHN5bWJvbG9neSwgd2hpY2ggZW5hYmxlcyB0aGUgZGVjb2RlIHNvZnR3YXJlIHRvIHJlLXN5bmNocm9uaXNlXG4gKiB0aGUgY29vcmRpbmF0ZSBtYXBwaW5nIG9mIHRoZSBpbWFnZSBtb2R1bGVzIGluIHRoZSBldmVudCBvZiBtb2RlcmF0ZSBhbW91bnRzXG4gKiBvZiBkaXN0b3J0aW9uIG9mIHRoZSBpbWFnZS5cbiAqXG4gKiBBbGlnbm1lbnQgcGF0dGVybnMgYXJlIHByZXNlbnQgb25seSBpbiBRUiBDb2RlIHN5bWJvbHMgb2YgdmVyc2lvbiAyIG9yIGxhcmdlclxuICogYW5kIHRoZWlyIG51bWJlciBkZXBlbmRzIG9uIHRoZSBzeW1ib2wgdmVyc2lvbi5cbiAqL1xuXG5jb25zdCBnZXRTeW1ib2xTaXplID0gcmVxdWlyZSgnLi91dGlscycpLmdldFN5bWJvbFNpemVcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIHJvdy9jb2x1bW4gY29vcmRpbmF0ZXMgb2YgdGhlIGNlbnRlciBtb2R1bGUgb2YgZWFjaCBhbGlnbm1lbnQgcGF0dGVyblxuICogZm9yIHRoZSBzcGVjaWZpZWQgUVIgQ29kZSB2ZXJzaW9uLlxuICpcbiAqIFRoZSBhbGlnbm1lbnQgcGF0dGVybnMgYXJlIHBvc2l0aW9uZWQgc3ltbWV0cmljYWxseSBvbiBlaXRoZXIgc2lkZSBvZiB0aGUgZGlhZ29uYWxcbiAqIHJ1bm5pbmcgZnJvbSB0aGUgdG9wIGxlZnQgY29ybmVyIG9mIHRoZSBzeW1ib2wgdG8gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIuXG4gKlxuICogU2luY2UgcG9zaXRpb25zIGFyZSBzaW1tZXRyaWNhbCBvbmx5IGhhbGYgb2YgdGhlIGNvb3JkaW5hdGVzIGFyZSByZXR1cm5lZC5cbiAqIEVhY2ggaXRlbSBvZiB0aGUgYXJyYXkgd2lsbCByZXByZXNlbnQgaW4gdHVybiB0aGUgeCBhbmQgeSBjb29yZGluYXRlLlxuICogQHNlZSB7QGxpbmsgZ2V0UG9zaXRpb25zfVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICBBcnJheSBvZiBjb29yZGluYXRlXG4gKi9cbmV4cG9ydHMuZ2V0Um93Q29sQ29vcmRzID0gZnVuY3Rpb24gZ2V0Um93Q29sQ29vcmRzICh2ZXJzaW9uKSB7XG4gIGlmICh2ZXJzaW9uID09PSAxKSByZXR1cm4gW11cblxuICBjb25zdCBwb3NDb3VudCA9IE1hdGguZmxvb3IodmVyc2lvbiAvIDcpICsgMlxuICBjb25zdCBzaXplID0gZ2V0U3ltYm9sU2l6ZSh2ZXJzaW9uKVxuICBjb25zdCBpbnRlcnZhbHMgPSBzaXplID09PSAxNDUgPyAyNiA6IE1hdGguY2VpbCgoc2l6ZSAtIDEzKSAvICgyICogcG9zQ291bnQgLSAyKSkgKiAyXG4gIGNvbnN0IHBvc2l0aW9ucyA9IFtzaXplIC0gN10gLy8gTGFzdCBjb29yZCBpcyBhbHdheXMgKHNpemUgLSA3KVxuXG4gIGZvciAobGV0IGkgPSAxOyBpIDwgcG9zQ291bnQgLSAxOyBpKyspIHtcbiAgICBwb3NpdGlvbnNbaV0gPSBwb3NpdGlvbnNbaSAtIDFdIC0gaW50ZXJ2YWxzXG4gIH1cblxuICBwb3NpdGlvbnMucHVzaCg2KSAvLyBGaXJzdCBjb29yZCBpcyBhbHdheXMgNlxuXG4gIHJldHVybiBwb3NpdGlvbnMucmV2ZXJzZSgpXG59XG5cbi8qKlxuICogUmV0dXJucyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBwb3NpdGlvbnMgb2YgZWFjaCBhbGlnbm1lbnQgcGF0dGVybi5cbiAqIEVhY2ggYXJyYXkncyBlbGVtZW50IHJlcHJlc2VudCB0aGUgY2VudGVyIHBvaW50IG9mIHRoZSBwYXR0ZXJuIGFzICh4LCB5KSBjb29yZGluYXRlc1xuICpcbiAqIENvb3JkaW5hdGVzIGFyZSBjYWxjdWxhdGVkIGV4cGFuZGluZyB0aGUgcm93L2NvbHVtbiBjb29yZGluYXRlcyByZXR1cm5lZCBieSB7QGxpbmsgZ2V0Um93Q29sQ29vcmRzfVxuICogYW5kIGZpbHRlcmluZyBvdXQgdGhlIGl0ZW1zIHRoYXQgb3ZlcmxhcHMgd2l0aCBmaW5kZXIgcGF0dGVyblxuICpcbiAqIEBleGFtcGxlXG4gKiBGb3IgYSBWZXJzaW9uIDcgc3ltYm9sIHtAbGluayBnZXRSb3dDb2xDb29yZHN9IHJldHVybnMgdmFsdWVzIDYsIDIyIGFuZCAzOC5cbiAqIFRoZSBhbGlnbm1lbnQgcGF0dGVybnMsIHRoZXJlZm9yZSwgYXJlIHRvIGJlIGNlbnRlcmVkIG9uIChyb3csIGNvbHVtbilcbiAqIHBvc2l0aW9ucyAoNiwyMiksICgyMiw2KSwgKDIyLDIyKSwgKDIyLDM4KSwgKDM4LDIyKSwgKDM4LDM4KS5cbiAqIE5vdGUgdGhhdCB0aGUgY29vcmRpbmF0ZXMgKDYsNiksICg2LDM4KSwgKDM4LDYpIGFyZSBvY2N1cGllZCBieSBmaW5kZXIgcGF0dGVybnNcbiAqIGFuZCBhcmUgbm90IHRoZXJlZm9yZSB1c2VkIGZvciBhbGlnbm1lbnQgcGF0dGVybnMuXG4gKlxuICogbGV0IHBvcyA9IGdldFBvc2l0aW9ucyg3KVxuICogLy8gW1s2LDIyXSwgWzIyLDZdLCBbMjIsMjJdLCBbMjIsMzhdLCBbMzgsMjJdLCBbMzgsMzhdXVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICBBcnJheSBvZiBjb29yZGluYXRlc1xuICovXG5leHBvcnRzLmdldFBvc2l0aW9ucyA9IGZ1bmN0aW9uIGdldFBvc2l0aW9ucyAodmVyc2lvbikge1xuICBjb25zdCBjb29yZHMgPSBbXVxuICBjb25zdCBwb3MgPSBleHBvcnRzLmdldFJvd0NvbENvb3Jkcyh2ZXJzaW9uKVxuICBjb25zdCBwb3NMZW5ndGggPSBwb3MubGVuZ3RoXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwb3NMZW5ndGg7IGkrKykge1xuICAgIGZvciAobGV0IGogPSAwOyBqIDwgcG9zTGVuZ3RoOyBqKyspIHtcbiAgICAgIC8vIFNraXAgaWYgcG9zaXRpb24gaXMgb2NjdXBpZWQgYnkgZmluZGVyIHBhdHRlcm5zXG4gICAgICBpZiAoKGkgPT09IDAgJiYgaiA9PT0gMCkgfHwgLy8gdG9wLWxlZnRcbiAgICAgICAgICAoaSA9PT0gMCAmJiBqID09PSBwb3NMZW5ndGggLSAxKSB8fCAvLyBib3R0b20tbGVmdFxuICAgICAgICAgIChpID09PSBwb3NMZW5ndGggLSAxICYmIGogPT09IDApKSB7IC8vIHRvcC1yaWdodFxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBjb29yZHMucHVzaChbcG9zW2ldLCBwb3Nbal1dKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb29yZHNcbn1cbiIsICJjb25zdCBnZXRTeW1ib2xTaXplID0gcmVxdWlyZSgnLi91dGlscycpLmdldFN5bWJvbFNpemVcbmNvbnN0IEZJTkRFUl9QQVRURVJOX1NJWkUgPSA3XG5cbi8qKlxuICogUmV0dXJucyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBwb3NpdGlvbnMgb2YgZWFjaCBmaW5kZXIgcGF0dGVybi5cbiAqIEVhY2ggYXJyYXkncyBlbGVtZW50IHJlcHJlc2VudCB0aGUgdG9wLWxlZnQgcG9pbnQgb2YgdGhlIHBhdHRlcm4gYXMgKHgsIHkpIGNvb3JkaW5hdGVzXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB2ZXJzaW9uIFFSIENvZGUgdmVyc2lvblxuICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgIEFycmF5IG9mIGNvb3JkaW5hdGVzXG4gKi9cbmV4cG9ydHMuZ2V0UG9zaXRpb25zID0gZnVuY3Rpb24gZ2V0UG9zaXRpb25zICh2ZXJzaW9uKSB7XG4gIGNvbnN0IHNpemUgPSBnZXRTeW1ib2xTaXplKHZlcnNpb24pXG5cbiAgcmV0dXJuIFtcbiAgICAvLyB0b3AtbGVmdFxuICAgIFswLCAwXSxcbiAgICAvLyB0b3AtcmlnaHRcbiAgICBbc2l6ZSAtIEZJTkRFUl9QQVRURVJOX1NJWkUsIDBdLFxuICAgIC8vIGJvdHRvbS1sZWZ0XG4gICAgWzAsIHNpemUgLSBGSU5ERVJfUEFUVEVSTl9TSVpFXVxuICBdXG59XG4iLCAiLyoqXG4gKiBEYXRhIG1hc2sgcGF0dGVybiByZWZlcmVuY2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuUGF0dGVybnMgPSB7XG4gIFBBVFRFUk4wMDA6IDAsXG4gIFBBVFRFUk4wMDE6IDEsXG4gIFBBVFRFUk4wMTA6IDIsXG4gIFBBVFRFUk4wMTE6IDMsXG4gIFBBVFRFUk4xMDA6IDQsXG4gIFBBVFRFUk4xMDE6IDUsXG4gIFBBVFRFUk4xMTA6IDYsXG4gIFBBVFRFUk4xMTE6IDdcbn1cblxuLyoqXG4gKiBXZWlnaHRlZCBwZW5hbHR5IHNjb3JlcyBmb3IgdGhlIHVuZGVzaXJhYmxlIGZlYXR1cmVzXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5jb25zdCBQZW5hbHR5U2NvcmVzID0ge1xuICBOMTogMyxcbiAgTjI6IDMsXG4gIE4zOiA0MCxcbiAgTjQ6IDEwXG59XG5cbi8qKlxuICogQ2hlY2sgaWYgbWFzayBwYXR0ZXJuIHZhbHVlIGlzIHZhbGlkXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgbWFzayAgICBNYXNrIHBhdHRlcm5cbiAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgdHJ1ZSBpZiB2YWxpZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbmV4cG9ydHMuaXNWYWxpZCA9IGZ1bmN0aW9uIGlzVmFsaWQgKG1hc2spIHtcbiAgcmV0dXJuIG1hc2sgIT0gbnVsbCAmJiBtYXNrICE9PSAnJyAmJiAhaXNOYU4obWFzaykgJiYgbWFzayA+PSAwICYmIG1hc2sgPD0gN1xufVxuXG4vKipcbiAqIFJldHVybnMgbWFzayBwYXR0ZXJuIGZyb20gYSB2YWx1ZS5cbiAqIElmIHZhbHVlIGlzIG5vdCB2YWxpZCwgcmV0dXJucyB1bmRlZmluZWRcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ8U3RyaW5nfSB2YWx1ZSAgICAgICAgTWFzayBwYXR0ZXJuIHZhbHVlXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgICAgICAgICAgICAgVmFsaWQgbWFzayBwYXR0ZXJuIG9yIHVuZGVmaW5lZFxuICovXG5leHBvcnRzLmZyb20gPSBmdW5jdGlvbiBmcm9tICh2YWx1ZSkge1xuICByZXR1cm4gZXhwb3J0cy5pc1ZhbGlkKHZhbHVlKSA/IHBhcnNlSW50KHZhbHVlLCAxMCkgOiB1bmRlZmluZWRcbn1cblxuLyoqXG4qIEZpbmQgYWRqYWNlbnQgbW9kdWxlcyBpbiByb3cvY29sdW1uIHdpdGggdGhlIHNhbWUgY29sb3JcbiogYW5kIGFzc2lnbiBhIHBlbmFsdHkgdmFsdWUuXG4qXG4qIFBvaW50czogTjEgKyBpXG4qIGkgaXMgdGhlIGFtb3VudCBieSB3aGljaCB0aGUgbnVtYmVyIG9mIGFkamFjZW50IG1vZHVsZXMgb2YgdGhlIHNhbWUgY29sb3IgZXhjZWVkcyA1XG4qL1xuZXhwb3J0cy5nZXRQZW5hbHR5TjEgPSBmdW5jdGlvbiBnZXRQZW5hbHR5TjEgKGRhdGEpIHtcbiAgY29uc3Qgc2l6ZSA9IGRhdGEuc2l6ZVxuICBsZXQgcG9pbnRzID0gMFxuICBsZXQgc2FtZUNvdW50Q29sID0gMFxuICBsZXQgc2FtZUNvdW50Um93ID0gMFxuICBsZXQgbGFzdENvbCA9IG51bGxcbiAgbGV0IGxhc3RSb3cgPSBudWxsXG5cbiAgZm9yIChsZXQgcm93ID0gMDsgcm93IDwgc2l6ZTsgcm93KyspIHtcbiAgICBzYW1lQ291bnRDb2wgPSBzYW1lQ291bnRSb3cgPSAwXG4gICAgbGFzdENvbCA9IGxhc3RSb3cgPSBudWxsXG5cbiAgICBmb3IgKGxldCBjb2wgPSAwOyBjb2wgPCBzaXplOyBjb2wrKykge1xuICAgICAgbGV0IG1vZHVsZSA9IGRhdGEuZ2V0KHJvdywgY29sKVxuICAgICAgaWYgKG1vZHVsZSA9PT0gbGFzdENvbCkge1xuICAgICAgICBzYW1lQ291bnRDb2wrK1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHNhbWVDb3VudENvbCA+PSA1KSBwb2ludHMgKz0gUGVuYWx0eVNjb3Jlcy5OMSArIChzYW1lQ291bnRDb2wgLSA1KVxuICAgICAgICBsYXN0Q29sID0gbW9kdWxlXG4gICAgICAgIHNhbWVDb3VudENvbCA9IDFcbiAgICAgIH1cblxuICAgICAgbW9kdWxlID0gZGF0YS5nZXQoY29sLCByb3cpXG4gICAgICBpZiAobW9kdWxlID09PSBsYXN0Um93KSB7XG4gICAgICAgIHNhbWVDb3VudFJvdysrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc2FtZUNvdW50Um93ID49IDUpIHBvaW50cyArPSBQZW5hbHR5U2NvcmVzLk4xICsgKHNhbWVDb3VudFJvdyAtIDUpXG4gICAgICAgIGxhc3RSb3cgPSBtb2R1bGVcbiAgICAgICAgc2FtZUNvdW50Um93ID0gMVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzYW1lQ291bnRDb2wgPj0gNSkgcG9pbnRzICs9IFBlbmFsdHlTY29yZXMuTjEgKyAoc2FtZUNvdW50Q29sIC0gNSlcbiAgICBpZiAoc2FtZUNvdW50Um93ID49IDUpIHBvaW50cyArPSBQZW5hbHR5U2NvcmVzLk4xICsgKHNhbWVDb3VudFJvdyAtIDUpXG4gIH1cblxuICByZXR1cm4gcG9pbnRzXG59XG5cbi8qKlxuICogRmluZCAyeDIgYmxvY2tzIHdpdGggdGhlIHNhbWUgY29sb3IgYW5kIGFzc2lnbiBhIHBlbmFsdHkgdmFsdWVcbiAqXG4gKiBQb2ludHM6IE4yICogKG0gLSAxKSAqIChuIC0gMSlcbiAqL1xuZXhwb3J0cy5nZXRQZW5hbHR5TjIgPSBmdW5jdGlvbiBnZXRQZW5hbHR5TjIgKGRhdGEpIHtcbiAgY29uc3Qgc2l6ZSA9IGRhdGEuc2l6ZVxuICBsZXQgcG9pbnRzID0gMFxuXG4gIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IHNpemUgLSAxOyByb3crKykge1xuICAgIGZvciAobGV0IGNvbCA9IDA7IGNvbCA8IHNpemUgLSAxOyBjb2wrKykge1xuICAgICAgY29uc3QgbGFzdCA9IGRhdGEuZ2V0KHJvdywgY29sKSArXG4gICAgICAgIGRhdGEuZ2V0KHJvdywgY29sICsgMSkgK1xuICAgICAgICBkYXRhLmdldChyb3cgKyAxLCBjb2wpICtcbiAgICAgICAgZGF0YS5nZXQocm93ICsgMSwgY29sICsgMSlcblxuICAgICAgaWYgKGxhc3QgPT09IDQgfHwgbGFzdCA9PT0gMCkgcG9pbnRzKytcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcG9pbnRzICogUGVuYWx0eVNjb3Jlcy5OMlxufVxuXG4vKipcbiAqIEZpbmQgMToxOjM6MToxIHJhdGlvIChkYXJrOmxpZ2h0OmRhcms6bGlnaHQ6ZGFyaykgcGF0dGVybiBpbiByb3cvY29sdW1uLFxuICogcHJlY2VkZWQgb3IgZm9sbG93ZWQgYnkgbGlnaHQgYXJlYSA0IG1vZHVsZXMgd2lkZVxuICpcbiAqIFBvaW50czogTjMgKiBudW1iZXIgb2YgcGF0dGVybiBmb3VuZFxuICovXG5leHBvcnRzLmdldFBlbmFsdHlOMyA9IGZ1bmN0aW9uIGdldFBlbmFsdHlOMyAoZGF0YSkge1xuICBjb25zdCBzaXplID0gZGF0YS5zaXplXG4gIGxldCBwb2ludHMgPSAwXG4gIGxldCBiaXRzQ29sID0gMFxuICBsZXQgYml0c1JvdyA9IDBcblxuICBmb3IgKGxldCByb3cgPSAwOyByb3cgPCBzaXplOyByb3crKykge1xuICAgIGJpdHNDb2wgPSBiaXRzUm93ID0gMFxuICAgIGZvciAobGV0IGNvbCA9IDA7IGNvbCA8IHNpemU7IGNvbCsrKSB7XG4gICAgICBiaXRzQ29sID0gKChiaXRzQ29sIDw8IDEpICYgMHg3RkYpIHwgZGF0YS5nZXQocm93LCBjb2wpXG4gICAgICBpZiAoY29sID49IDEwICYmIChiaXRzQ29sID09PSAweDVEMCB8fCBiaXRzQ29sID09PSAweDA1RCkpIHBvaW50cysrXG5cbiAgICAgIGJpdHNSb3cgPSAoKGJpdHNSb3cgPDwgMSkgJiAweDdGRikgfCBkYXRhLmdldChjb2wsIHJvdylcbiAgICAgIGlmIChjb2wgPj0gMTAgJiYgKGJpdHNSb3cgPT09IDB4NUQwIHx8IGJpdHNSb3cgPT09IDB4MDVEKSkgcG9pbnRzKytcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcG9pbnRzICogUGVuYWx0eVNjb3Jlcy5OM1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBwcm9wb3J0aW9uIG9mIGRhcmsgbW9kdWxlcyBpbiBlbnRpcmUgc3ltYm9sXG4gKlxuICogUG9pbnRzOiBONCAqIGtcbiAqXG4gKiBrIGlzIHRoZSByYXRpbmcgb2YgdGhlIGRldmlhdGlvbiBvZiB0aGUgcHJvcG9ydGlvbiBvZiBkYXJrIG1vZHVsZXNcbiAqIGluIHRoZSBzeW1ib2wgZnJvbSA1MCUgaW4gc3RlcHMgb2YgNSVcbiAqL1xuZXhwb3J0cy5nZXRQZW5hbHR5TjQgPSBmdW5jdGlvbiBnZXRQZW5hbHR5TjQgKGRhdGEpIHtcbiAgbGV0IGRhcmtDb3VudCA9IDBcbiAgY29uc3QgbW9kdWxlc0NvdW50ID0gZGF0YS5kYXRhLmxlbmd0aFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbW9kdWxlc0NvdW50OyBpKyspIGRhcmtDb3VudCArPSBkYXRhLmRhdGFbaV1cblxuICBjb25zdCBrID0gTWF0aC5hYnMoTWF0aC5jZWlsKChkYXJrQ291bnQgKiAxMDAgLyBtb2R1bGVzQ291bnQpIC8gNSkgLSAxMClcblxuICByZXR1cm4gayAqIFBlbmFsdHlTY29yZXMuTjRcbn1cblxuLyoqXG4gKiBSZXR1cm4gbWFzayB2YWx1ZSBhdCBnaXZlbiBwb3NpdGlvblxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gbWFza1BhdHRlcm4gUGF0dGVybiByZWZlcmVuY2UgdmFsdWVcbiAqIEBwYXJhbSAge051bWJlcn0gaSAgICAgICAgICAgUm93XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGogICAgICAgICAgIENvbHVtblxuICogQHJldHVybiB7Qm9vbGVhbn0gICAgICAgICAgICBNYXNrIHZhbHVlXG4gKi9cbmZ1bmN0aW9uIGdldE1hc2tBdCAobWFza1BhdHRlcm4sIGksIGopIHtcbiAgc3dpdGNoIChtYXNrUGF0dGVybikge1xuICAgIGNhc2UgZXhwb3J0cy5QYXR0ZXJucy5QQVRURVJOMDAwOiByZXR1cm4gKGkgKyBqKSAlIDIgPT09IDBcbiAgICBjYXNlIGV4cG9ydHMuUGF0dGVybnMuUEFUVEVSTjAwMTogcmV0dXJuIGkgJSAyID09PSAwXG4gICAgY2FzZSBleHBvcnRzLlBhdHRlcm5zLlBBVFRFUk4wMTA6IHJldHVybiBqICUgMyA9PT0gMFxuICAgIGNhc2UgZXhwb3J0cy5QYXR0ZXJucy5QQVRURVJOMDExOiByZXR1cm4gKGkgKyBqKSAlIDMgPT09IDBcbiAgICBjYXNlIGV4cG9ydHMuUGF0dGVybnMuUEFUVEVSTjEwMDogcmV0dXJuIChNYXRoLmZsb29yKGkgLyAyKSArIE1hdGguZmxvb3IoaiAvIDMpKSAlIDIgPT09IDBcbiAgICBjYXNlIGV4cG9ydHMuUGF0dGVybnMuUEFUVEVSTjEwMTogcmV0dXJuIChpICogaikgJSAyICsgKGkgKiBqKSAlIDMgPT09IDBcbiAgICBjYXNlIGV4cG9ydHMuUGF0dGVybnMuUEFUVEVSTjExMDogcmV0dXJuICgoaSAqIGopICUgMiArIChpICogaikgJSAzKSAlIDIgPT09IDBcbiAgICBjYXNlIGV4cG9ydHMuUGF0dGVybnMuUEFUVEVSTjExMTogcmV0dXJuICgoaSAqIGopICUgMyArIChpICsgaikgJSAyKSAlIDIgPT09IDBcblxuICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcignYmFkIG1hc2tQYXR0ZXJuOicgKyBtYXNrUGF0dGVybilcbiAgfVxufVxuXG4vKipcbiAqIEFwcGx5IGEgbWFzayBwYXR0ZXJuIHRvIGEgQml0TWF0cml4XG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgICBwYXR0ZXJuIFBhdHRlcm4gcmVmZXJlbmNlIG51bWJlclxuICogQHBhcmFtICB7Qml0TWF0cml4fSBkYXRhICAgIEJpdE1hdHJpeCBkYXRhXG4gKi9cbmV4cG9ydHMuYXBwbHlNYXNrID0gZnVuY3Rpb24gYXBwbHlNYXNrIChwYXR0ZXJuLCBkYXRhKSB7XG4gIGNvbnN0IHNpemUgPSBkYXRhLnNpemVcblxuICBmb3IgKGxldCBjb2wgPSAwOyBjb2wgPCBzaXplOyBjb2wrKykge1xuICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IHNpemU7IHJvdysrKSB7XG4gICAgICBpZiAoZGF0YS5pc1Jlc2VydmVkKHJvdywgY29sKSkgY29udGludWVcbiAgICAgIGRhdGEueG9yKHJvdywgY29sLCBnZXRNYXNrQXQocGF0dGVybiwgcm93LCBjb2wpKVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIGJlc3QgbWFzayBwYXR0ZXJuIGZvciBkYXRhXG4gKlxuICogQHBhcmFtICB7Qml0TWF0cml4fSBkYXRhXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IE1hc2sgcGF0dGVybiByZWZlcmVuY2UgbnVtYmVyXG4gKi9cbmV4cG9ydHMuZ2V0QmVzdE1hc2sgPSBmdW5jdGlvbiBnZXRCZXN0TWFzayAoZGF0YSwgc2V0dXBGb3JtYXRGdW5jKSB7XG4gIGNvbnN0IG51bVBhdHRlcm5zID0gT2JqZWN0LmtleXMoZXhwb3J0cy5QYXR0ZXJucykubGVuZ3RoXG4gIGxldCBiZXN0UGF0dGVybiA9IDBcbiAgbGV0IGxvd2VyUGVuYWx0eSA9IEluZmluaXR5XG5cbiAgZm9yIChsZXQgcCA9IDA7IHAgPCBudW1QYXR0ZXJuczsgcCsrKSB7XG4gICAgc2V0dXBGb3JtYXRGdW5jKHApXG4gICAgZXhwb3J0cy5hcHBseU1hc2socCwgZGF0YSlcblxuICAgIC8vIENhbGN1bGF0ZSBwZW5hbHR5XG4gICAgY29uc3QgcGVuYWx0eSA9XG4gICAgICBleHBvcnRzLmdldFBlbmFsdHlOMShkYXRhKSArXG4gICAgICBleHBvcnRzLmdldFBlbmFsdHlOMihkYXRhKSArXG4gICAgICBleHBvcnRzLmdldFBlbmFsdHlOMyhkYXRhKSArXG4gICAgICBleHBvcnRzLmdldFBlbmFsdHlONChkYXRhKVxuXG4gICAgLy8gVW5kbyBwcmV2aW91c2x5IGFwcGxpZWQgbWFza1xuICAgIGV4cG9ydHMuYXBwbHlNYXNrKHAsIGRhdGEpXG5cbiAgICBpZiAocGVuYWx0eSA8IGxvd2VyUGVuYWx0eSkge1xuICAgICAgbG93ZXJQZW5hbHR5ID0gcGVuYWx0eVxuICAgICAgYmVzdFBhdHRlcm4gPSBwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJlc3RQYXR0ZXJuXG59XG4iLCAiY29uc3QgRUNMZXZlbCA9IHJlcXVpcmUoJy4vZXJyb3ItY29ycmVjdGlvbi1sZXZlbCcpXHJcblxyXG5jb25zdCBFQ19CTE9DS1NfVEFCTEUgPSBbXHJcbi8vIEwgIE0gIFEgIEhcclxuICAxLCAxLCAxLCAxLFxyXG4gIDEsIDEsIDEsIDEsXHJcbiAgMSwgMSwgMiwgMixcclxuICAxLCAyLCAyLCA0LFxyXG4gIDEsIDIsIDQsIDQsXHJcbiAgMiwgNCwgNCwgNCxcclxuICAyLCA0LCA2LCA1LFxyXG4gIDIsIDQsIDYsIDYsXHJcbiAgMiwgNSwgOCwgOCxcclxuICA0LCA1LCA4LCA4LFxyXG4gIDQsIDUsIDgsIDExLFxyXG4gIDQsIDgsIDEwLCAxMSxcclxuICA0LCA5LCAxMiwgMTYsXHJcbiAgNCwgOSwgMTYsIDE2LFxyXG4gIDYsIDEwLCAxMiwgMTgsXHJcbiAgNiwgMTAsIDE3LCAxNixcclxuICA2LCAxMSwgMTYsIDE5LFxyXG4gIDYsIDEzLCAxOCwgMjEsXHJcbiAgNywgMTQsIDIxLCAyNSxcclxuICA4LCAxNiwgMjAsIDI1LFxyXG4gIDgsIDE3LCAyMywgMjUsXHJcbiAgOSwgMTcsIDIzLCAzNCxcclxuICA5LCAxOCwgMjUsIDMwLFxyXG4gIDEwLCAyMCwgMjcsIDMyLFxyXG4gIDEyLCAyMSwgMjksIDM1LFxyXG4gIDEyLCAyMywgMzQsIDM3LFxyXG4gIDEyLCAyNSwgMzQsIDQwLFxyXG4gIDEzLCAyNiwgMzUsIDQyLFxyXG4gIDE0LCAyOCwgMzgsIDQ1LFxyXG4gIDE1LCAyOSwgNDAsIDQ4LFxyXG4gIDE2LCAzMSwgNDMsIDUxLFxyXG4gIDE3LCAzMywgNDUsIDU0LFxyXG4gIDE4LCAzNSwgNDgsIDU3LFxyXG4gIDE5LCAzNywgNTEsIDYwLFxyXG4gIDE5LCAzOCwgNTMsIDYzLFxyXG4gIDIwLCA0MCwgNTYsIDY2LFxyXG4gIDIxLCA0MywgNTksIDcwLFxyXG4gIDIyLCA0NSwgNjIsIDc0LFxyXG4gIDI0LCA0NywgNjUsIDc3LFxyXG4gIDI1LCA0OSwgNjgsIDgxXHJcbl1cclxuXHJcbmNvbnN0IEVDX0NPREVXT1JEU19UQUJMRSA9IFtcclxuLy8gTCAgTSAgUSAgSFxyXG4gIDcsIDEwLCAxMywgMTcsXHJcbiAgMTAsIDE2LCAyMiwgMjgsXHJcbiAgMTUsIDI2LCAzNiwgNDQsXHJcbiAgMjAsIDM2LCA1MiwgNjQsXHJcbiAgMjYsIDQ4LCA3MiwgODgsXHJcbiAgMzYsIDY0LCA5NiwgMTEyLFxyXG4gIDQwLCA3MiwgMTA4LCAxMzAsXHJcbiAgNDgsIDg4LCAxMzIsIDE1NixcclxuICA2MCwgMTEwLCAxNjAsIDE5MixcclxuICA3MiwgMTMwLCAxOTIsIDIyNCxcclxuICA4MCwgMTUwLCAyMjQsIDI2NCxcclxuICA5NiwgMTc2LCAyNjAsIDMwOCxcclxuICAxMDQsIDE5OCwgMjg4LCAzNTIsXHJcbiAgMTIwLCAyMTYsIDMyMCwgMzg0LFxyXG4gIDEzMiwgMjQwLCAzNjAsIDQzMixcclxuICAxNDQsIDI4MCwgNDA4LCA0ODAsXHJcbiAgMTY4LCAzMDgsIDQ0OCwgNTMyLFxyXG4gIDE4MCwgMzM4LCA1MDQsIDU4OCxcclxuICAxOTYsIDM2NCwgNTQ2LCA2NTAsXHJcbiAgMjI0LCA0MTYsIDYwMCwgNzAwLFxyXG4gIDIyNCwgNDQyLCA2NDQsIDc1MCxcclxuICAyNTIsIDQ3NiwgNjkwLCA4MTYsXHJcbiAgMjcwLCA1MDQsIDc1MCwgOTAwLFxyXG4gIDMwMCwgNTYwLCA4MTAsIDk2MCxcclxuICAzMTIsIDU4OCwgODcwLCAxMDUwLFxyXG4gIDMzNiwgNjQ0LCA5NTIsIDExMTAsXHJcbiAgMzYwLCA3MDAsIDEwMjAsIDEyMDAsXHJcbiAgMzkwLCA3MjgsIDEwNTAsIDEyNjAsXHJcbiAgNDIwLCA3ODQsIDExNDAsIDEzNTAsXHJcbiAgNDUwLCA4MTIsIDEyMDAsIDE0NDAsXHJcbiAgNDgwLCA4NjgsIDEyOTAsIDE1MzAsXHJcbiAgNTEwLCA5MjQsIDEzNTAsIDE2MjAsXHJcbiAgNTQwLCA5ODAsIDE0NDAsIDE3MTAsXHJcbiAgNTcwLCAxMDM2LCAxNTMwLCAxODAwLFxyXG4gIDU3MCwgMTA2NCwgMTU5MCwgMTg5MCxcclxuICA2MDAsIDExMjAsIDE2ODAsIDE5ODAsXHJcbiAgNjMwLCAxMjA0LCAxNzcwLCAyMTAwLFxyXG4gIDY2MCwgMTI2MCwgMTg2MCwgMjIyMCxcclxuICA3MjAsIDEzMTYsIDE5NTAsIDIzMTAsXHJcbiAgNzUwLCAxMzcyLCAyMDQwLCAyNDMwXHJcbl1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZXJyb3IgY29ycmVjdGlvbiBibG9jayB0aGF0IHRoZSBRUiBDb2RlIHNob3VsZCBjb250YWluXHJcbiAqIGZvciB0aGUgc3BlY2lmaWVkIHZlcnNpb24gYW5kIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwuXHJcbiAqXHJcbiAqIEBwYXJhbSAge051bWJlcn0gdmVyc2lvbiAgICAgICAgICAgICAgUVIgQ29kZSB2ZXJzaW9uXHJcbiAqIEBwYXJhbSAge051bWJlcn0gZXJyb3JDb3JyZWN0aW9uTGV2ZWwgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgICAgICAgICAgICAgIE51bWJlciBvZiBlcnJvciBjb3JyZWN0aW9uIGJsb2Nrc1xyXG4gKi9cclxuZXhwb3J0cy5nZXRCbG9ja3NDb3VudCA9IGZ1bmN0aW9uIGdldEJsb2Nrc0NvdW50ICh2ZXJzaW9uLCBlcnJvckNvcnJlY3Rpb25MZXZlbCkge1xyXG4gIHN3aXRjaCAoZXJyb3JDb3JyZWN0aW9uTGV2ZWwpIHtcclxuICAgIGNhc2UgRUNMZXZlbC5MOlxyXG4gICAgICByZXR1cm4gRUNfQkxPQ0tTX1RBQkxFWyh2ZXJzaW9uIC0gMSkgKiA0ICsgMF1cclxuICAgIGNhc2UgRUNMZXZlbC5NOlxyXG4gICAgICByZXR1cm4gRUNfQkxPQ0tTX1RBQkxFWyh2ZXJzaW9uIC0gMSkgKiA0ICsgMV1cclxuICAgIGNhc2UgRUNMZXZlbC5ROlxyXG4gICAgICByZXR1cm4gRUNfQkxPQ0tTX1RBQkxFWyh2ZXJzaW9uIC0gMSkgKiA0ICsgMl1cclxuICAgIGNhc2UgRUNMZXZlbC5IOlxyXG4gICAgICByZXR1cm4gRUNfQkxPQ0tTX1RBQkxFWyh2ZXJzaW9uIC0gMSkgKiA0ICsgM11cclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZXJyb3IgY29ycmVjdGlvbiBjb2Rld29yZHMgdG8gdXNlIGZvciB0aGUgc3BlY2lmaWVkXHJcbiAqIHZlcnNpb24gYW5kIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwuXHJcbiAqXHJcbiAqIEBwYXJhbSAge051bWJlcn0gdmVyc2lvbiAgICAgICAgICAgICAgUVIgQ29kZSB2ZXJzaW9uXHJcbiAqIEBwYXJhbSAge051bWJlcn0gZXJyb3JDb3JyZWN0aW9uTGV2ZWwgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxyXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICAgICAgICAgICAgICAgICAgIE51bWJlciBvZiBlcnJvciBjb3JyZWN0aW9uIGNvZGV3b3Jkc1xyXG4gKi9cclxuZXhwb3J0cy5nZXRUb3RhbENvZGV3b3Jkc0NvdW50ID0gZnVuY3Rpb24gZ2V0VG90YWxDb2Rld29yZHNDb3VudCAodmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwpIHtcclxuICBzd2l0Y2ggKGVycm9yQ29ycmVjdGlvbkxldmVsKSB7XHJcbiAgICBjYXNlIEVDTGV2ZWwuTDpcclxuICAgICAgcmV0dXJuIEVDX0NPREVXT1JEU19UQUJMRVsodmVyc2lvbiAtIDEpICogNCArIDBdXHJcbiAgICBjYXNlIEVDTGV2ZWwuTTpcclxuICAgICAgcmV0dXJuIEVDX0NPREVXT1JEU19UQUJMRVsodmVyc2lvbiAtIDEpICogNCArIDFdXHJcbiAgICBjYXNlIEVDTGV2ZWwuUTpcclxuICAgICAgcmV0dXJuIEVDX0NPREVXT1JEU19UQUJMRVsodmVyc2lvbiAtIDEpICogNCArIDJdXHJcbiAgICBjYXNlIEVDTGV2ZWwuSDpcclxuICAgICAgcmV0dXJuIEVDX0NPREVXT1JEU19UQUJMRVsodmVyc2lvbiAtIDEpICogNCArIDNdXHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG59XHJcbiIsICJjb25zdCBFWFBfVEFCTEUgPSBuZXcgVWludDhBcnJheSg1MTIpXG5jb25zdCBMT0dfVEFCTEUgPSBuZXcgVWludDhBcnJheSgyNTYpXG4vKipcbiAqIFByZWNvbXB1dGUgdGhlIGxvZyBhbmQgYW50aS1sb2cgdGFibGVzIGZvciBmYXN0ZXIgY29tcHV0YXRpb24gbGF0ZXJcbiAqXG4gKiBGb3IgZWFjaCBwb3NzaWJsZSB2YWx1ZSBpbiB0aGUgZ2Fsb2lzIGZpZWxkIDJeOCwgd2Ugd2lsbCBwcmUtY29tcHV0ZVxuICogdGhlIGxvZ2FyaXRobSBhbmQgYW50aS1sb2dhcml0aG0gKGV4cG9uZW50aWFsKSBvZiB0aGlzIHZhbHVlXG4gKlxuICogcmVmIHtAbGluayBodHRwczovL2VuLndpa2l2ZXJzaXR5Lm9yZy93aWtpL1JlZWQlRTIlODAlOTNTb2xvbW9uX2NvZGVzX2Zvcl9jb2RlcnMjSW50cm9kdWN0aW9uX3RvX21hdGhlbWF0aWNhbF9maWVsZHN9XG4gKi9cbjsoZnVuY3Rpb24gaW5pdFRhYmxlcyAoKSB7XG4gIGxldCB4ID0gMVxuICBmb3IgKGxldCBpID0gMDsgaSA8IDI1NTsgaSsrKSB7XG4gICAgRVhQX1RBQkxFW2ldID0geFxuICAgIExPR19UQUJMRVt4XSA9IGlcblxuICAgIHggPDw9IDEgLy8gbXVsdGlwbHkgYnkgMlxuXG4gICAgLy8gVGhlIFFSIGNvZGUgc3BlY2lmaWNhdGlvbiBzYXlzIHRvIHVzZSBieXRlLXdpc2UgbW9kdWxvIDEwMDAxMTEwMSBhcml0aG1ldGljLlxuICAgIC8vIFRoaXMgbWVhbnMgdGhhdCB3aGVuIGEgbnVtYmVyIGlzIDI1NiBvciBsYXJnZXIsIGl0IHNob3VsZCBiZSBYT1JlZCB3aXRoIDB4MTFELlxuICAgIGlmICh4ICYgMHgxMDApIHsgLy8gc2ltaWxhciB0byB4ID49IDI1NiwgYnV0IGEgbG90IGZhc3RlciAoYmVjYXVzZSAweDEwMCA9PSAyNTYpXG4gICAgICB4IF49IDB4MTFEXG4gICAgfVxuICB9XG5cbiAgLy8gT3B0aW1pemF0aW9uOiBkb3VibGUgdGhlIHNpemUgb2YgdGhlIGFudGktbG9nIHRhYmxlIHNvIHRoYXQgd2UgZG9uJ3QgbmVlZCB0byBtb2QgMjU1IHRvXG4gIC8vIHN0YXkgaW5zaWRlIHRoZSBib3VuZHMgKGJlY2F1c2Ugd2Ugd2lsbCBtYWlubHkgdXNlIHRoaXMgdGFibGUgZm9yIHRoZSBtdWx0aXBsaWNhdGlvbiBvZlxuICAvLyB0d28gR0YgbnVtYmVycywgbm8gbW9yZSkuXG4gIC8vIEBzZWUge0BsaW5rIG11bH1cbiAgZm9yIChsZXQgaSA9IDI1NTsgaSA8IDUxMjsgaSsrKSB7XG4gICAgRVhQX1RBQkxFW2ldID0gRVhQX1RBQkxFW2kgLSAyNTVdXG4gIH1cbn0oKSlcblxuLyoqXG4gKiBSZXR1cm5zIGxvZyB2YWx1ZSBvZiBuIGluc2lkZSBHYWxvaXMgRmllbGRcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IG5cbiAqIEByZXR1cm4ge051bWJlcn1cbiAqL1xuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbiBsb2cgKG4pIHtcbiAgaWYgKG4gPCAxKSB0aHJvdyBuZXcgRXJyb3IoJ2xvZygnICsgbiArICcpJylcbiAgcmV0dXJuIExPR19UQUJMRVtuXVxufVxuXG4vKipcbiAqIFJldHVybnMgYW50aS1sb2cgdmFsdWUgb2YgbiBpbnNpZGUgR2Fsb2lzIEZpZWxkXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBuXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydHMuZXhwID0gZnVuY3Rpb24gZXhwIChuKSB7XG4gIHJldHVybiBFWFBfVEFCTEVbbl1cbn1cblxuLyoqXG4gKiBNdWx0aXBsaWVzIHR3byBudW1iZXIgaW5zaWRlIEdhbG9pcyBGaWVsZFxuICpcbiAqIEBwYXJhbSAge051bWJlcn0geFxuICogQHBhcmFtICB7TnVtYmVyfSB5XG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKi9cbmV4cG9ydHMubXVsID0gZnVuY3Rpb24gbXVsICh4LCB5KSB7XG4gIGlmICh4ID09PSAwIHx8IHkgPT09IDApIHJldHVybiAwXG5cbiAgLy8gc2hvdWxkIGJlIEVYUF9UQUJMRVsoTE9HX1RBQkxFW3hdICsgTE9HX1RBQkxFW3ldKSAlIDI1NV0gaWYgRVhQX1RBQkxFIHdhc24ndCBvdmVyc2l6ZWRcbiAgLy8gQHNlZSB7QGxpbmsgaW5pdFRhYmxlc31cbiAgcmV0dXJuIEVYUF9UQUJMRVtMT0dfVEFCTEVbeF0gKyBMT0dfVEFCTEVbeV1dXG59XG4iLCAiY29uc3QgR0YgPSByZXF1aXJlKCcuL2dhbG9pcy1maWVsZCcpXG5cbi8qKlxuICogTXVsdGlwbGllcyB0d28gcG9seW5vbWlhbHMgaW5zaWRlIEdhbG9pcyBGaWVsZFxuICpcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IHAxIFBvbHlub21pYWxcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IHAyIFBvbHlub21pYWxcbiAqIEByZXR1cm4ge1VpbnQ4QXJyYXl9ICAgIFByb2R1Y3Qgb2YgcDEgYW5kIHAyXG4gKi9cbmV4cG9ydHMubXVsID0gZnVuY3Rpb24gbXVsIChwMSwgcDIpIHtcbiAgY29uc3QgY29lZmYgPSBuZXcgVWludDhBcnJheShwMS5sZW5ndGggKyBwMi5sZW5ndGggLSAxKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcDEubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IHAyLmxlbmd0aDsgaisrKSB7XG4gICAgICBjb2VmZltpICsgal0gXj0gR0YubXVsKHAxW2ldLCBwMltqXSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29lZmZcbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIHJlbWFpbmRlciBvZiBwb2x5bm9taWFscyBkaXZpc2lvblxuICpcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IGRpdmlkZW50IFBvbHlub21pYWxcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IGRpdmlzb3IgIFBvbHlub21pYWxcbiAqIEByZXR1cm4ge1VpbnQ4QXJyYXl9ICAgICAgICAgIFJlbWFpbmRlclxuICovXG5leHBvcnRzLm1vZCA9IGZ1bmN0aW9uIG1vZCAoZGl2aWRlbnQsIGRpdmlzb3IpIHtcbiAgbGV0IHJlc3VsdCA9IG5ldyBVaW50OEFycmF5KGRpdmlkZW50KVxuXG4gIHdoaWxlICgocmVzdWx0Lmxlbmd0aCAtIGRpdmlzb3IubGVuZ3RoKSA+PSAwKSB7XG4gICAgY29uc3QgY29lZmYgPSByZXN1bHRbMF1cblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGl2aXNvci5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W2ldIF49IEdGLm11bChkaXZpc29yW2ldLCBjb2VmZilcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYWxsIHplcm9zIGZyb20gYnVmZmVyIGhlYWRcbiAgICBsZXQgb2Zmc2V0ID0gMFxuICAgIHdoaWxlIChvZmZzZXQgPCByZXN1bHQubGVuZ3RoICYmIHJlc3VsdFtvZmZzZXRdID09PSAwKSBvZmZzZXQrK1xuICAgIHJlc3VsdCA9IHJlc3VsdC5zbGljZShvZmZzZXQpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qKlxuICogR2VuZXJhdGUgYW4gaXJyZWR1Y2libGUgZ2VuZXJhdG9yIHBvbHlub21pYWwgb2Ygc3BlY2lmaWVkIGRlZ3JlZVxuICogKHVzZWQgYnkgUmVlZC1Tb2xvbW9uIGVuY29kZXIpXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBkZWdyZWUgRGVncmVlIG9mIHRoZSBnZW5lcmF0b3IgcG9seW5vbWlhbFxuICogQHJldHVybiB7VWludDhBcnJheX0gICAgQnVmZmVyIGNvbnRhaW5pbmcgcG9seW5vbWlhbCBjb2VmZmljaWVudHNcbiAqL1xuZXhwb3J0cy5nZW5lcmF0ZUVDUG9seW5vbWlhbCA9IGZ1bmN0aW9uIGdlbmVyYXRlRUNQb2x5bm9taWFsIChkZWdyZWUpIHtcbiAgbGV0IHBvbHkgPSBuZXcgVWludDhBcnJheShbMV0pXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgZGVncmVlOyBpKyspIHtcbiAgICBwb2x5ID0gZXhwb3J0cy5tdWwocG9seSwgbmV3IFVpbnQ4QXJyYXkoWzEsIEdGLmV4cChpKV0pKVxuICB9XG5cbiAgcmV0dXJuIHBvbHlcbn1cbiIsICJjb25zdCBQb2x5bm9taWFsID0gcmVxdWlyZSgnLi9wb2x5bm9taWFsJylcblxuZnVuY3Rpb24gUmVlZFNvbG9tb25FbmNvZGVyIChkZWdyZWUpIHtcbiAgdGhpcy5nZW5Qb2x5ID0gdW5kZWZpbmVkXG4gIHRoaXMuZGVncmVlID0gZGVncmVlXG5cbiAgaWYgKHRoaXMuZGVncmVlKSB0aGlzLmluaXRpYWxpemUodGhpcy5kZWdyZWUpXG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSB0aGUgZW5jb2Rlci5cbiAqIFRoZSBpbnB1dCBwYXJhbSBzaG91bGQgY29ycmVzcG9uZCB0byB0aGUgbnVtYmVyIG9mIGVycm9yIGNvcnJlY3Rpb24gY29kZXdvcmRzLlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gZGVncmVlXG4gKi9cblJlZWRTb2xvbW9uRW5jb2Rlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uIGluaXRpYWxpemUgKGRlZ3JlZSkge1xuICAvLyBjcmVhdGUgYW4gaXJyZWR1Y2libGUgZ2VuZXJhdG9yIHBvbHlub21pYWxcbiAgdGhpcy5kZWdyZWUgPSBkZWdyZWVcbiAgdGhpcy5nZW5Qb2x5ID0gUG9seW5vbWlhbC5nZW5lcmF0ZUVDUG9seW5vbWlhbCh0aGlzLmRlZ3JlZSlcbn1cblxuLyoqXG4gKiBFbmNvZGVzIGEgY2h1bmsgb2YgZGF0YVxuICpcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IGRhdGEgQnVmZmVyIGNvbnRhaW5pbmcgaW5wdXQgZGF0YVxuICogQHJldHVybiB7VWludDhBcnJheX0gICAgICBCdWZmZXIgY29udGFpbmluZyBlbmNvZGVkIGRhdGFcbiAqL1xuUmVlZFNvbG9tb25FbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUgKGRhdGEpIHtcbiAgaWYgKCF0aGlzLmdlblBvbHkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0VuY29kZXIgbm90IGluaXRpYWxpemVkJylcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSBFQyBmb3IgdGhpcyBkYXRhIGJsb2NrXG4gIC8vIGV4dGVuZHMgZGF0YSBzaXplIHRvIGRhdGErZ2VuUG9seSBzaXplXG4gIGNvbnN0IHBhZGRlZERhdGEgPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCArIHRoaXMuZGVncmVlKVxuICBwYWRkZWREYXRhLnNldChkYXRhKVxuXG4gIC8vIFRoZSBlcnJvciBjb3JyZWN0aW9uIGNvZGV3b3JkcyBhcmUgdGhlIHJlbWFpbmRlciBhZnRlciBkaXZpZGluZyB0aGUgZGF0YSBjb2Rld29yZHNcbiAgLy8gYnkgYSBnZW5lcmF0b3IgcG9seW5vbWlhbFxuICBjb25zdCByZW1haW5kZXIgPSBQb2x5bm9taWFsLm1vZChwYWRkZWREYXRhLCB0aGlzLmdlblBvbHkpXG5cbiAgLy8gcmV0dXJuIEVDIGRhdGEgYmxvY2tzIChsYXN0IG4gYnl0ZSwgd2hlcmUgbiBpcyB0aGUgZGVncmVlIG9mIGdlblBvbHkpXG4gIC8vIElmIGNvZWZmaWNpZW50cyBudW1iZXIgaW4gcmVtYWluZGVyIGFyZSBsZXNzIHRoYW4gZ2VuUG9seSBkZWdyZWUsXG4gIC8vIHBhZCB3aXRoIDBzIHRvIHRoZSBsZWZ0IHRvIHJlYWNoIHRoZSBuZWVkZWQgbnVtYmVyIG9mIGNvZWZmaWNpZW50c1xuICBjb25zdCBzdGFydCA9IHRoaXMuZGVncmVlIC0gcmVtYWluZGVyLmxlbmd0aFxuICBpZiAoc3RhcnQgPiAwKSB7XG4gICAgY29uc3QgYnVmZiA9IG5ldyBVaW50OEFycmF5KHRoaXMuZGVncmVlKVxuICAgIGJ1ZmYuc2V0KHJlbWFpbmRlciwgc3RhcnQpXG5cbiAgICByZXR1cm4gYnVmZlxuICB9XG5cbiAgcmV0dXJuIHJlbWFpbmRlclxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlZWRTb2xvbW9uRW5jb2RlclxuIiwgIi8qKlxuICogQ2hlY2sgaWYgUVIgQ29kZSB2ZXJzaW9uIGlzIHZhbGlkXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqIEByZXR1cm4ge0Jvb2xlYW59ICAgICAgICAgdHJ1ZSBpZiB2YWxpZCB2ZXJzaW9uLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuZXhwb3J0cy5pc1ZhbGlkID0gZnVuY3Rpb24gaXNWYWxpZCAodmVyc2lvbikge1xuICByZXR1cm4gIWlzTmFOKHZlcnNpb24pICYmIHZlcnNpb24gPj0gMSAmJiB2ZXJzaW9uIDw9IDQwXG59XG4iLCAiY29uc3QgbnVtZXJpYyA9ICdbMC05XSsnXG5jb25zdCBhbHBoYW51bWVyaWMgPSAnW0EtWiAkJSorXFxcXC0uLzpdKydcbmxldCBrYW5qaSA9ICcoPzpbdTMwMDAtdTMwM0ZdfFt1MzA0MC11MzA5Rl18W3UzMEEwLXUzMEZGXXwnICtcbiAgJ1t1RkYwMC11RkZFRl18W3U0RTAwLXU5RkFGXXxbdTI2MDUtdTI2MDZdfFt1MjE5MC11MjE5NV18dTIwM0J8JyArXG4gICdbdTIwMTB1MjAxNXUyMDE4dTIwMTl1MjAyNXUyMDI2dTIwMUN1MjAxRHUyMjI1dTIyNjBdfCcgK1xuICAnW3UwMzkxLXUwNDUxXXxbdTAwQTd1MDBBOHUwMEIxdTAwQjR1MDBEN3UwMEY3XSkrJ1xua2FuamkgPSBrYW5qaS5yZXBsYWNlKC91L2csICdcXFxcdScpXG5cbmNvbnN0IGJ5dGUgPSAnKD86KD8hW0EtWjAtOSAkJSorXFxcXC0uLzpdfCcgKyBrYW5qaSArICcpKD86LnxbXFxyXFxuXSkpKydcblxuZXhwb3J0cy5LQU5KSSA9IG5ldyBSZWdFeHAoa2FuamksICdnJylcbmV4cG9ydHMuQllURV9LQU5KSSA9IG5ldyBSZWdFeHAoJ1teQS1aMC05ICQlKitcXFxcLS4vOl0rJywgJ2cnKVxuZXhwb3J0cy5CWVRFID0gbmV3IFJlZ0V4cChieXRlLCAnZycpXG5leHBvcnRzLk5VTUVSSUMgPSBuZXcgUmVnRXhwKG51bWVyaWMsICdnJylcbmV4cG9ydHMuQUxQSEFOVU1FUklDID0gbmV3IFJlZ0V4cChhbHBoYW51bWVyaWMsICdnJylcblxuY29uc3QgVEVTVF9LQU5KSSA9IG5ldyBSZWdFeHAoJ14nICsga2FuamkgKyAnJCcpXG5jb25zdCBURVNUX05VTUVSSUMgPSBuZXcgUmVnRXhwKCdeJyArIG51bWVyaWMgKyAnJCcpXG5jb25zdCBURVNUX0FMUEhBTlVNRVJJQyA9IG5ldyBSZWdFeHAoJ15bQS1aMC05ICQlKitcXFxcLS4vOl0rJCcpXG5cbmV4cG9ydHMudGVzdEthbmppID0gZnVuY3Rpb24gdGVzdEthbmppIChzdHIpIHtcbiAgcmV0dXJuIFRFU1RfS0FOSkkudGVzdChzdHIpXG59XG5cbmV4cG9ydHMudGVzdE51bWVyaWMgPSBmdW5jdGlvbiB0ZXN0TnVtZXJpYyAoc3RyKSB7XG4gIHJldHVybiBURVNUX05VTUVSSUMudGVzdChzdHIpXG59XG5cbmV4cG9ydHMudGVzdEFscGhhbnVtZXJpYyA9IGZ1bmN0aW9uIHRlc3RBbHBoYW51bWVyaWMgKHN0cikge1xuICByZXR1cm4gVEVTVF9BTFBIQU5VTUVSSUMudGVzdChzdHIpXG59XG4iLCAiY29uc3QgVmVyc2lvbkNoZWNrID0gcmVxdWlyZSgnLi92ZXJzaW9uLWNoZWNrJylcbmNvbnN0IFJlZ2V4ID0gcmVxdWlyZSgnLi9yZWdleCcpXG5cbi8qKlxuICogTnVtZXJpYyBtb2RlIGVuY29kZXMgZGF0YSBmcm9tIHRoZSBkZWNpbWFsIGRpZ2l0IHNldCAoMCAtIDkpXG4gKiAoYnl0ZSB2YWx1ZXMgMzBIRVggdG8gMzlIRVgpLlxuICogTm9ybWFsbHksIDMgZGF0YSBjaGFyYWN0ZXJzIGFyZSByZXByZXNlbnRlZCBieSAxMCBiaXRzLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuTlVNRVJJQyA9IHtcbiAgaWQ6ICdOdW1lcmljJyxcbiAgYml0OiAxIDw8IDAsXG4gIGNjQml0czogWzEwLCAxMiwgMTRdXG59XG5cbi8qKlxuICogQWxwaGFudW1lcmljIG1vZGUgZW5jb2RlcyBkYXRhIGZyb20gYSBzZXQgb2YgNDUgY2hhcmFjdGVycyxcbiAqIGkuZS4gMTAgbnVtZXJpYyBkaWdpdHMgKDAgLSA5KSxcbiAqICAgICAgMjYgYWxwaGFiZXRpYyBjaGFyYWN0ZXJzIChBIC0gWiksXG4gKiAgIGFuZCA5IHN5bWJvbHMgKFNQLCAkLCAlLCAqLCArLCAtLCAuLCAvLCA6KS5cbiAqIE5vcm1hbGx5LCB0d28gaW5wdXQgY2hhcmFjdGVycyBhcmUgcmVwcmVzZW50ZWQgYnkgMTEgYml0cy5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnRzLkFMUEhBTlVNRVJJQyA9IHtcbiAgaWQ6ICdBbHBoYW51bWVyaWMnLFxuICBiaXQ6IDEgPDwgMSxcbiAgY2NCaXRzOiBbOSwgMTEsIDEzXVxufVxuXG4vKipcbiAqIEluIGJ5dGUgbW9kZSwgZGF0YSBpcyBlbmNvZGVkIGF0IDggYml0cyBwZXIgY2hhcmFjdGVyLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydHMuQllURSA9IHtcbiAgaWQ6ICdCeXRlJyxcbiAgYml0OiAxIDw8IDIsXG4gIGNjQml0czogWzgsIDE2LCAxNl1cbn1cblxuLyoqXG4gKiBUaGUgS2FuamkgbW9kZSBlZmZpY2llbnRseSBlbmNvZGVzIEthbmppIGNoYXJhY3RlcnMgaW4gYWNjb3JkYW5jZSB3aXRoXG4gKiB0aGUgU2hpZnQgSklTIHN5c3RlbSBiYXNlZCBvbiBKSVMgWCAwMjA4LlxuICogVGhlIFNoaWZ0IEpJUyB2YWx1ZXMgYXJlIHNoaWZ0ZWQgZnJvbSB0aGUgSklTIFggMDIwOCB2YWx1ZXMuXG4gKiBKSVMgWCAwMjA4IGdpdmVzIGRldGFpbHMgb2YgdGhlIHNoaWZ0IGNvZGVkIHJlcHJlc2VudGF0aW9uLlxuICogRWFjaCB0d28tYnl0ZSBjaGFyYWN0ZXIgdmFsdWUgaXMgY29tcGFjdGVkIHRvIGEgMTMtYml0IGJpbmFyeSBjb2Rld29yZC5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnRzLktBTkpJID0ge1xuICBpZDogJ0thbmppJyxcbiAgYml0OiAxIDw8IDMsXG4gIGNjQml0czogWzgsIDEwLCAxMl1cbn1cblxuLyoqXG4gKiBNaXhlZCBtb2RlIHdpbGwgY29udGFpbiBhIHNlcXVlbmNlcyBvZiBkYXRhIGluIGEgY29tYmluYXRpb24gb2YgYW55IG9mXG4gKiB0aGUgbW9kZXMgZGVzY3JpYmVkIGFib3ZlXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0cy5NSVhFRCA9IHtcbiAgYml0OiAtMVxufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBiaXRzIG5lZWRlZCB0byBzdG9yZSB0aGUgZGF0YSBsZW5ndGhcbiAqIGFjY29yZGluZyB0byBRUiBDb2RlIHNwZWNpZmljYXRpb25zLlxuICpcbiAqIEBwYXJhbSAge01vZGV9ICAgbW9kZSAgICBEYXRhIG1vZGVcbiAqIEBwYXJhbSAge051bWJlcn0gdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICBOdW1iZXIgb2YgYml0c1xuICovXG5leHBvcnRzLmdldENoYXJDb3VudEluZGljYXRvciA9IGZ1bmN0aW9uIGdldENoYXJDb3VudEluZGljYXRvciAobW9kZSwgdmVyc2lvbikge1xuICBpZiAoIW1vZGUuY2NCaXRzKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbW9kZTogJyArIG1vZGUpXG5cbiAgaWYgKCFWZXJzaW9uQ2hlY2suaXNWYWxpZCh2ZXJzaW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB2ZXJzaW9uOiAnICsgdmVyc2lvbilcbiAgfVxuXG4gIGlmICh2ZXJzaW9uID49IDEgJiYgdmVyc2lvbiA8IDEwKSByZXR1cm4gbW9kZS5jY0JpdHNbMF1cbiAgZWxzZSBpZiAodmVyc2lvbiA8IDI3KSByZXR1cm4gbW9kZS5jY0JpdHNbMV1cbiAgcmV0dXJuIG1vZGUuY2NCaXRzWzJdXG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbW9zdCBlZmZpY2llbnQgbW9kZSB0byBzdG9yZSB0aGUgc3BlY2lmaWVkIGRhdGFcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGFTdHIgSW5wdXQgZGF0YSBzdHJpbmdcbiAqIEByZXR1cm4ge01vZGV9ICAgICAgICAgICBCZXN0IG1vZGVcbiAqL1xuZXhwb3J0cy5nZXRCZXN0TW9kZUZvckRhdGEgPSBmdW5jdGlvbiBnZXRCZXN0TW9kZUZvckRhdGEgKGRhdGFTdHIpIHtcbiAgaWYgKFJlZ2V4LnRlc3ROdW1lcmljKGRhdGFTdHIpKSByZXR1cm4gZXhwb3J0cy5OVU1FUklDXG4gIGVsc2UgaWYgKFJlZ2V4LnRlc3RBbHBoYW51bWVyaWMoZGF0YVN0cikpIHJldHVybiBleHBvcnRzLkFMUEhBTlVNRVJJQ1xuICBlbHNlIGlmIChSZWdleC50ZXN0S2FuamkoZGF0YVN0cikpIHJldHVybiBleHBvcnRzLktBTkpJXG4gIGVsc2UgcmV0dXJuIGV4cG9ydHMuQllURVxufVxuXG4vKipcbiAqIFJldHVybiBtb2RlIG5hbWUgYXMgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtNb2RlfSBtb2RlIE1vZGUgb2JqZWN0XG4gKiBAcmV0dXJucyB7U3RyaW5nfSAgTW9kZSBuYW1lXG4gKi9cbmV4cG9ydHMudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAobW9kZSkge1xuICBpZiAobW9kZSAmJiBtb2RlLmlkKSByZXR1cm4gbW9kZS5pZFxuICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgbW9kZScpXG59XG5cbi8qKlxuICogQ2hlY2sgaWYgaW5wdXQgcGFyYW0gaXMgYSB2YWxpZCBtb2RlIG9iamVjdFxuICpcbiAqIEBwYXJhbSAgIHtNb2RlfSAgICBtb2RlIE1vZGUgb2JqZWN0XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB2YWxpZCBtb2RlLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuZXhwb3J0cy5pc1ZhbGlkID0gZnVuY3Rpb24gaXNWYWxpZCAobW9kZSkge1xuICByZXR1cm4gbW9kZSAmJiBtb2RlLmJpdCAmJiBtb2RlLmNjQml0c1xufVxuXG4vKipcbiAqIEdldCBtb2RlIG9iamVjdCBmcm9tIGl0cyBuYW1lXG4gKlxuICogQHBhcmFtICAge1N0cmluZ30gc3RyaW5nIE1vZGUgbmFtZVxuICogQHJldHVybnMge01vZGV9ICAgICAgICAgIE1vZGUgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGZyb21TdHJpbmcgKHN0cmluZykge1xuICBpZiAodHlwZW9mIHN0cmluZyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1BhcmFtIGlzIG5vdCBhIHN0cmluZycpXG4gIH1cblxuICBjb25zdCBsY1N0ciA9IHN0cmluZy50b0xvd2VyQ2FzZSgpXG5cbiAgc3dpdGNoIChsY1N0cikge1xuICAgIGNhc2UgJ251bWVyaWMnOlxuICAgICAgcmV0dXJuIGV4cG9ydHMuTlVNRVJJQ1xuICAgIGNhc2UgJ2FscGhhbnVtZXJpYyc6XG4gICAgICByZXR1cm4gZXhwb3J0cy5BTFBIQU5VTUVSSUNcbiAgICBjYXNlICdrYW5qaSc6XG4gICAgICByZXR1cm4gZXhwb3J0cy5LQU5KSVxuICAgIGNhc2UgJ2J5dGUnOlxuICAgICAgcmV0dXJuIGV4cG9ydHMuQllURVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gbW9kZTogJyArIHN0cmluZylcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgbW9kZSBmcm9tIGEgdmFsdWUuXG4gKiBJZiB2YWx1ZSBpcyBub3QgYSB2YWxpZCBtb2RlLCByZXR1cm5zIGRlZmF1bHRWYWx1ZVxuICpcbiAqIEBwYXJhbSAge01vZGV8U3RyaW5nfSB2YWx1ZSAgICAgICAgRW5jb2RpbmcgbW9kZVxuICogQHBhcmFtICB7TW9kZX0gICAgICAgIGRlZmF1bHRWYWx1ZSBGYWxsYmFjayB2YWx1ZVxuICogQHJldHVybiB7TW9kZX0gICAgICAgICAgICAgICAgICAgICBFbmNvZGluZyBtb2RlXG4gKi9cbmV4cG9ydHMuZnJvbSA9IGZ1bmN0aW9uIGZyb20gKHZhbHVlLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKGV4cG9ydHMuaXNWYWxpZCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIGZyb21TdHJpbmcodmFsdWUpXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIH1cbn1cbiIsICJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuY29uc3QgRUNDb2RlID0gcmVxdWlyZSgnLi9lcnJvci1jb3JyZWN0aW9uLWNvZGUnKVxuY29uc3QgRUNMZXZlbCA9IHJlcXVpcmUoJy4vZXJyb3ItY29ycmVjdGlvbi1sZXZlbCcpXG5jb25zdCBNb2RlID0gcmVxdWlyZSgnLi9tb2RlJylcbmNvbnN0IFZlcnNpb25DaGVjayA9IHJlcXVpcmUoJy4vdmVyc2lvbi1jaGVjaycpXG5cbi8vIEdlbmVyYXRvciBwb2x5bm9taWFsIHVzZWQgdG8gZW5jb2RlIHZlcnNpb24gaW5mb3JtYXRpb25cbmNvbnN0IEcxOCA9ICgxIDw8IDEyKSB8ICgxIDw8IDExKSB8ICgxIDw8IDEwKSB8ICgxIDw8IDkpIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDIpIHwgKDEgPDwgMClcbmNvbnN0IEcxOF9CQ0ggPSBVdGlscy5nZXRCQ0hEaWdpdChHMTgpXG5cbmZ1bmN0aW9uIGdldEJlc3RWZXJzaW9uRm9yRGF0YUxlbmd0aCAobW9kZSwgbGVuZ3RoLCBlcnJvckNvcnJlY3Rpb25MZXZlbCkge1xuICBmb3IgKGxldCBjdXJyZW50VmVyc2lvbiA9IDE7IGN1cnJlbnRWZXJzaW9uIDw9IDQwOyBjdXJyZW50VmVyc2lvbisrKSB7XG4gICAgaWYgKGxlbmd0aCA8PSBleHBvcnRzLmdldENhcGFjaXR5KGN1cnJlbnRWZXJzaW9uLCBlcnJvckNvcnJlY3Rpb25MZXZlbCwgbW9kZSkpIHtcbiAgICAgIHJldHVybiBjdXJyZW50VmVyc2lvblxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZnVuY3Rpb24gZ2V0UmVzZXJ2ZWRCaXRzQ291bnQgKG1vZGUsIHZlcnNpb24pIHtcbiAgLy8gQ2hhcmFjdGVyIGNvdW50IGluZGljYXRvciArIG1vZGUgaW5kaWNhdG9yIGJpdHNcbiAgcmV0dXJuIE1vZGUuZ2V0Q2hhckNvdW50SW5kaWNhdG9yKG1vZGUsIHZlcnNpb24pICsgNFxufVxuXG5mdW5jdGlvbiBnZXRUb3RhbEJpdHNGcm9tRGF0YUFycmF5IChzZWdtZW50cywgdmVyc2lvbikge1xuICBsZXQgdG90YWxCaXRzID0gMFxuXG4gIHNlZ21lbnRzLmZvckVhY2goZnVuY3Rpb24gKGRhdGEpIHtcbiAgICBjb25zdCByZXNlcnZlZEJpdHMgPSBnZXRSZXNlcnZlZEJpdHNDb3VudChkYXRhLm1vZGUsIHZlcnNpb24pXG4gICAgdG90YWxCaXRzICs9IHJlc2VydmVkQml0cyArIGRhdGEuZ2V0Qml0c0xlbmd0aCgpXG4gIH0pXG5cbiAgcmV0dXJuIHRvdGFsQml0c1xufVxuXG5mdW5jdGlvbiBnZXRCZXN0VmVyc2lvbkZvck1peGVkRGF0YSAoc2VnbWVudHMsIGVycm9yQ29ycmVjdGlvbkxldmVsKSB7XG4gIGZvciAobGV0IGN1cnJlbnRWZXJzaW9uID0gMTsgY3VycmVudFZlcnNpb24gPD0gNDA7IGN1cnJlbnRWZXJzaW9uKyspIHtcbiAgICBjb25zdCBsZW5ndGggPSBnZXRUb3RhbEJpdHNGcm9tRGF0YUFycmF5KHNlZ21lbnRzLCBjdXJyZW50VmVyc2lvbilcbiAgICBpZiAobGVuZ3RoIDw9IGV4cG9ydHMuZ2V0Q2FwYWNpdHkoY3VycmVudFZlcnNpb24sIGVycm9yQ29ycmVjdGlvbkxldmVsLCBNb2RlLk1JWEVEKSkge1xuICAgICAgcmV0dXJuIGN1cnJlbnRWZXJzaW9uXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVuZGVmaW5lZFxufVxuXG4vKipcbiAqIFJldHVybnMgdmVyc2lvbiBudW1iZXIgZnJvbSBhIHZhbHVlLlxuICogSWYgdmFsdWUgaXMgbm90IGEgdmFsaWQgdmVyc2lvbiwgcmV0dXJucyBkZWZhdWx0VmFsdWVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ8U3RyaW5nfSB2YWx1ZSAgICAgICAgUVIgQ29kZSB2ZXJzaW9uXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgICAgICBkZWZhdWx0VmFsdWUgRmFsbGJhY2sgdmFsdWVcbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgICAgICAgICAgICBRUiBDb2RlIHZlcnNpb24gbnVtYmVyXG4gKi9cbmV4cG9ydHMuZnJvbSA9IGZ1bmN0aW9uIGZyb20gKHZhbHVlLCBkZWZhdWx0VmFsdWUpIHtcbiAgaWYgKFZlcnNpb25DaGVjay5pc1ZhbGlkKHZhbHVlKSkge1xuICAgIHJldHVybiBwYXJzZUludCh2YWx1ZSwgMTApXG4gIH1cblxuICByZXR1cm4gZGVmYXVsdFZhbHVlXG59XG5cbi8qKlxuICogUmV0dXJucyBob3cgbXVjaCBkYXRhIGNhbiBiZSBzdG9yZWQgd2l0aCB0aGUgc3BlY2lmaWVkIFFSIGNvZGUgdmVyc2lvblxuICogYW5kIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWxcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHZlcnNpb24gICAgICAgICAgICAgIFFSIENvZGUgdmVyc2lvbiAoMS00MClcbiAqIEBwYXJhbSAge051bWJlcn0gZXJyb3JDb3JyZWN0aW9uTGV2ZWwgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxuICogQHBhcmFtICB7TW9kZX0gICBtb2RlICAgICAgICAgICAgICAgICBEYXRhIG1vZGVcbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgICAgICAgICAgICAgUXVhbnRpdHkgb2Ygc3RvcmFibGUgZGF0YVxuICovXG5leHBvcnRzLmdldENhcGFjaXR5ID0gZnVuY3Rpb24gZ2V0Q2FwYWNpdHkgKHZlcnNpb24sIGVycm9yQ29ycmVjdGlvbkxldmVsLCBtb2RlKSB7XG4gIGlmICghVmVyc2lvbkNoZWNrLmlzVmFsaWQodmVyc2lvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUVIgQ29kZSB2ZXJzaW9uJylcbiAgfVxuXG4gIC8vIFVzZSBCeXRlIG1vZGUgYXMgZGVmYXVsdFxuICBpZiAodHlwZW9mIG1vZGUgPT09ICd1bmRlZmluZWQnKSBtb2RlID0gTW9kZS5CWVRFXG5cbiAgLy8gVG90YWwgY29kZXdvcmRzIGZvciB0aGlzIFFSIGNvZGUgdmVyc2lvbiAoRGF0YSArIEVycm9yIGNvcnJlY3Rpb24pXG4gIGNvbnN0IHRvdGFsQ29kZXdvcmRzID0gVXRpbHMuZ2V0U3ltYm9sVG90YWxDb2Rld29yZHModmVyc2lvbilcblxuICAvLyBUb3RhbCBudW1iZXIgb2YgZXJyb3IgY29ycmVjdGlvbiBjb2Rld29yZHNcbiAgY29uc3QgZWNUb3RhbENvZGV3b3JkcyA9IEVDQ29kZS5nZXRUb3RhbENvZGV3b3Jkc0NvdW50KHZlcnNpb24sIGVycm9yQ29ycmVjdGlvbkxldmVsKVxuXG4gIC8vIFRvdGFsIG51bWJlciBvZiBkYXRhIGNvZGV3b3Jkc1xuICBjb25zdCBkYXRhVG90YWxDb2Rld29yZHNCaXRzID0gKHRvdGFsQ29kZXdvcmRzIC0gZWNUb3RhbENvZGV3b3JkcykgKiA4XG5cbiAgaWYgKG1vZGUgPT09IE1vZGUuTUlYRUQpIHJldHVybiBkYXRhVG90YWxDb2Rld29yZHNCaXRzXG5cbiAgY29uc3QgdXNhYmxlQml0cyA9IGRhdGFUb3RhbENvZGV3b3Jkc0JpdHMgLSBnZXRSZXNlcnZlZEJpdHNDb3VudChtb2RlLCB2ZXJzaW9uKVxuXG4gIC8vIFJldHVybiBtYXggbnVtYmVyIG9mIHN0b3JhYmxlIGNvZGV3b3Jkc1xuICBzd2l0Y2ggKG1vZGUpIHtcbiAgICBjYXNlIE1vZGUuTlVNRVJJQzpcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKCh1c2FibGVCaXRzIC8gMTApICogMylcblxuICAgIGNhc2UgTW9kZS5BTFBIQU5VTUVSSUM6XG4gICAgICByZXR1cm4gTWF0aC5mbG9vcigodXNhYmxlQml0cyAvIDExKSAqIDIpXG5cbiAgICBjYXNlIE1vZGUuS0FOSkk6XG4gICAgICByZXR1cm4gTWF0aC5mbG9vcih1c2FibGVCaXRzIC8gMTMpXG5cbiAgICBjYXNlIE1vZGUuQllURTpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIE1hdGguZmxvb3IodXNhYmxlQml0cyAvIDgpXG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBtaW5pbXVtIHZlcnNpb24gbmVlZGVkIHRvIGNvbnRhaW4gdGhlIGFtb3VudCBvZiBkYXRhXG4gKlxuICogQHBhcmFtICB7U2VnbWVudH0gZGF0YSAgICAgICAgICAgICAgICAgICAgU2VnbWVudCBvZiBkYXRhXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IFtlcnJvckNvcnJlY3Rpb25MZXZlbD1IXSBFcnJvciBjb3JyZWN0aW9uIGxldmVsXG4gKiBAcGFyYW0gIHtNb2RlfSBtb2RlICAgICAgICAgICAgICAgICAgICAgICBEYXRhIG1vZGVcbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgICAgICAgICAgICAgICAgIFFSIENvZGUgdmVyc2lvblxuICovXG5leHBvcnRzLmdldEJlc3RWZXJzaW9uRm9yRGF0YSA9IGZ1bmN0aW9uIGdldEJlc3RWZXJzaW9uRm9yRGF0YSAoZGF0YSwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwpIHtcbiAgbGV0IHNlZ1xuXG4gIGNvbnN0IGVjbCA9IEVDTGV2ZWwuZnJvbShlcnJvckNvcnJlY3Rpb25MZXZlbCwgRUNMZXZlbC5NKVxuXG4gIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgaWYgKGRhdGEubGVuZ3RoID4gMSkge1xuICAgICAgcmV0dXJuIGdldEJlc3RWZXJzaW9uRm9yTWl4ZWREYXRhKGRhdGEsIGVjbClcbiAgICB9XG5cbiAgICBpZiAoZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiAxXG4gICAgfVxuXG4gICAgc2VnID0gZGF0YVswXVxuICB9IGVsc2Uge1xuICAgIHNlZyA9IGRhdGFcbiAgfVxuXG4gIHJldHVybiBnZXRCZXN0VmVyc2lvbkZvckRhdGFMZW5ndGgoc2VnLm1vZGUsIHNlZy5nZXRMZW5ndGgoKSwgZWNsKVxufVxuXG4vKipcbiAqIFJldHVybnMgdmVyc2lvbiBpbmZvcm1hdGlvbiB3aXRoIHJlbGF0aXZlIGVycm9yIGNvcnJlY3Rpb24gYml0c1xuICpcbiAqIFRoZSB2ZXJzaW9uIGluZm9ybWF0aW9uIGlzIGluY2x1ZGVkIGluIFFSIENvZGUgc3ltYm9scyBvZiB2ZXJzaW9uIDcgb3IgbGFyZ2VyLlxuICogSXQgY29uc2lzdHMgb2YgYW4gMTgtYml0IHNlcXVlbmNlIGNvbnRhaW5pbmcgNiBkYXRhIGJpdHMsXG4gKiB3aXRoIDEyIGVycm9yIGNvcnJlY3Rpb24gYml0cyBjYWxjdWxhdGVkIHVzaW5nIHRoZSAoMTgsIDYpIEdvbGF5IGNvZGUuXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSB2ZXJzaW9uIFFSIENvZGUgdmVyc2lvblxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgIEVuY29kZWQgdmVyc2lvbiBpbmZvIGJpdHNcbiAqL1xuZXhwb3J0cy5nZXRFbmNvZGVkQml0cyA9IGZ1bmN0aW9uIGdldEVuY29kZWRCaXRzICh2ZXJzaW9uKSB7XG4gIGlmICghVmVyc2lvbkNoZWNrLmlzVmFsaWQodmVyc2lvbikgfHwgdmVyc2lvbiA8IDcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgUVIgQ29kZSB2ZXJzaW9uJylcbiAgfVxuXG4gIGxldCBkID0gdmVyc2lvbiA8PCAxMlxuXG4gIHdoaWxlIChVdGlscy5nZXRCQ0hEaWdpdChkKSAtIEcxOF9CQ0ggPj0gMCkge1xuICAgIGQgXj0gKEcxOCA8PCAoVXRpbHMuZ2V0QkNIRGlnaXQoZCkgLSBHMThfQkNIKSlcbiAgfVxuXG4gIHJldHVybiAodmVyc2lvbiA8PCAxMikgfCBkXG59XG4iLCAiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcblxuY29uc3QgRzE1ID0gKDEgPDwgMTApIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDQpIHwgKDEgPDwgMikgfCAoMSA8PCAxKSB8ICgxIDw8IDApXG5jb25zdCBHMTVfTUFTSyA9ICgxIDw8IDE0KSB8ICgxIDw8IDEyKSB8ICgxIDw8IDEwKSB8ICgxIDw8IDQpIHwgKDEgPDwgMSlcbmNvbnN0IEcxNV9CQ0ggPSBVdGlscy5nZXRCQ0hEaWdpdChHMTUpXG5cbi8qKlxuICogUmV0dXJucyBmb3JtYXQgaW5mb3JtYXRpb24gd2l0aCByZWxhdGl2ZSBlcnJvciBjb3JyZWN0aW9uIGJpdHNcbiAqXG4gKiBUaGUgZm9ybWF0IGluZm9ybWF0aW9uIGlzIGEgMTUtYml0IHNlcXVlbmNlIGNvbnRhaW5pbmcgNSBkYXRhIGJpdHMsXG4gKiB3aXRoIDEwIGVycm9yIGNvcnJlY3Rpb24gYml0cyBjYWxjdWxhdGVkIHVzaW5nIHRoZSAoMTUsIDUpIEJDSCBjb2RlLlxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gZXJyb3JDb3JyZWN0aW9uTGV2ZWwgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxuICogQHBhcmFtICB7TnVtYmVyfSBtYXNrICAgICAgICAgICAgICAgICBNYXNrIHBhdHRlcm5cbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgICAgICAgICAgICAgRW5jb2RlZCBmb3JtYXQgaW5mb3JtYXRpb24gYml0c1xuICovXG5leHBvcnRzLmdldEVuY29kZWRCaXRzID0gZnVuY3Rpb24gZ2V0RW5jb2RlZEJpdHMgKGVycm9yQ29ycmVjdGlvbkxldmVsLCBtYXNrKSB7XG4gIGNvbnN0IGRhdGEgPSAoKGVycm9yQ29ycmVjdGlvbkxldmVsLmJpdCA8PCAzKSB8IG1hc2spXG4gIGxldCBkID0gZGF0YSA8PCAxMFxuXG4gIHdoaWxlIChVdGlscy5nZXRCQ0hEaWdpdChkKSAtIEcxNV9CQ0ggPj0gMCkge1xuICAgIGQgXj0gKEcxNSA8PCAoVXRpbHMuZ2V0QkNIRGlnaXQoZCkgLSBHMTVfQkNIKSlcbiAgfVxuXG4gIC8vIHhvciBmaW5hbCBkYXRhIHdpdGggbWFzayBwYXR0ZXJuIGluIG9yZGVyIHRvIGVuc3VyZSB0aGF0XG4gIC8vIG5vIGNvbWJpbmF0aW9uIG9mIEVycm9yIENvcnJlY3Rpb24gTGV2ZWwgYW5kIGRhdGEgbWFzayBwYXR0ZXJuXG4gIC8vIHdpbGwgcmVzdWx0IGluIGFuIGFsbC16ZXJvIGRhdGEgc3RyaW5nXG4gIHJldHVybiAoKGRhdGEgPDwgMTApIHwgZCkgXiBHMTVfTUFTS1xufVxuIiwgImNvbnN0IE1vZGUgPSByZXF1aXJlKCcuL21vZGUnKVxuXG5mdW5jdGlvbiBOdW1lcmljRGF0YSAoZGF0YSkge1xuICB0aGlzLm1vZGUgPSBNb2RlLk5VTUVSSUNcbiAgdGhpcy5kYXRhID0gZGF0YS50b1N0cmluZygpXG59XG5cbk51bWVyaWNEYXRhLmdldEJpdHNMZW5ndGggPSBmdW5jdGlvbiBnZXRCaXRzTGVuZ3RoIChsZW5ndGgpIHtcbiAgcmV0dXJuIDEwICogTWF0aC5mbG9vcihsZW5ndGggLyAzKSArICgobGVuZ3RoICUgMykgPyAoKGxlbmd0aCAlIDMpICogMyArIDEpIDogMClcbn1cblxuTnVtZXJpY0RhdGEucHJvdG90eXBlLmdldExlbmd0aCA9IGZ1bmN0aW9uIGdldExlbmd0aCAoKSB7XG4gIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoXG59XG5cbk51bWVyaWNEYXRhLnByb3RvdHlwZS5nZXRCaXRzTGVuZ3RoID0gZnVuY3Rpb24gZ2V0Qml0c0xlbmd0aCAoKSB7XG4gIHJldHVybiBOdW1lcmljRGF0YS5nZXRCaXRzTGVuZ3RoKHRoaXMuZGF0YS5sZW5ndGgpXG59XG5cbk51bWVyaWNEYXRhLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIHdyaXRlIChiaXRCdWZmZXIpIHtcbiAgbGV0IGksIGdyb3VwLCB2YWx1ZVxuXG4gIC8vIFRoZSBpbnB1dCBkYXRhIHN0cmluZyBpcyBkaXZpZGVkIGludG8gZ3JvdXBzIG9mIHRocmVlIGRpZ2l0cyxcbiAgLy8gYW5kIGVhY2ggZ3JvdXAgaXMgY29udmVydGVkIHRvIGl0cyAxMC1iaXQgYmluYXJ5IGVxdWl2YWxlbnQuXG4gIGZvciAoaSA9IDA7IGkgKyAzIDw9IHRoaXMuZGF0YS5sZW5ndGg7IGkgKz0gMykge1xuICAgIGdyb3VwID0gdGhpcy5kYXRhLnN1YnN0cihpLCAzKVxuICAgIHZhbHVlID0gcGFyc2VJbnQoZ3JvdXAsIDEwKVxuXG4gICAgYml0QnVmZmVyLnB1dCh2YWx1ZSwgMTApXG4gIH1cblxuICAvLyBJZiB0aGUgbnVtYmVyIG9mIGlucHV0IGRpZ2l0cyBpcyBub3QgYW4gZXhhY3QgbXVsdGlwbGUgb2YgdGhyZWUsXG4gIC8vIHRoZSBmaW5hbCBvbmUgb3IgdHdvIGRpZ2l0cyBhcmUgY29udmVydGVkIHRvIDQgb3IgNyBiaXRzIHJlc3BlY3RpdmVseS5cbiAgY29uc3QgcmVtYWluaW5nTnVtID0gdGhpcy5kYXRhLmxlbmd0aCAtIGlcbiAgaWYgKHJlbWFpbmluZ051bSA+IDApIHtcbiAgICBncm91cCA9IHRoaXMuZGF0YS5zdWJzdHIoaSlcbiAgICB2YWx1ZSA9IHBhcnNlSW50KGdyb3VwLCAxMClcblxuICAgIGJpdEJ1ZmZlci5wdXQodmFsdWUsIHJlbWFpbmluZ051bSAqIDMgKyAxKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTnVtZXJpY0RhdGFcbiIsICJjb25zdCBNb2RlID0gcmVxdWlyZSgnLi9tb2RlJylcblxuLyoqXG4gKiBBcnJheSBvZiBjaGFyYWN0ZXJzIGF2YWlsYWJsZSBpbiBhbHBoYW51bWVyaWMgbW9kZVxuICpcbiAqIEFzIHBlciBRUiBDb2RlIHNwZWNpZmljYXRpb24sIHRvIGVhY2ggY2hhcmFjdGVyXG4gKiBpcyBhc3NpZ25lZCBhIHZhbHVlIGZyb20gMCB0byA0NCB3aGljaCBpbiB0aGlzIGNhc2UgY29pbmNpZGVzXG4gKiB3aXRoIHRoZSBhcnJheSBpbmRleFxuICpcbiAqIEB0eXBlIHtBcnJheX1cbiAqL1xuY29uc3QgQUxQSEFfTlVNX0NIQVJTID0gW1xuICAnMCcsICcxJywgJzInLCAnMycsICc0JywgJzUnLCAnNicsICc3JywgJzgnLCAnOScsXG4gICdBJywgJ0InLCAnQycsICdEJywgJ0UnLCAnRicsICdHJywgJ0gnLCAnSScsICdKJywgJ0snLCAnTCcsICdNJyxcbiAgJ04nLCAnTycsICdQJywgJ1EnLCAnUicsICdTJywgJ1QnLCAnVScsICdWJywgJ1cnLCAnWCcsICdZJywgJ1onLFxuICAnICcsICckJywgJyUnLCAnKicsICcrJywgJy0nLCAnLicsICcvJywgJzonXG5dXG5cbmZ1bmN0aW9uIEFscGhhbnVtZXJpY0RhdGEgKGRhdGEpIHtcbiAgdGhpcy5tb2RlID0gTW9kZS5BTFBIQU5VTUVSSUNcbiAgdGhpcy5kYXRhID0gZGF0YVxufVxuXG5BbHBoYW51bWVyaWNEYXRhLmdldEJpdHNMZW5ndGggPSBmdW5jdGlvbiBnZXRCaXRzTGVuZ3RoIChsZW5ndGgpIHtcbiAgcmV0dXJuIDExICogTWF0aC5mbG9vcihsZW5ndGggLyAyKSArIDYgKiAobGVuZ3RoICUgMilcbn1cblxuQWxwaGFudW1lcmljRGF0YS5wcm90b3R5cGUuZ2V0TGVuZ3RoID0gZnVuY3Rpb24gZ2V0TGVuZ3RoICgpIHtcbiAgcmV0dXJuIHRoaXMuZGF0YS5sZW5ndGhcbn1cblxuQWxwaGFudW1lcmljRGF0YS5wcm90b3R5cGUuZ2V0Qml0c0xlbmd0aCA9IGZ1bmN0aW9uIGdldEJpdHNMZW5ndGggKCkge1xuICByZXR1cm4gQWxwaGFudW1lcmljRGF0YS5nZXRCaXRzTGVuZ3RoKHRoaXMuZGF0YS5sZW5ndGgpXG59XG5cbkFscGhhbnVtZXJpY0RhdGEucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gd3JpdGUgKGJpdEJ1ZmZlcikge1xuICBsZXQgaVxuXG4gIC8vIElucHV0IGRhdGEgY2hhcmFjdGVycyBhcmUgZGl2aWRlZCBpbnRvIGdyb3VwcyBvZiB0d28gY2hhcmFjdGVyc1xuICAvLyBhbmQgZW5jb2RlZCBhcyAxMS1iaXQgYmluYXJ5IGNvZGVzLlxuICBmb3IgKGkgPSAwOyBpICsgMiA8PSB0aGlzLmRhdGEubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAvLyBUaGUgY2hhcmFjdGVyIHZhbHVlIG9mIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaXMgbXVsdGlwbGllZCBieSA0NVxuICAgIGxldCB2YWx1ZSA9IEFMUEhBX05VTV9DSEFSUy5pbmRleE9mKHRoaXMuZGF0YVtpXSkgKiA0NVxuXG4gICAgLy8gVGhlIGNoYXJhY3RlciB2YWx1ZSBvZiB0aGUgc2Vjb25kIGRpZ2l0IGlzIGFkZGVkIHRvIHRoZSBwcm9kdWN0XG4gICAgdmFsdWUgKz0gQUxQSEFfTlVNX0NIQVJTLmluZGV4T2YodGhpcy5kYXRhW2kgKyAxXSlcblxuICAgIC8vIFRoZSBzdW0gaXMgdGhlbiBzdG9yZWQgYXMgMTEtYml0IGJpbmFyeSBudW1iZXJcbiAgICBiaXRCdWZmZXIucHV0KHZhbHVlLCAxMSlcbiAgfVxuXG4gIC8vIElmIHRoZSBudW1iZXIgb2YgaW5wdXQgZGF0YSBjaGFyYWN0ZXJzIGlzIG5vdCBhIG11bHRpcGxlIG9mIHR3byxcbiAgLy8gdGhlIGNoYXJhY3RlciB2YWx1ZSBvZiB0aGUgZmluYWwgY2hhcmFjdGVyIGlzIGVuY29kZWQgYXMgYSA2LWJpdCBiaW5hcnkgbnVtYmVyLlxuICBpZiAodGhpcy5kYXRhLmxlbmd0aCAlIDIpIHtcbiAgICBiaXRCdWZmZXIucHV0KEFMUEhBX05VTV9DSEFSUy5pbmRleE9mKHRoaXMuZGF0YVtpXSksIDYpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBBbHBoYW51bWVyaWNEYXRhXG4iLCAiY29uc3QgTW9kZSA9IHJlcXVpcmUoJy4vbW9kZScpXG5cbmZ1bmN0aW9uIEJ5dGVEYXRhIChkYXRhKSB7XG4gIHRoaXMubW9kZSA9IE1vZGUuQllURVxuICBpZiAodHlwZW9mIChkYXRhKSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLmRhdGEgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoZGF0YSlcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRhdGEgPSBuZXcgVWludDhBcnJheShkYXRhKVxuICB9XG59XG5cbkJ5dGVEYXRhLmdldEJpdHNMZW5ndGggPSBmdW5jdGlvbiBnZXRCaXRzTGVuZ3RoIChsZW5ndGgpIHtcbiAgcmV0dXJuIGxlbmd0aCAqIDhcbn1cblxuQnl0ZURhdGEucHJvdG90eXBlLmdldExlbmd0aCA9IGZ1bmN0aW9uIGdldExlbmd0aCAoKSB7XG4gIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoXG59XG5cbkJ5dGVEYXRhLnByb3RvdHlwZS5nZXRCaXRzTGVuZ3RoID0gZnVuY3Rpb24gZ2V0Qml0c0xlbmd0aCAoKSB7XG4gIHJldHVybiBCeXRlRGF0YS5nZXRCaXRzTGVuZ3RoKHRoaXMuZGF0YS5sZW5ndGgpXG59XG5cbkJ5dGVEYXRhLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uIChiaXRCdWZmZXIpIHtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSB0aGlzLmRhdGEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgYml0QnVmZmVyLnB1dCh0aGlzLmRhdGFbaV0sIDgpXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCeXRlRGF0YVxuIiwgImNvbnN0IE1vZGUgPSByZXF1aXJlKCcuL21vZGUnKVxuY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcblxuZnVuY3Rpb24gS2FuamlEYXRhIChkYXRhKSB7XG4gIHRoaXMubW9kZSA9IE1vZGUuS0FOSklcbiAgdGhpcy5kYXRhID0gZGF0YVxufVxuXG5LYW5qaURhdGEuZ2V0Qml0c0xlbmd0aCA9IGZ1bmN0aW9uIGdldEJpdHNMZW5ndGggKGxlbmd0aCkge1xuICByZXR1cm4gbGVuZ3RoICogMTNcbn1cblxuS2FuamlEYXRhLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiBnZXRMZW5ndGggKCkge1xuICByZXR1cm4gdGhpcy5kYXRhLmxlbmd0aFxufVxuXG5LYW5qaURhdGEucHJvdG90eXBlLmdldEJpdHNMZW5ndGggPSBmdW5jdGlvbiBnZXRCaXRzTGVuZ3RoICgpIHtcbiAgcmV0dXJuIEthbmppRGF0YS5nZXRCaXRzTGVuZ3RoKHRoaXMuZGF0YS5sZW5ndGgpXG59XG5cbkthbmppRGF0YS5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoYml0QnVmZmVyKSB7XG4gIGxldCBpXG5cbiAgLy8gSW4gdGhlIFNoaWZ0IEpJUyBzeXN0ZW0sIEthbmppIGNoYXJhY3RlcnMgYXJlIHJlcHJlc2VudGVkIGJ5IGEgdHdvIGJ5dGUgY29tYmluYXRpb24uXG4gIC8vIFRoZXNlIGJ5dGUgdmFsdWVzIGFyZSBzaGlmdGVkIGZyb20gdGhlIEpJUyBYIDAyMDggdmFsdWVzLlxuICAvLyBKSVMgWCAwMjA4IGdpdmVzIGRldGFpbHMgb2YgdGhlIHNoaWZ0IGNvZGVkIHJlcHJlc2VudGF0aW9uLlxuICBmb3IgKGkgPSAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IHZhbHVlID0gVXRpbHMudG9TSklTKHRoaXMuZGF0YVtpXSlcblxuICAgIC8vIEZvciBjaGFyYWN0ZXJzIHdpdGggU2hpZnQgSklTIHZhbHVlcyBmcm9tIDB4ODE0MCB0byAweDlGRkM6XG4gICAgaWYgKHZhbHVlID49IDB4ODE0MCAmJiB2YWx1ZSA8PSAweDlGRkMpIHtcbiAgICAgIC8vIFN1YnRyYWN0IDB4ODE0MCBmcm9tIFNoaWZ0IEpJUyB2YWx1ZVxuICAgICAgdmFsdWUgLT0gMHg4MTQwXG5cbiAgICAvLyBGb3IgY2hhcmFjdGVycyB3aXRoIFNoaWZ0IEpJUyB2YWx1ZXMgZnJvbSAweEUwNDAgdG8gMHhFQkJGXG4gICAgfSBlbHNlIGlmICh2YWx1ZSA+PSAweEUwNDAgJiYgdmFsdWUgPD0gMHhFQkJGKSB7XG4gICAgICAvLyBTdWJ0cmFjdCAweEMxNDAgZnJvbSBTaGlmdCBKSVMgdmFsdWVcbiAgICAgIHZhbHVlIC09IDB4QzE0MFxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIFNKSVMgY2hhcmFjdGVyOiAnICsgdGhpcy5kYXRhW2ldICsgJ1xcbicgK1xuICAgICAgICAnTWFrZSBzdXJlIHlvdXIgY2hhcnNldCBpcyBVVEYtOCcpXG4gICAgfVxuXG4gICAgLy8gTXVsdGlwbHkgbW9zdCBzaWduaWZpY2FudCBieXRlIG9mIHJlc3VsdCBieSAweEMwXG4gICAgLy8gYW5kIGFkZCBsZWFzdCBzaWduaWZpY2FudCBieXRlIHRvIHByb2R1Y3RcbiAgICB2YWx1ZSA9ICgoKHZhbHVlID4+PiA4KSAmIDB4ZmYpICogMHhDMCkgKyAodmFsdWUgJiAweGZmKVxuXG4gICAgLy8gQ29udmVydCByZXN1bHQgdG8gYSAxMy1iaXQgYmluYXJ5IHN0cmluZ1xuICAgIGJpdEJ1ZmZlci5wdXQodmFsdWUsIDEzKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gS2FuamlEYXRhXG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBDcmVhdGVkIDIwMDgtMDgtMTkuXG4gKlxuICogRGlqa3N0cmEgcGF0aC1maW5kaW5nIGZ1bmN0aW9ucy4gQWRhcHRlZCBmcm9tIHRoZSBEaWprc3RhciBQeXRob24gcHJvamVjdC5cbiAqXG4gKiBDb3B5cmlnaHQgKEMpIDIwMDhcbiAqICAgV3lhdHQgQmFsZHdpbiA8c2VsZkB3eWF0dGJhbGR3aW4uY29tPlxuICogICBBbGwgcmlnaHRzIHJlc2VydmVkXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICpcbiAqICAgaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHBcbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbnZhciBkaWprc3RyYSA9IHtcbiAgc2luZ2xlX3NvdXJjZV9zaG9ydGVzdF9wYXRoczogZnVuY3Rpb24oZ3JhcGgsIHMsIGQpIHtcbiAgICAvLyBQcmVkZWNlc3NvciBtYXAgZm9yIGVhY2ggbm9kZSB0aGF0IGhhcyBiZWVuIGVuY291bnRlcmVkLlxuICAgIC8vIG5vZGUgSUQgPT4gcHJlZGVjZXNzb3Igbm9kZSBJRFxuICAgIHZhciBwcmVkZWNlc3NvcnMgPSB7fTtcblxuICAgIC8vIENvc3RzIG9mIHNob3J0ZXN0IHBhdGhzIGZyb20gcyB0byBhbGwgbm9kZXMgZW5jb3VudGVyZWQuXG4gICAgLy8gbm9kZSBJRCA9PiBjb3N0XG4gICAgdmFyIGNvc3RzID0ge307XG4gICAgY29zdHNbc10gPSAwO1xuXG4gICAgLy8gQ29zdHMgb2Ygc2hvcnRlc3QgcGF0aHMgZnJvbSBzIHRvIGFsbCBub2RlcyBlbmNvdW50ZXJlZDsgZGlmZmVycyBmcm9tXG4gICAgLy8gYGNvc3RzYCBpbiB0aGF0IGl0IHByb3ZpZGVzIGVhc3kgYWNjZXNzIHRvIHRoZSBub2RlIHRoYXQgY3VycmVudGx5IGhhc1xuICAgIC8vIHRoZSBrbm93biBzaG9ydGVzdCBwYXRoIGZyb20gcy5cbiAgICAvLyBYWFg6IERvIHdlIGFjdHVhbGx5IG5lZWQgYm90aCBgY29zdHNgIGFuZCBgb3BlbmA/XG4gICAgdmFyIG9wZW4gPSBkaWprc3RyYS5Qcmlvcml0eVF1ZXVlLm1ha2UoKTtcbiAgICBvcGVuLnB1c2gocywgMCk7XG5cbiAgICB2YXIgY2xvc2VzdCxcbiAgICAgICAgdSwgdixcbiAgICAgICAgY29zdF9vZl9zX3RvX3UsXG4gICAgICAgIGFkamFjZW50X25vZGVzLFxuICAgICAgICBjb3N0X29mX2UsXG4gICAgICAgIGNvc3Rfb2Zfc190b191X3BsdXNfY29zdF9vZl9lLFxuICAgICAgICBjb3N0X29mX3NfdG9fdixcbiAgICAgICAgZmlyc3RfdmlzaXQ7XG4gICAgd2hpbGUgKCFvcGVuLmVtcHR5KCkpIHtcbiAgICAgIC8vIEluIHRoZSBub2RlcyByZW1haW5pbmcgaW4gZ3JhcGggdGhhdCBoYXZlIGEga25vd24gY29zdCBmcm9tIHMsXG4gICAgICAvLyBmaW5kIHRoZSBub2RlLCB1LCB0aGF0IGN1cnJlbnRseSBoYXMgdGhlIHNob3J0ZXN0IHBhdGggZnJvbSBzLlxuICAgICAgY2xvc2VzdCA9IG9wZW4ucG9wKCk7XG4gICAgICB1ID0gY2xvc2VzdC52YWx1ZTtcbiAgICAgIGNvc3Rfb2Zfc190b191ID0gY2xvc2VzdC5jb3N0O1xuXG4gICAgICAvLyBHZXQgbm9kZXMgYWRqYWNlbnQgdG8gdS4uLlxuICAgICAgYWRqYWNlbnRfbm9kZXMgPSBncmFwaFt1XSB8fCB7fTtcblxuICAgICAgLy8gLi4uYW5kIGV4cGxvcmUgdGhlIGVkZ2VzIHRoYXQgY29ubmVjdCB1IHRvIHRob3NlIG5vZGVzLCB1cGRhdGluZ1xuICAgICAgLy8gdGhlIGNvc3Qgb2YgdGhlIHNob3J0ZXN0IHBhdGhzIHRvIGFueSBvciBhbGwgb2YgdGhvc2Ugbm9kZXMgYXNcbiAgICAgIC8vIG5lY2Vzc2FyeS4gdiBpcyB0aGUgbm9kZSBhY3Jvc3MgdGhlIGN1cnJlbnQgZWRnZSBmcm9tIHUuXG4gICAgICBmb3IgKHYgaW4gYWRqYWNlbnRfbm9kZXMpIHtcbiAgICAgICAgaWYgKGFkamFjZW50X25vZGVzLmhhc093blByb3BlcnR5KHYpKSB7XG4gICAgICAgICAgLy8gR2V0IHRoZSBjb3N0IG9mIHRoZSBlZGdlIHJ1bm5pbmcgZnJvbSB1IHRvIHYuXG4gICAgICAgICAgY29zdF9vZl9lID0gYWRqYWNlbnRfbm9kZXNbdl07XG5cbiAgICAgICAgICAvLyBDb3N0IG9mIHMgdG8gdSBwbHVzIHRoZSBjb3N0IG9mIHUgdG8gdiBhY3Jvc3MgZS0tdGhpcyBpcyAqYSpcbiAgICAgICAgICAvLyBjb3N0IGZyb20gcyB0byB2IHRoYXQgbWF5IG9yIG1heSBub3QgYmUgbGVzcyB0aGFuIHRoZSBjdXJyZW50XG4gICAgICAgICAgLy8ga25vd24gY29zdCB0byB2LlxuICAgICAgICAgIGNvc3Rfb2Zfc190b191X3BsdXNfY29zdF9vZl9lID0gY29zdF9vZl9zX3RvX3UgKyBjb3N0X29mX2U7XG5cbiAgICAgICAgICAvLyBJZiB3ZSBoYXZlbid0IHZpc2l0ZWQgdiB5ZXQgT1IgaWYgdGhlIGN1cnJlbnQga25vd24gY29zdCBmcm9tIHMgdG9cbiAgICAgICAgICAvLyB2IGlzIGdyZWF0ZXIgdGhhbiB0aGUgbmV3IGNvc3Qgd2UganVzdCBmb3VuZCAoY29zdCBvZiBzIHRvIHUgcGx1c1xuICAgICAgICAgIC8vIGNvc3Qgb2YgdSB0byB2IGFjcm9zcyBlKSwgdXBkYXRlIHYncyBjb3N0IGluIHRoZSBjb3N0IGxpc3QgYW5kXG4gICAgICAgICAgLy8gdXBkYXRlIHYncyBwcmVkZWNlc3NvciBpbiB0aGUgcHJlZGVjZXNzb3IgbGlzdCAoaXQncyBub3cgdSkuXG4gICAgICAgICAgY29zdF9vZl9zX3RvX3YgPSBjb3N0c1t2XTtcbiAgICAgICAgICBmaXJzdF92aXNpdCA9ICh0eXBlb2YgY29zdHNbdl0gPT09ICd1bmRlZmluZWQnKTtcbiAgICAgICAgICBpZiAoZmlyc3RfdmlzaXQgfHwgY29zdF9vZl9zX3RvX3YgPiBjb3N0X29mX3NfdG9fdV9wbHVzX2Nvc3Rfb2ZfZSkge1xuICAgICAgICAgICAgY29zdHNbdl0gPSBjb3N0X29mX3NfdG9fdV9wbHVzX2Nvc3Rfb2ZfZTtcbiAgICAgICAgICAgIG9wZW4ucHVzaCh2LCBjb3N0X29mX3NfdG9fdV9wbHVzX2Nvc3Rfb2ZfZSk7XG4gICAgICAgICAgICBwcmVkZWNlc3NvcnNbdl0gPSB1O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZCAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGNvc3RzW2RdID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdmFyIG1zZyA9IFsnQ291bGQgbm90IGZpbmQgYSBwYXRoIGZyb20gJywgcywgJyB0byAnLCBkLCAnLiddLmpvaW4oJycpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByZWRlY2Vzc29ycztcbiAgfSxcblxuICBleHRyYWN0X3Nob3J0ZXN0X3BhdGhfZnJvbV9wcmVkZWNlc3Nvcl9saXN0OiBmdW5jdGlvbihwcmVkZWNlc3NvcnMsIGQpIHtcbiAgICB2YXIgbm9kZXMgPSBbXTtcbiAgICB2YXIgdSA9IGQ7XG4gICAgdmFyIHByZWRlY2Vzc29yO1xuICAgIHdoaWxlICh1KSB7XG4gICAgICBub2Rlcy5wdXNoKHUpO1xuICAgICAgcHJlZGVjZXNzb3IgPSBwcmVkZWNlc3NvcnNbdV07XG4gICAgICB1ID0gcHJlZGVjZXNzb3JzW3VdO1xuICAgIH1cbiAgICBub2Rlcy5yZXZlcnNlKCk7XG4gICAgcmV0dXJuIG5vZGVzO1xuICB9LFxuXG4gIGZpbmRfcGF0aDogZnVuY3Rpb24oZ3JhcGgsIHMsIGQpIHtcbiAgICB2YXIgcHJlZGVjZXNzb3JzID0gZGlqa3N0cmEuc2luZ2xlX3NvdXJjZV9zaG9ydGVzdF9wYXRocyhncmFwaCwgcywgZCk7XG4gICAgcmV0dXJuIGRpamtzdHJhLmV4dHJhY3Rfc2hvcnRlc3RfcGF0aF9mcm9tX3ByZWRlY2Vzc29yX2xpc3QoXG4gICAgICBwcmVkZWNlc3NvcnMsIGQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBIHZlcnkgbmFpdmUgcHJpb3JpdHkgcXVldWUgaW1wbGVtZW50YXRpb24uXG4gICAqL1xuICBQcmlvcml0eVF1ZXVlOiB7XG4gICAgbWFrZTogZnVuY3Rpb24gKG9wdHMpIHtcbiAgICAgIHZhciBUID0gZGlqa3N0cmEuUHJpb3JpdHlRdWV1ZSxcbiAgICAgICAgICB0ID0ge30sXG4gICAgICAgICAga2V5O1xuICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICBmb3IgKGtleSBpbiBUKSB7XG4gICAgICAgIGlmIChULmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICB0W2tleV0gPSBUW2tleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHQucXVldWUgPSBbXTtcbiAgICAgIHQuc29ydGVyID0gb3B0cy5zb3J0ZXIgfHwgVC5kZWZhdWx0X3NvcnRlcjtcbiAgICAgIHJldHVybiB0O1xuICAgIH0sXG5cbiAgICBkZWZhdWx0X3NvcnRlcjogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIHJldHVybiBhLmNvc3QgLSBiLmNvc3Q7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyBpdGVtIHRvIHRoZSBxdWV1ZSBhbmQgZW5zdXJlIHRoZSBoaWdoZXN0IHByaW9yaXR5IGVsZW1lbnRcbiAgICAgKiBpcyBhdCB0aGUgZnJvbnQgb2YgdGhlIHF1ZXVlLlxuICAgICAqL1xuICAgIHB1c2g6IGZ1bmN0aW9uICh2YWx1ZSwgY29zdCkge1xuICAgICAgdmFyIGl0ZW0gPSB7dmFsdWU6IHZhbHVlLCBjb3N0OiBjb3N0fTtcbiAgICAgIHRoaXMucXVldWUucHVzaChpdGVtKTtcbiAgICAgIHRoaXMucXVldWUuc29ydCh0aGlzLnNvcnRlcik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgaGlnaGVzdCBwcmlvcml0eSBlbGVtZW50IGluIHRoZSBxdWV1ZS5cbiAgICAgKi9cbiAgICBwb3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB0aGlzLnF1ZXVlLnNoaWZ0KCk7XG4gICAgfSxcblxuICAgIGVtcHR5OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5xdWV1ZS5sZW5ndGggPT09IDA7XG4gICAgfVxuICB9XG59O1xuXG5cbi8vIG5vZGUuanMgbW9kdWxlIGV4cG9ydHNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICBtb2R1bGUuZXhwb3J0cyA9IGRpamtzdHJhO1xufVxuIiwgImNvbnN0IE1vZGUgPSByZXF1aXJlKCcuL21vZGUnKVxuY29uc3QgTnVtZXJpY0RhdGEgPSByZXF1aXJlKCcuL251bWVyaWMtZGF0YScpXG5jb25zdCBBbHBoYW51bWVyaWNEYXRhID0gcmVxdWlyZSgnLi9hbHBoYW51bWVyaWMtZGF0YScpXG5jb25zdCBCeXRlRGF0YSA9IHJlcXVpcmUoJy4vYnl0ZS1kYXRhJylcbmNvbnN0IEthbmppRGF0YSA9IHJlcXVpcmUoJy4va2FuamktZGF0YScpXG5jb25zdCBSZWdleCA9IHJlcXVpcmUoJy4vcmVnZXgnKVxuY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcbmNvbnN0IGRpamtzdHJhID0gcmVxdWlyZSgnZGlqa3N0cmFqcycpXG5cbi8qKlxuICogUmV0dXJucyBVVEY4IGJ5dGUgbGVuZ3RoXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzdHIgSW5wdXQgc3RyaW5nXG4gKiBAcmV0dXJuIHtOdW1iZXJ9ICAgICBOdW1iZXIgb2YgYnl0ZVxuICovXG5mdW5jdGlvbiBnZXRTdHJpbmdCeXRlTGVuZ3RoIChzdHIpIHtcbiAgcmV0dXJuIHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKS5sZW5ndGhcbn1cblxuLyoqXG4gKiBHZXQgYSBsaXN0IG9mIHNlZ21lbnRzIG9mIHRoZSBzcGVjaWZpZWQgbW9kZVxuICogZnJvbSBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSAge01vZGV9ICAgbW9kZSBTZWdtZW50IG1vZGVcbiAqIEBwYXJhbSAge1N0cmluZ30gc3RyICBTdHJpbmcgdG8gcHJvY2Vzc1xuICogQHJldHVybiB7QXJyYXl9ICAgICAgIEFycmF5IG9mIG9iamVjdCB3aXRoIHNlZ21lbnRzIGRhdGFcbiAqL1xuZnVuY3Rpb24gZ2V0U2VnbWVudHMgKHJlZ2V4LCBtb2RlLCBzdHIpIHtcbiAgY29uc3Qgc2VnbWVudHMgPSBbXVxuICBsZXQgcmVzdWx0XG5cbiAgd2hpbGUgKChyZXN1bHQgPSByZWdleC5leGVjKHN0cikpICE9PSBudWxsKSB7XG4gICAgc2VnbWVudHMucHVzaCh7XG4gICAgICBkYXRhOiByZXN1bHRbMF0sXG4gICAgICBpbmRleDogcmVzdWx0LmluZGV4LFxuICAgICAgbW9kZTogbW9kZSxcbiAgICAgIGxlbmd0aDogcmVzdWx0WzBdLmxlbmd0aFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gc2VnbWVudHNcbn1cblxuLyoqXG4gKiBFeHRyYWN0cyBhIHNlcmllcyBvZiBzZWdtZW50cyB3aXRoIHRoZSBhcHByb3ByaWF0ZVxuICogbW9kZXMgZnJvbSBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YVN0ciBJbnB1dCBzdHJpbmdcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICBBcnJheSBvZiBvYmplY3Qgd2l0aCBzZWdtZW50cyBkYXRhXG4gKi9cbmZ1bmN0aW9uIGdldFNlZ21lbnRzRnJvbVN0cmluZyAoZGF0YVN0cikge1xuICBjb25zdCBudW1TZWdzID0gZ2V0U2VnbWVudHMoUmVnZXguTlVNRVJJQywgTW9kZS5OVU1FUklDLCBkYXRhU3RyKVxuICBjb25zdCBhbHBoYU51bVNlZ3MgPSBnZXRTZWdtZW50cyhSZWdleC5BTFBIQU5VTUVSSUMsIE1vZGUuQUxQSEFOVU1FUklDLCBkYXRhU3RyKVxuICBsZXQgYnl0ZVNlZ3NcbiAgbGV0IGthbmppU2Vnc1xuXG4gIGlmIChVdGlscy5pc0thbmppTW9kZUVuYWJsZWQoKSkge1xuICAgIGJ5dGVTZWdzID0gZ2V0U2VnbWVudHMoUmVnZXguQllURSwgTW9kZS5CWVRFLCBkYXRhU3RyKVxuICAgIGthbmppU2VncyA9IGdldFNlZ21lbnRzKFJlZ2V4LktBTkpJLCBNb2RlLktBTkpJLCBkYXRhU3RyKVxuICB9IGVsc2Uge1xuICAgIGJ5dGVTZWdzID0gZ2V0U2VnbWVudHMoUmVnZXguQllURV9LQU5KSSwgTW9kZS5CWVRFLCBkYXRhU3RyKVxuICAgIGthbmppU2VncyA9IFtdXG4gIH1cblxuICBjb25zdCBzZWdzID0gbnVtU2Vncy5jb25jYXQoYWxwaGFOdW1TZWdzLCBieXRlU2Vncywga2FuamlTZWdzKVxuXG4gIHJldHVybiBzZWdzXG4gICAgLnNvcnQoZnVuY3Rpb24gKHMxLCBzMikge1xuICAgICAgcmV0dXJuIHMxLmluZGV4IC0gczIuaW5kZXhcbiAgICB9KVxuICAgIC5tYXAoZnVuY3Rpb24gKG9iaikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZGF0YTogb2JqLmRhdGEsXG4gICAgICAgIG1vZGU6IG9iai5tb2RlLFxuICAgICAgICBsZW5ndGg6IG9iai5sZW5ndGhcbiAgICAgIH1cbiAgICB9KVxufVxuXG4vKipcbiAqIFJldHVybnMgaG93IG1hbnkgYml0cyBhcmUgbmVlZGVkIHRvIGVuY29kZSBhIHN0cmluZyBvZlxuICogc3BlY2lmaWVkIGxlbmd0aCB3aXRoIHRoZSBzcGVjaWZpZWQgbW9kZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gbGVuZ3RoIFN0cmluZyBsZW5ndGhcbiAqIEBwYXJhbSAge01vZGV9IG1vZGUgICAgIFNlZ21lbnQgbW9kZVxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgQml0IGxlbmd0aFxuICovXG5mdW5jdGlvbiBnZXRTZWdtZW50Qml0c0xlbmd0aCAobGVuZ3RoLCBtb2RlKSB7XG4gIHN3aXRjaCAobW9kZSkge1xuICAgIGNhc2UgTW9kZS5OVU1FUklDOlxuICAgICAgcmV0dXJuIE51bWVyaWNEYXRhLmdldEJpdHNMZW5ndGgobGVuZ3RoKVxuICAgIGNhc2UgTW9kZS5BTFBIQU5VTUVSSUM6XG4gICAgICByZXR1cm4gQWxwaGFudW1lcmljRGF0YS5nZXRCaXRzTGVuZ3RoKGxlbmd0aClcbiAgICBjYXNlIE1vZGUuS0FOSkk6XG4gICAgICByZXR1cm4gS2FuamlEYXRhLmdldEJpdHNMZW5ndGgobGVuZ3RoKVxuICAgIGNhc2UgTW9kZS5CWVRFOlxuICAgICAgcmV0dXJuIEJ5dGVEYXRhLmdldEJpdHNMZW5ndGgobGVuZ3RoKVxuICB9XG59XG5cbi8qKlxuICogTWVyZ2VzIGFkamFjZW50IHNlZ21lbnRzIHdoaWNoIGhhdmUgdGhlIHNhbWUgbW9kZVxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBzZWdzIEFycmF5IG9mIG9iamVjdCB3aXRoIHNlZ21lbnRzIGRhdGFcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgIEFycmF5IG9mIG9iamVjdCB3aXRoIHNlZ21lbnRzIGRhdGFcbiAqL1xuZnVuY3Rpb24gbWVyZ2VTZWdtZW50cyAoc2Vncykge1xuICByZXR1cm4gc2Vncy5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgY3Vycikge1xuICAgIGNvbnN0IHByZXZTZWcgPSBhY2MubGVuZ3RoIC0gMSA+PSAwID8gYWNjW2FjYy5sZW5ndGggLSAxXSA6IG51bGxcbiAgICBpZiAocHJldlNlZyAmJiBwcmV2U2VnLm1vZGUgPT09IGN1cnIubW9kZSkge1xuICAgICAgYWNjW2FjYy5sZW5ndGggLSAxXS5kYXRhICs9IGN1cnIuZGF0YVxuICAgICAgcmV0dXJuIGFjY1xuICAgIH1cblxuICAgIGFjYy5wdXNoKGN1cnIpXG4gICAgcmV0dXJuIGFjY1xuICB9LCBbXSlcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBsaXN0IG9mIGFsbCBwb3NzaWJsZSBub2RlcyBjb21iaW5hdGlvbiB3aGljaFxuICogd2lsbCBiZSB1c2VkIHRvIGJ1aWxkIGEgc2VnbWVudHMgZ3JhcGguXG4gKlxuICogTm9kZXMgYXJlIGRpdmlkZWQgYnkgZ3JvdXBzLiBFYWNoIGdyb3VwIHdpbGwgY29udGFpbiBhIGxpc3Qgb2YgYWxsIHRoZSBtb2Rlc1xuICogaW4gd2hpY2ggaXMgcG9zc2libGUgdG8gZW5jb2RlIHRoZSBnaXZlbiB0ZXh0LlxuICpcbiAqIEZvciBleGFtcGxlIHRoZSB0ZXh0ICcxMjM0NScgY2FuIGJlIGVuY29kZWQgYXMgTnVtZXJpYywgQWxwaGFudW1lcmljIG9yIEJ5dGUuXG4gKiBUaGUgZ3JvdXAgZm9yICcxMjM0NScgd2lsbCBjb250YWluIHRoZW4gMyBvYmplY3RzLCBvbmUgZm9yIGVhY2hcbiAqIHBvc3NpYmxlIGVuY29kaW5nIG1vZGUuXG4gKlxuICogRWFjaCBub2RlIHJlcHJlc2VudHMgYSBwb3NzaWJsZSBzZWdtZW50LlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBzZWdzIEFycmF5IG9mIG9iamVjdCB3aXRoIHNlZ21lbnRzIGRhdGFcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgIEFycmF5IG9mIG9iamVjdCB3aXRoIHNlZ21lbnRzIGRhdGFcbiAqL1xuZnVuY3Rpb24gYnVpbGROb2RlcyAoc2Vncykge1xuICBjb25zdCBub2RlcyA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc2Vncy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHNlZyA9IHNlZ3NbaV1cblxuICAgIHN3aXRjaCAoc2VnLm1vZGUpIHtcbiAgICAgIGNhc2UgTW9kZS5OVU1FUklDOlxuICAgICAgICBub2Rlcy5wdXNoKFtzZWcsXG4gICAgICAgICAgeyBkYXRhOiBzZWcuZGF0YSwgbW9kZTogTW9kZS5BTFBIQU5VTUVSSUMsIGxlbmd0aDogc2VnLmxlbmd0aCB9LFxuICAgICAgICAgIHsgZGF0YTogc2VnLmRhdGEsIG1vZGU6IE1vZGUuQllURSwgbGVuZ3RoOiBzZWcubGVuZ3RoIH1cbiAgICAgICAgXSlcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgTW9kZS5BTFBIQU5VTUVSSUM6XG4gICAgICAgIG5vZGVzLnB1c2goW3NlZyxcbiAgICAgICAgICB7IGRhdGE6IHNlZy5kYXRhLCBtb2RlOiBNb2RlLkJZVEUsIGxlbmd0aDogc2VnLmxlbmd0aCB9XG4gICAgICAgIF0pXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIE1vZGUuS0FOSkk6XG4gICAgICAgIG5vZGVzLnB1c2goW3NlZyxcbiAgICAgICAgICB7IGRhdGE6IHNlZy5kYXRhLCBtb2RlOiBNb2RlLkJZVEUsIGxlbmd0aDogZ2V0U3RyaW5nQnl0ZUxlbmd0aChzZWcuZGF0YSkgfVxuICAgICAgICBdKVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBNb2RlLkJZVEU6XG4gICAgICAgIG5vZGVzLnB1c2goW1xuICAgICAgICAgIHsgZGF0YTogc2VnLmRhdGEsIG1vZGU6IE1vZGUuQllURSwgbGVuZ3RoOiBnZXRTdHJpbmdCeXRlTGVuZ3RoKHNlZy5kYXRhKSB9XG4gICAgICAgIF0pXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5vZGVzXG59XG5cbi8qKlxuICogQnVpbGRzIGEgZ3JhcGggZnJvbSBhIGxpc3Qgb2Ygbm9kZXMuXG4gKiBBbGwgc2VnbWVudHMgaW4gZWFjaCBub2RlIGdyb3VwIHdpbGwgYmUgY29ubmVjdGVkIHdpdGggYWxsIHRoZSBzZWdtZW50cyBvZlxuICogdGhlIG5leHQgZ3JvdXAgYW5kIHNvIG9uLlxuICpcbiAqIEF0IGVhY2ggY29ubmVjdGlvbiB3aWxsIGJlIGFzc2lnbmVkIGEgd2VpZ2h0IGRlcGVuZGluZyBvbiB0aGVcbiAqIHNlZ21lbnQncyBieXRlIGxlbmd0aC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gbm9kZXMgICAgQXJyYXkgb2Ygb2JqZWN0IHdpdGggc2VnbWVudHMgZGF0YVxuICogQHBhcmFtICB7TnVtYmVyfSB2ZXJzaW9uIFFSIENvZGUgdmVyc2lvblxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIEdyYXBoIG9mIGFsbCBwb3NzaWJsZSBzZWdtZW50c1xuICovXG5mdW5jdGlvbiBidWlsZEdyYXBoIChub2RlcywgdmVyc2lvbikge1xuICBjb25zdCB0YWJsZSA9IHt9XG4gIGNvbnN0IGdyYXBoID0geyBzdGFydDoge30gfVxuICBsZXQgcHJldk5vZGVJZHMgPSBbJ3N0YXJ0J11cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgbm9kZUdyb3VwID0gbm9kZXNbaV1cbiAgICBjb25zdCBjdXJyZW50Tm9kZUlkcyA9IFtdXG5cbiAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5vZGVHcm91cC5sZW5ndGg7IGorKykge1xuICAgICAgY29uc3Qgbm9kZSA9IG5vZGVHcm91cFtqXVxuICAgICAgY29uc3Qga2V5ID0gJycgKyBpICsgalxuXG4gICAgICBjdXJyZW50Tm9kZUlkcy5wdXNoKGtleSlcbiAgICAgIHRhYmxlW2tleV0gPSB7IG5vZGU6IG5vZGUsIGxhc3RDb3VudDogMCB9XG4gICAgICBncmFwaFtrZXldID0ge31cblxuICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBwcmV2Tm9kZUlkcy5sZW5ndGg7IG4rKykge1xuICAgICAgICBjb25zdCBwcmV2Tm9kZUlkID0gcHJldk5vZGVJZHNbbl1cblxuICAgICAgICBpZiAodGFibGVbcHJldk5vZGVJZF0gJiYgdGFibGVbcHJldk5vZGVJZF0ubm9kZS5tb2RlID09PSBub2RlLm1vZGUpIHtcbiAgICAgICAgICBncmFwaFtwcmV2Tm9kZUlkXVtrZXldID1cbiAgICAgICAgICAgIGdldFNlZ21lbnRCaXRzTGVuZ3RoKHRhYmxlW3ByZXZOb2RlSWRdLmxhc3RDb3VudCArIG5vZGUubGVuZ3RoLCBub2RlLm1vZGUpIC1cbiAgICAgICAgICAgIGdldFNlZ21lbnRCaXRzTGVuZ3RoKHRhYmxlW3ByZXZOb2RlSWRdLmxhc3RDb3VudCwgbm9kZS5tb2RlKVxuXG4gICAgICAgICAgdGFibGVbcHJldk5vZGVJZF0ubGFzdENvdW50ICs9IG5vZGUubGVuZ3RoXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKHRhYmxlW3ByZXZOb2RlSWRdKSB0YWJsZVtwcmV2Tm9kZUlkXS5sYXN0Q291bnQgPSBub2RlLmxlbmd0aFxuXG4gICAgICAgICAgZ3JhcGhbcHJldk5vZGVJZF1ba2V5XSA9IGdldFNlZ21lbnRCaXRzTGVuZ3RoKG5vZGUubGVuZ3RoLCBub2RlLm1vZGUpICtcbiAgICAgICAgICAgIDQgKyBNb2RlLmdldENoYXJDb3VudEluZGljYXRvcihub2RlLm1vZGUsIHZlcnNpb24pIC8vIHN3aXRjaCBjb3N0XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBwcmV2Tm9kZUlkcyA9IGN1cnJlbnROb2RlSWRzXG4gIH1cblxuICBmb3IgKGxldCBuID0gMDsgbiA8IHByZXZOb2RlSWRzLmxlbmd0aDsgbisrKSB7XG4gICAgZ3JhcGhbcHJldk5vZGVJZHNbbl1dLmVuZCA9IDBcbiAgfVxuXG4gIHJldHVybiB7IG1hcDogZ3JhcGgsIHRhYmxlOiB0YWJsZSB9XG59XG5cbi8qKlxuICogQnVpbGRzIGEgc2VnbWVudCBmcm9tIGEgc3BlY2lmaWVkIGRhdGEgYW5kIG1vZGUuXG4gKiBJZiBhIG1vZGUgaXMgbm90IHNwZWNpZmllZCwgdGhlIG1vcmUgc3VpdGFibGUgd2lsbCBiZSB1c2VkLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gZGF0YSAgICAgICAgICAgICBJbnB1dCBkYXRhXG4gKiBAcGFyYW0gIHtNb2RlIHwgU3RyaW5nfSBtb2Rlc0hpbnQgRGF0YSBtb2RlXG4gKiBAcmV0dXJuIHtTZWdtZW50fSAgICAgICAgICAgICAgICAgU2VnbWVudFxuICovXG5mdW5jdGlvbiBidWlsZFNpbmdsZVNlZ21lbnQgKGRhdGEsIG1vZGVzSGludCkge1xuICBsZXQgbW9kZVxuICBjb25zdCBiZXN0TW9kZSA9IE1vZGUuZ2V0QmVzdE1vZGVGb3JEYXRhKGRhdGEpXG5cbiAgbW9kZSA9IE1vZGUuZnJvbShtb2Rlc0hpbnQsIGJlc3RNb2RlKVxuXG4gIC8vIE1ha2Ugc3VyZSBkYXRhIGNhbiBiZSBlbmNvZGVkXG4gIGlmIChtb2RlICE9PSBNb2RlLkJZVEUgJiYgbW9kZS5iaXQgPCBiZXN0TW9kZS5iaXQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIGRhdGEgKyAnXCInICtcbiAgICAgICcgY2Fubm90IGJlIGVuY29kZWQgd2l0aCBtb2RlICcgKyBNb2RlLnRvU3RyaW5nKG1vZGUpICtcbiAgICAgICcuXFxuIFN1Z2dlc3RlZCBtb2RlIGlzOiAnICsgTW9kZS50b1N0cmluZyhiZXN0TW9kZSkpXG4gIH1cblxuICAvLyBVc2UgTW9kZS5CWVRFIGlmIEthbmppIHN1cHBvcnQgaXMgZGlzYWJsZWRcbiAgaWYgKG1vZGUgPT09IE1vZGUuS0FOSkkgJiYgIVV0aWxzLmlzS2FuamlNb2RlRW5hYmxlZCgpKSB7XG4gICAgbW9kZSA9IE1vZGUuQllURVxuICB9XG5cbiAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSBNb2RlLk5VTUVSSUM6XG4gICAgICByZXR1cm4gbmV3IE51bWVyaWNEYXRhKGRhdGEpXG5cbiAgICBjYXNlIE1vZGUuQUxQSEFOVU1FUklDOlxuICAgICAgcmV0dXJuIG5ldyBBbHBoYW51bWVyaWNEYXRhKGRhdGEpXG5cbiAgICBjYXNlIE1vZGUuS0FOSkk6XG4gICAgICByZXR1cm4gbmV3IEthbmppRGF0YShkYXRhKVxuXG4gICAgY2FzZSBNb2RlLkJZVEU6XG4gICAgICByZXR1cm4gbmV3IEJ5dGVEYXRhKGRhdGEpXG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZHMgYSBsaXN0IG9mIHNlZ21lbnRzIGZyb20gYW4gYXJyYXkuXG4gKiBBcnJheSBjYW4gY29udGFpbiBTdHJpbmdzIG9yIE9iamVjdHMgd2l0aCBzZWdtZW50J3MgaW5mby5cbiAqXG4gKiBGb3IgZWFjaCBpdGVtIHdoaWNoIGlzIGEgc3RyaW5nLCB3aWxsIGJlIGdlbmVyYXRlZCBhIHNlZ21lbnQgd2l0aCB0aGUgZ2l2ZW5cbiAqIHN0cmluZyBhbmQgdGhlIG1vcmUgYXBwcm9wcmlhdGUgZW5jb2RpbmcgbW9kZS5cbiAqXG4gKiBGb3IgZWFjaCBpdGVtIHdoaWNoIGlzIGFuIG9iamVjdCwgd2lsbCBiZSBnZW5lcmF0ZWQgYSBzZWdtZW50IHdpdGggdGhlIGdpdmVuXG4gKiBkYXRhIGFuZCBtb2RlLlxuICogT2JqZWN0cyBtdXN0IGNvbnRhaW4gYXQgbGVhc3QgdGhlIHByb3BlcnR5IFwiZGF0YVwiLlxuICogSWYgcHJvcGVydHkgXCJtb2RlXCIgaXMgbm90IHByZXNlbnQsIHRoZSBtb3JlIHN1aXRhYmxlIG1vZGUgd2lsbCBiZSB1c2VkLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBhcnJheSBBcnJheSBvZiBvYmplY3RzIHdpdGggc2VnbWVudHMgZGF0YVxuICogQHJldHVybiB7QXJyYXl9ICAgICAgIEFycmF5IG9mIFNlZ21lbnRzXG4gKi9cbmV4cG9ydHMuZnJvbUFycmF5ID0gZnVuY3Rpb24gZnJvbUFycmF5IChhcnJheSkge1xuICByZXR1cm4gYXJyYXkucmVkdWNlKGZ1bmN0aW9uIChhY2MsIHNlZykge1xuICAgIGlmICh0eXBlb2Ygc2VnID09PSAnc3RyaW5nJykge1xuICAgICAgYWNjLnB1c2goYnVpbGRTaW5nbGVTZWdtZW50KHNlZywgbnVsbCkpXG4gICAgfSBlbHNlIGlmIChzZWcuZGF0YSkge1xuICAgICAgYWNjLnB1c2goYnVpbGRTaW5nbGVTZWdtZW50KHNlZy5kYXRhLCBzZWcubW9kZSkpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFjY1xuICB9LCBbXSlcbn1cblxuLyoqXG4gKiBCdWlsZHMgYW4gb3B0aW1pemVkIHNlcXVlbmNlIG9mIHNlZ21lbnRzIGZyb20gYSBzdHJpbmcsXG4gKiB3aGljaCB3aWxsIHByb2R1Y2UgdGhlIHNob3J0ZXN0IHBvc3NpYmxlIGJpdHN0cmVhbS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGEgICAgSW5wdXQgc3RyaW5nXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHZlcnNpb24gUVIgQ29kZSB2ZXJzaW9uXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgQXJyYXkgb2Ygc2VnbWVudHNcbiAqL1xuZXhwb3J0cy5mcm9tU3RyaW5nID0gZnVuY3Rpb24gZnJvbVN0cmluZyAoZGF0YSwgdmVyc2lvbikge1xuICBjb25zdCBzZWdzID0gZ2V0U2VnbWVudHNGcm9tU3RyaW5nKGRhdGEsIFV0aWxzLmlzS2FuamlNb2RlRW5hYmxlZCgpKVxuXG4gIGNvbnN0IG5vZGVzID0gYnVpbGROb2RlcyhzZWdzKVxuICBjb25zdCBncmFwaCA9IGJ1aWxkR3JhcGgobm9kZXMsIHZlcnNpb24pXG4gIGNvbnN0IHBhdGggPSBkaWprc3RyYS5maW5kX3BhdGgoZ3JhcGgubWFwLCAnc3RhcnQnLCAnZW5kJylcblxuICBjb25zdCBvcHRpbWl6ZWRTZWdzID0gW11cbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBwYXRoLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIG9wdGltaXplZFNlZ3MucHVzaChncmFwaC50YWJsZVtwYXRoW2ldXS5ub2RlKVxuICB9XG5cbiAgcmV0dXJuIGV4cG9ydHMuZnJvbUFycmF5KG1lcmdlU2VnbWVudHMob3B0aW1pemVkU2VncykpXG59XG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGluIHZhcmlvdXMgc2VnbWVudHMgd2l0aCB0aGUgbW9kZXMgd2hpY2hcbiAqIGJlc3QgcmVwcmVzZW50IHRoZWlyIGNvbnRlbnQuXG4gKiBUaGUgcHJvZHVjZWQgc2VnbWVudHMgYXJlIGZhciBmcm9tIGJlaW5nIG9wdGltaXplZC5cbiAqIFRoZSBvdXRwdXQgb2YgdGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgdG8gZXN0aW1hdGUgYSBRUiBDb2RlIHZlcnNpb25cbiAqIHdoaWNoIG1heSBjb250YWluIHRoZSBkYXRhLlxuICpcbiAqIEBwYXJhbSAge3N0cmluZ30gZGF0YSBJbnB1dCBzdHJpbmdcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICBBcnJheSBvZiBzZWdtZW50c1xuICovXG5leHBvcnRzLnJhd1NwbGl0ID0gZnVuY3Rpb24gcmF3U3BsaXQgKGRhdGEpIHtcbiAgcmV0dXJuIGV4cG9ydHMuZnJvbUFycmF5KFxuICAgIGdldFNlZ21lbnRzRnJvbVN0cmluZyhkYXRhLCBVdGlscy5pc0thbmppTW9kZUVuYWJsZWQoKSlcbiAgKVxufVxuIiwgImNvbnN0IFV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG5jb25zdCBFQ0xldmVsID0gcmVxdWlyZSgnLi9lcnJvci1jb3JyZWN0aW9uLWxldmVsJylcbmNvbnN0IEJpdEJ1ZmZlciA9IHJlcXVpcmUoJy4vYml0LWJ1ZmZlcicpXG5jb25zdCBCaXRNYXRyaXggPSByZXF1aXJlKCcuL2JpdC1tYXRyaXgnKVxuY29uc3QgQWxpZ25tZW50UGF0dGVybiA9IHJlcXVpcmUoJy4vYWxpZ25tZW50LXBhdHRlcm4nKVxuY29uc3QgRmluZGVyUGF0dGVybiA9IHJlcXVpcmUoJy4vZmluZGVyLXBhdHRlcm4nKVxuY29uc3QgTWFza1BhdHRlcm4gPSByZXF1aXJlKCcuL21hc2stcGF0dGVybicpXG5jb25zdCBFQ0NvZGUgPSByZXF1aXJlKCcuL2Vycm9yLWNvcnJlY3Rpb24tY29kZScpXG5jb25zdCBSZWVkU29sb21vbkVuY29kZXIgPSByZXF1aXJlKCcuL3JlZWQtc29sb21vbi1lbmNvZGVyJylcbmNvbnN0IFZlcnNpb24gPSByZXF1aXJlKCcuL3ZlcnNpb24nKVxuY29uc3QgRm9ybWF0SW5mbyA9IHJlcXVpcmUoJy4vZm9ybWF0LWluZm8nKVxuY29uc3QgTW9kZSA9IHJlcXVpcmUoJy4vbW9kZScpXG5jb25zdCBTZWdtZW50cyA9IHJlcXVpcmUoJy4vc2VnbWVudHMnKVxuXG4vKipcbiAqIFFSQ29kZSBmb3IgSmF2YVNjcmlwdFxuICpcbiAqIG1vZGlmaWVkIGJ5IFJ5YW4gRGF5IGZvciBub2RlanMgc3VwcG9ydFxuICogQ29weXJpZ2h0IChjKSAyMDExIFJ5YW4gRGF5XG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlOlxuICogICBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICpcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUkNvZGUgZm9yIEphdmFTY3JpcHRcbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgS2F6dWhpa28gQXJhc2Vcbi8vXG4vLyBVUkw6IGh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS9cbi8vXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2U6XG4vLyAgIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4vL1xuLy8gVGhlIHdvcmQgXCJRUiBDb2RlXCIgaXMgcmVnaXN0ZXJlZCB0cmFkZW1hcmsgb2Zcbi8vIERFTlNPIFdBVkUgSU5DT1JQT1JBVEVEXG4vLyAgIGh0dHA6Ly93d3cuZGVuc28td2F2ZS5jb20vcXJjb2RlL2ZhcXBhdGVudC1lLmh0bWxcbi8vXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuKi9cblxuLyoqXG4gKiBBZGQgZmluZGVyIHBhdHRlcm5zIGJpdHMgdG8gbWF0cml4XG4gKlxuICogQHBhcmFtICB7Qml0TWF0cml4fSBtYXRyaXggIE1vZHVsZXMgbWF0cml4XG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgIHZlcnNpb24gUVIgQ29kZSB2ZXJzaW9uXG4gKi9cbmZ1bmN0aW9uIHNldHVwRmluZGVyUGF0dGVybiAobWF0cml4LCB2ZXJzaW9uKSB7XG4gIGNvbnN0IHNpemUgPSBtYXRyaXguc2l6ZVxuICBjb25zdCBwb3MgPSBGaW5kZXJQYXR0ZXJuLmdldFBvc2l0aW9ucyh2ZXJzaW9uKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcG9zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm93ID0gcG9zW2ldWzBdXG4gICAgY29uc3QgY29sID0gcG9zW2ldWzFdXG5cbiAgICBmb3IgKGxldCByID0gLTE7IHIgPD0gNzsgcisrKSB7XG4gICAgICBpZiAocm93ICsgciA8PSAtMSB8fCBzaXplIDw9IHJvdyArIHIpIGNvbnRpbnVlXG5cbiAgICAgIGZvciAobGV0IGMgPSAtMTsgYyA8PSA3OyBjKyspIHtcbiAgICAgICAgaWYgKGNvbCArIGMgPD0gLTEgfHwgc2l6ZSA8PSBjb2wgKyBjKSBjb250aW51ZVxuXG4gICAgICAgIGlmICgociA+PSAwICYmIHIgPD0gNiAmJiAoYyA9PT0gMCB8fCBjID09PSA2KSkgfHxcbiAgICAgICAgICAoYyA+PSAwICYmIGMgPD0gNiAmJiAociA9PT0gMCB8fCByID09PSA2KSkgfHxcbiAgICAgICAgICAociA+PSAyICYmIHIgPD0gNCAmJiBjID49IDIgJiYgYyA8PSA0KSkge1xuICAgICAgICAgIG1hdHJpeC5zZXQocm93ICsgciwgY29sICsgYywgdHJ1ZSwgdHJ1ZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRyaXguc2V0KHJvdyArIHIsIGNvbCArIGMsIGZhbHNlLCB0cnVlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQWRkIHRpbWluZyBwYXR0ZXJuIGJpdHMgdG8gbWF0cml4XG4gKlxuICogTm90ZTogdGhpcyBmdW5jdGlvbiBtdXN0IGJlIGNhbGxlZCBiZWZvcmUge0BsaW5rIHNldHVwQWxpZ25tZW50UGF0dGVybn1cbiAqXG4gKiBAcGFyYW0gIHtCaXRNYXRyaXh9IG1hdHJpeCBNb2R1bGVzIG1hdHJpeFxuICovXG5mdW5jdGlvbiBzZXR1cFRpbWluZ1BhdHRlcm4gKG1hdHJpeCkge1xuICBjb25zdCBzaXplID0gbWF0cml4LnNpemVcblxuICBmb3IgKGxldCByID0gODsgciA8IHNpemUgLSA4OyByKyspIHtcbiAgICBjb25zdCB2YWx1ZSA9IHIgJSAyID09PSAwXG4gICAgbWF0cml4LnNldChyLCA2LCB2YWx1ZSwgdHJ1ZSlcbiAgICBtYXRyaXguc2V0KDYsIHIsIHZhbHVlLCB0cnVlKVxuICB9XG59XG5cbi8qKlxuICogQWRkIGFsaWdubWVudCBwYXR0ZXJucyBiaXRzIHRvIG1hdHJpeFxuICpcbiAqIE5vdGU6IHRoaXMgZnVuY3Rpb24gbXVzdCBiZSBjYWxsZWQgYWZ0ZXIge0BsaW5rIHNldHVwVGltaW5nUGF0dGVybn1cbiAqXG4gKiBAcGFyYW0gIHtCaXRNYXRyaXh9IG1hdHJpeCAgTW9kdWxlcyBtYXRyaXhcbiAqIEBwYXJhbSAge051bWJlcn0gICAgdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqL1xuZnVuY3Rpb24gc2V0dXBBbGlnbm1lbnRQYXR0ZXJuIChtYXRyaXgsIHZlcnNpb24pIHtcbiAgY29uc3QgcG9zID0gQWxpZ25tZW50UGF0dGVybi5nZXRQb3NpdGlvbnModmVyc2lvbilcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBvcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJvdyA9IHBvc1tpXVswXVxuICAgIGNvbnN0IGNvbCA9IHBvc1tpXVsxXVxuXG4gICAgZm9yIChsZXQgciA9IC0yOyByIDw9IDI7IHIrKykge1xuICAgICAgZm9yIChsZXQgYyA9IC0yOyBjIDw9IDI7IGMrKykge1xuICAgICAgICBpZiAociA9PT0gLTIgfHwgciA9PT0gMiB8fCBjID09PSAtMiB8fCBjID09PSAyIHx8XG4gICAgICAgICAgKHIgPT09IDAgJiYgYyA9PT0gMCkpIHtcbiAgICAgICAgICBtYXRyaXguc2V0KHJvdyArIHIsIGNvbCArIGMsIHRydWUsIHRydWUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0cml4LnNldChyb3cgKyByLCBjb2wgKyBjLCBmYWxzZSwgdHJ1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEFkZCB2ZXJzaW9uIGluZm8gYml0cyB0byBtYXRyaXhcbiAqXG4gKiBAcGFyYW0gIHtCaXRNYXRyaXh9IG1hdHJpeCAgTW9kdWxlcyBtYXRyaXhcbiAqIEBwYXJhbSAge051bWJlcn0gICAgdmVyc2lvbiBRUiBDb2RlIHZlcnNpb25cbiAqL1xuZnVuY3Rpb24gc2V0dXBWZXJzaW9uSW5mbyAobWF0cml4LCB2ZXJzaW9uKSB7XG4gIGNvbnN0IHNpemUgPSBtYXRyaXguc2l6ZVxuICBjb25zdCBiaXRzID0gVmVyc2lvbi5nZXRFbmNvZGVkQml0cyh2ZXJzaW9uKVxuICBsZXQgcm93LCBjb2wsIG1vZFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMTg7IGkrKykge1xuICAgIHJvdyA9IE1hdGguZmxvb3IoaSAvIDMpXG4gICAgY29sID0gaSAlIDMgKyBzaXplIC0gOCAtIDNcbiAgICBtb2QgPSAoKGJpdHMgPj4gaSkgJiAxKSA9PT0gMVxuXG4gICAgbWF0cml4LnNldChyb3csIGNvbCwgbW9kLCB0cnVlKVxuICAgIG1hdHJpeC5zZXQoY29sLCByb3csIG1vZCwgdHJ1ZSlcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBmb3JtYXQgaW5mbyBiaXRzIHRvIG1hdHJpeFxuICpcbiAqIEBwYXJhbSAge0JpdE1hdHJpeH0gbWF0cml4ICAgICAgICAgICAgICAgTW9kdWxlcyBtYXRyaXhcbiAqIEBwYXJhbSAge0Vycm9yQ29ycmVjdGlvbkxldmVsfSAgICBlcnJvckNvcnJlY3Rpb25MZXZlbCBFcnJvciBjb3JyZWN0aW9uIGxldmVsXG4gKiBAcGFyYW0gIHtOdW1iZXJ9ICAgIG1hc2tQYXR0ZXJuICAgICAgICAgIE1hc2sgcGF0dGVybiByZWZlcmVuY2UgdmFsdWVcbiAqL1xuZnVuY3Rpb24gc2V0dXBGb3JtYXRJbmZvIChtYXRyaXgsIGVycm9yQ29ycmVjdGlvbkxldmVsLCBtYXNrUGF0dGVybikge1xuICBjb25zdCBzaXplID0gbWF0cml4LnNpemVcbiAgY29uc3QgYml0cyA9IEZvcm1hdEluZm8uZ2V0RW5jb2RlZEJpdHMoZXJyb3JDb3JyZWN0aW9uTGV2ZWwsIG1hc2tQYXR0ZXJuKVxuICBsZXQgaSwgbW9kXG5cbiAgZm9yIChpID0gMDsgaSA8IDE1OyBpKyspIHtcbiAgICBtb2QgPSAoKGJpdHMgPj4gaSkgJiAxKSA9PT0gMVxuXG4gICAgLy8gdmVydGljYWxcbiAgICBpZiAoaSA8IDYpIHtcbiAgICAgIG1hdHJpeC5zZXQoaSwgOCwgbW9kLCB0cnVlKVxuICAgIH0gZWxzZSBpZiAoaSA8IDgpIHtcbiAgICAgIG1hdHJpeC5zZXQoaSArIDEsIDgsIG1vZCwgdHJ1ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgbWF0cml4LnNldChzaXplIC0gMTUgKyBpLCA4LCBtb2QsIHRydWUpXG4gICAgfVxuXG4gICAgLy8gaG9yaXpvbnRhbFxuICAgIGlmIChpIDwgOCkge1xuICAgICAgbWF0cml4LnNldCg4LCBzaXplIC0gaSAtIDEsIG1vZCwgdHJ1ZSlcbiAgICB9IGVsc2UgaWYgKGkgPCA5KSB7XG4gICAgICBtYXRyaXguc2V0KDgsIDE1IC0gaSAtIDEgKyAxLCBtb2QsIHRydWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIG1hdHJpeC5zZXQoOCwgMTUgLSBpIC0gMSwgbW9kLCB0cnVlKVxuICAgIH1cbiAgfVxuXG4gIC8vIGZpeGVkIG1vZHVsZVxuICBtYXRyaXguc2V0KHNpemUgLSA4LCA4LCAxLCB0cnVlKVxufVxuXG4vKipcbiAqIEFkZCBlbmNvZGVkIGRhdGEgYml0cyB0byBtYXRyaXhcbiAqXG4gKiBAcGFyYW0gIHtCaXRNYXRyaXh9ICBtYXRyaXggTW9kdWxlcyBtYXRyaXhcbiAqIEBwYXJhbSAge1VpbnQ4QXJyYXl9IGRhdGEgICBEYXRhIGNvZGV3b3Jkc1xuICovXG5mdW5jdGlvbiBzZXR1cERhdGEgKG1hdHJpeCwgZGF0YSkge1xuICBjb25zdCBzaXplID0gbWF0cml4LnNpemVcbiAgbGV0IGluYyA9IC0xXG4gIGxldCByb3cgPSBzaXplIC0gMVxuICBsZXQgYml0SW5kZXggPSA3XG4gIGxldCBieXRlSW5kZXggPSAwXG5cbiAgZm9yIChsZXQgY29sID0gc2l6ZSAtIDE7IGNvbCA+IDA7IGNvbCAtPSAyKSB7XG4gICAgaWYgKGNvbCA9PT0gNikgY29sLS1cblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBmb3IgKGxldCBjID0gMDsgYyA8IDI7IGMrKykge1xuICAgICAgICBpZiAoIW1hdHJpeC5pc1Jlc2VydmVkKHJvdywgY29sIC0gYykpIHtcbiAgICAgICAgICBsZXQgZGFyayA9IGZhbHNlXG5cbiAgICAgICAgICBpZiAoYnl0ZUluZGV4IDwgZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRhcmsgPSAoKChkYXRhW2J5dGVJbmRleF0gPj4+IGJpdEluZGV4KSAmIDEpID09PSAxKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIG1hdHJpeC5zZXQocm93LCBjb2wgLSBjLCBkYXJrKVxuICAgICAgICAgIGJpdEluZGV4LS1cblxuICAgICAgICAgIGlmIChiaXRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIGJ5dGVJbmRleCsrXG4gICAgICAgICAgICBiaXRJbmRleCA9IDdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93ICs9IGluY1xuXG4gICAgICBpZiAocm93IDwgMCB8fCBzaXplIDw9IHJvdykge1xuICAgICAgICByb3cgLT0gaW5jXG4gICAgICAgIGluYyA9IC1pbmNcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgZW5jb2RlZCBjb2Rld29yZHMgZnJvbSBkYXRhIGlucHV0XG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSAgIHZlcnNpb24gICAgICAgICAgICAgIFFSIENvZGUgdmVyc2lvblxuICogQHBhcmFtICB7RXJyb3JDb3JyZWN0aW9uTGV2ZWx9ICAgZXJyb3JDb3JyZWN0aW9uTGV2ZWwgRXJyb3IgY29ycmVjdGlvbiBsZXZlbFxuICogQHBhcmFtICB7Qnl0ZURhdGF9IGRhdGEgICAgICAgICAgICAgICAgIERhdGEgaW5wdXRcbiAqIEByZXR1cm4ge1VpbnQ4QXJyYXl9ICAgICAgICAgICAgICAgICAgICBCdWZmZXIgY29udGFpbmluZyBlbmNvZGVkIGNvZGV3b3Jkc1xuICovXG5mdW5jdGlvbiBjcmVhdGVEYXRhICh2ZXJzaW9uLCBlcnJvckNvcnJlY3Rpb25MZXZlbCwgc2VnbWVudHMpIHtcbiAgLy8gUHJlcGFyZSBkYXRhIGJ1ZmZlclxuICBjb25zdCBidWZmZXIgPSBuZXcgQml0QnVmZmVyKClcblxuICBzZWdtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgLy8gcHJlZml4IGRhdGEgd2l0aCBtb2RlIGluZGljYXRvciAoNCBiaXRzKVxuICAgIGJ1ZmZlci5wdXQoZGF0YS5tb2RlLmJpdCwgNClcblxuICAgIC8vIFByZWZpeCBkYXRhIHdpdGggY2hhcmFjdGVyIGNvdW50IGluZGljYXRvci5cbiAgICAvLyBUaGUgY2hhcmFjdGVyIGNvdW50IGluZGljYXRvciBpcyBhIHN0cmluZyBvZiBiaXRzIHRoYXQgcmVwcmVzZW50cyB0aGVcbiAgICAvLyBudW1iZXIgb2YgY2hhcmFjdGVycyB0aGF0IGFyZSBiZWluZyBlbmNvZGVkLlxuICAgIC8vIFRoZSBjaGFyYWN0ZXIgY291bnQgaW5kaWNhdG9yIG11c3QgYmUgcGxhY2VkIGFmdGVyIHRoZSBtb2RlIGluZGljYXRvclxuICAgIC8vIGFuZCBtdXN0IGJlIGEgY2VydGFpbiBudW1iZXIgb2YgYml0cyBsb25nLCBkZXBlbmRpbmcgb24gdGhlIFFSIHZlcnNpb25cbiAgICAvLyBhbmQgZGF0YSBtb2RlXG4gICAgLy8gQHNlZSB7QGxpbmsgTW9kZS5nZXRDaGFyQ291bnRJbmRpY2F0b3J9LlxuICAgIGJ1ZmZlci5wdXQoZGF0YS5nZXRMZW5ndGgoKSwgTW9kZS5nZXRDaGFyQ291bnRJbmRpY2F0b3IoZGF0YS5tb2RlLCB2ZXJzaW9uKSlcblxuICAgIC8vIGFkZCBiaW5hcnkgZGF0YSBzZXF1ZW5jZSB0byBidWZmZXJcbiAgICBkYXRhLndyaXRlKGJ1ZmZlcilcbiAgfSlcblxuICAvLyBDYWxjdWxhdGUgcmVxdWlyZWQgbnVtYmVyIG9mIGJpdHNcbiAgY29uc3QgdG90YWxDb2Rld29yZHMgPSBVdGlscy5nZXRTeW1ib2xUb3RhbENvZGV3b3Jkcyh2ZXJzaW9uKVxuICBjb25zdCBlY1RvdGFsQ29kZXdvcmRzID0gRUNDb2RlLmdldFRvdGFsQ29kZXdvcmRzQ291bnQodmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwpXG4gIGNvbnN0IGRhdGFUb3RhbENvZGV3b3Jkc0JpdHMgPSAodG90YWxDb2Rld29yZHMgLSBlY1RvdGFsQ29kZXdvcmRzKSAqIDhcblxuICAvLyBBZGQgYSB0ZXJtaW5hdG9yLlxuICAvLyBJZiB0aGUgYml0IHN0cmluZyBpcyBzaG9ydGVyIHRoYW4gdGhlIHRvdGFsIG51bWJlciBvZiByZXF1aXJlZCBiaXRzLFxuICAvLyBhIHRlcm1pbmF0b3Igb2YgdXAgdG8gZm91ciAwcyBtdXN0IGJlIGFkZGVkIHRvIHRoZSByaWdodCBzaWRlIG9mIHRoZSBzdHJpbmcuXG4gIC8vIElmIHRoZSBiaXQgc3RyaW5nIGlzIG1vcmUgdGhhbiBmb3VyIGJpdHMgc2hvcnRlciB0aGFuIHRoZSByZXF1aXJlZCBudW1iZXIgb2YgYml0cyxcbiAgLy8gYWRkIGZvdXIgMHMgdG8gdGhlIGVuZC5cbiAgaWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSArIDQgPD0gZGF0YVRvdGFsQ29kZXdvcmRzQml0cykge1xuICAgIGJ1ZmZlci5wdXQoMCwgNClcbiAgfVxuXG4gIC8vIElmIHRoZSBiaXQgc3RyaW5nIGlzIGZld2VyIHRoYW4gZm91ciBiaXRzIHNob3J0ZXIsIGFkZCBvbmx5IHRoZSBudW1iZXIgb2YgMHMgdGhhdFxuICAvLyBhcmUgbmVlZGVkIHRvIHJlYWNoIHRoZSByZXF1aXJlZCBudW1iZXIgb2YgYml0cy5cblxuICAvLyBBZnRlciBhZGRpbmcgdGhlIHRlcm1pbmF0b3IsIGlmIHRoZSBudW1iZXIgb2YgYml0cyBpbiB0aGUgc3RyaW5nIGlzIG5vdCBhIG11bHRpcGxlIG9mIDgsXG4gIC8vIHBhZCB0aGUgc3RyaW5nIG9uIHRoZSByaWdodCB3aXRoIDBzIHRvIG1ha2UgdGhlIHN0cmluZydzIGxlbmd0aCBhIG11bHRpcGxlIG9mIDguXG4gIHdoaWxlIChidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKCkgJSA4ICE9PSAwKSB7XG4gICAgYnVmZmVyLnB1dEJpdCgwKVxuICB9XG5cbiAgLy8gQWRkIHBhZCBieXRlcyBpZiB0aGUgc3RyaW5nIGlzIHN0aWxsIHNob3J0ZXIgdGhhbiB0aGUgdG90YWwgbnVtYmVyIG9mIHJlcXVpcmVkIGJpdHMuXG4gIC8vIEV4dGVuZCB0aGUgYnVmZmVyIHRvIGZpbGwgdGhlIGRhdGEgY2FwYWNpdHkgb2YgdGhlIHN5bWJvbCBjb3JyZXNwb25kaW5nIHRvXG4gIC8vIHRoZSBWZXJzaW9uIGFuZCBFcnJvciBDb3JyZWN0aW9uIExldmVsIGJ5IGFkZGluZyB0aGUgUGFkIENvZGV3b3JkcyAxMTEwMTEwMCAoMHhFQylcbiAgLy8gYW5kIDAwMDEwMDAxICgweDExKSBhbHRlcm5hdGVseS5cbiAgY29uc3QgcmVtYWluaW5nQnl0ZSA9IChkYXRhVG90YWxDb2Rld29yZHNCaXRzIC0gYnVmZmVyLmdldExlbmd0aEluQml0cygpKSAvIDhcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByZW1haW5pbmdCeXRlOyBpKyspIHtcbiAgICBidWZmZXIucHV0KGkgJSAyID8gMHgxMSA6IDB4RUMsIDgpXG4gIH1cblxuICByZXR1cm4gY3JlYXRlQ29kZXdvcmRzKGJ1ZmZlciwgdmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwpXG59XG5cbi8qKlxuICogRW5jb2RlIGlucHV0IGRhdGEgd2l0aCBSZWVkLVNvbG9tb24gYW5kIHJldHVybiBjb2Rld29yZHMgd2l0aFxuICogcmVsYXRpdmUgZXJyb3IgY29ycmVjdGlvbiBiaXRzXG4gKlxuICogQHBhcmFtICB7Qml0QnVmZmVyfSBiaXRCdWZmZXIgICAgICAgICAgICBEYXRhIHRvIGVuY29kZVxuICogQHBhcmFtICB7TnVtYmVyfSAgICB2ZXJzaW9uICAgICAgICAgICAgICBRUiBDb2RlIHZlcnNpb25cbiAqIEBwYXJhbSAge0Vycm9yQ29ycmVjdGlvbkxldmVsfSBlcnJvckNvcnJlY3Rpb25MZXZlbCBFcnJvciBjb3JyZWN0aW9uIGxldmVsXG4gKiBAcmV0dXJuIHtVaW50OEFycmF5fSAgICAgICAgICAgICAgICAgICAgIEJ1ZmZlciBjb250YWluaW5nIGVuY29kZWQgY29kZXdvcmRzXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZUNvZGV3b3JkcyAoYml0QnVmZmVyLCB2ZXJzaW9uLCBlcnJvckNvcnJlY3Rpb25MZXZlbCkge1xuICAvLyBUb3RhbCBjb2Rld29yZHMgZm9yIHRoaXMgUVIgY29kZSB2ZXJzaW9uIChEYXRhICsgRXJyb3IgY29ycmVjdGlvbilcbiAgY29uc3QgdG90YWxDb2Rld29yZHMgPSBVdGlscy5nZXRTeW1ib2xUb3RhbENvZGV3b3Jkcyh2ZXJzaW9uKVxuXG4gIC8vIFRvdGFsIG51bWJlciBvZiBlcnJvciBjb3JyZWN0aW9uIGNvZGV3b3Jkc1xuICBjb25zdCBlY1RvdGFsQ29kZXdvcmRzID0gRUNDb2RlLmdldFRvdGFsQ29kZXdvcmRzQ291bnQodmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwpXG5cbiAgLy8gVG90YWwgbnVtYmVyIG9mIGRhdGEgY29kZXdvcmRzXG4gIGNvbnN0IGRhdGFUb3RhbENvZGV3b3JkcyA9IHRvdGFsQ29kZXdvcmRzIC0gZWNUb3RhbENvZGV3b3Jkc1xuXG4gIC8vIFRvdGFsIG51bWJlciBvZiBibG9ja3NcbiAgY29uc3QgZWNUb3RhbEJsb2NrcyA9IEVDQ29kZS5nZXRCbG9ja3NDb3VudCh2ZXJzaW9uLCBlcnJvckNvcnJlY3Rpb25MZXZlbClcblxuICAvLyBDYWxjdWxhdGUgaG93IG1hbnkgYmxvY2tzIGVhY2ggZ3JvdXAgc2hvdWxkIGNvbnRhaW5cbiAgY29uc3QgYmxvY2tzSW5Hcm91cDIgPSB0b3RhbENvZGV3b3JkcyAlIGVjVG90YWxCbG9ja3NcbiAgY29uc3QgYmxvY2tzSW5Hcm91cDEgPSBlY1RvdGFsQmxvY2tzIC0gYmxvY2tzSW5Hcm91cDJcblxuICBjb25zdCB0b3RhbENvZGV3b3Jkc0luR3JvdXAxID0gTWF0aC5mbG9vcih0b3RhbENvZGV3b3JkcyAvIGVjVG90YWxCbG9ja3MpXG5cbiAgY29uc3QgZGF0YUNvZGV3b3Jkc0luR3JvdXAxID0gTWF0aC5mbG9vcihkYXRhVG90YWxDb2Rld29yZHMgLyBlY1RvdGFsQmxvY2tzKVxuICBjb25zdCBkYXRhQ29kZXdvcmRzSW5Hcm91cDIgPSBkYXRhQ29kZXdvcmRzSW5Hcm91cDEgKyAxXG5cbiAgLy8gTnVtYmVyIG9mIEVDIGNvZGV3b3JkcyBpcyB0aGUgc2FtZSBmb3IgYm90aCBncm91cHNcbiAgY29uc3QgZWNDb3VudCA9IHRvdGFsQ29kZXdvcmRzSW5Hcm91cDEgLSBkYXRhQ29kZXdvcmRzSW5Hcm91cDFcblxuICAvLyBJbml0aWFsaXplIGEgUmVlZC1Tb2xvbW9uIGVuY29kZXIgd2l0aCBhIGdlbmVyYXRvciBwb2x5bm9taWFsIG9mIGRlZ3JlZSBlY0NvdW50XG4gIGNvbnN0IHJzID0gbmV3IFJlZWRTb2xvbW9uRW5jb2RlcihlY0NvdW50KVxuXG4gIGxldCBvZmZzZXQgPSAwXG4gIGNvbnN0IGRjRGF0YSA9IG5ldyBBcnJheShlY1RvdGFsQmxvY2tzKVxuICBjb25zdCBlY0RhdGEgPSBuZXcgQXJyYXkoZWNUb3RhbEJsb2NrcylcbiAgbGV0IG1heERhdGFTaXplID0gMFxuICBjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShiaXRCdWZmZXIuYnVmZmVyKVxuXG4gIC8vIERpdmlkZSB0aGUgYnVmZmVyIGludG8gdGhlIHJlcXVpcmVkIG51bWJlciBvZiBibG9ja3NcbiAgZm9yIChsZXQgYiA9IDA7IGIgPCBlY1RvdGFsQmxvY2tzOyBiKyspIHtcbiAgICBjb25zdCBkYXRhU2l6ZSA9IGIgPCBibG9ja3NJbkdyb3VwMSA/IGRhdGFDb2Rld29yZHNJbkdyb3VwMSA6IGRhdGFDb2Rld29yZHNJbkdyb3VwMlxuXG4gICAgLy8gZXh0cmFjdCBhIGJsb2NrIG9mIGRhdGEgZnJvbSBidWZmZXJcbiAgICBkY0RhdGFbYl0gPSBidWZmZXIuc2xpY2Uob2Zmc2V0LCBvZmZzZXQgKyBkYXRhU2l6ZSlcblxuICAgIC8vIENhbGN1bGF0ZSBFQyBjb2Rld29yZHMgZm9yIHRoaXMgZGF0YSBibG9ja1xuICAgIGVjRGF0YVtiXSA9IHJzLmVuY29kZShkY0RhdGFbYl0pXG5cbiAgICBvZmZzZXQgKz0gZGF0YVNpemVcbiAgICBtYXhEYXRhU2l6ZSA9IE1hdGgubWF4KG1heERhdGFTaXplLCBkYXRhU2l6ZSlcbiAgfVxuXG4gIC8vIENyZWF0ZSBmaW5hbCBkYXRhXG4gIC8vIEludGVybGVhdmUgdGhlIGRhdGEgYW5kIGVycm9yIGNvcnJlY3Rpb24gY29kZXdvcmRzIGZyb20gZWFjaCBibG9ja1xuICBjb25zdCBkYXRhID0gbmV3IFVpbnQ4QXJyYXkodG90YWxDb2Rld29yZHMpXG4gIGxldCBpbmRleCA9IDBcbiAgbGV0IGksIHJcblxuICAvLyBBZGQgZGF0YSBjb2Rld29yZHNcbiAgZm9yIChpID0gMDsgaSA8IG1heERhdGFTaXplOyBpKyspIHtcbiAgICBmb3IgKHIgPSAwOyByIDwgZWNUb3RhbEJsb2NrczsgcisrKSB7XG4gICAgICBpZiAoaSA8IGRjRGF0YVtyXS5sZW5ndGgpIHtcbiAgICAgICAgZGF0YVtpbmRleCsrXSA9IGRjRGF0YVtyXVtpXVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIEFwcGVkIEVDIGNvZGV3b3Jkc1xuICBmb3IgKGkgPSAwOyBpIDwgZWNDb3VudDsgaSsrKSB7XG4gICAgZm9yIChyID0gMDsgciA8IGVjVG90YWxCbG9ja3M7IHIrKykge1xuICAgICAgZGF0YVtpbmRleCsrXSA9IGVjRGF0YVtyXVtpXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhXG59XG5cbi8qKlxuICogQnVpbGQgUVIgQ29kZSBzeW1ib2xcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGRhdGEgICAgICAgICAgICAgICAgIElucHV0IHN0cmluZ1xuICogQHBhcmFtICB7TnVtYmVyfSB2ZXJzaW9uICAgICAgICAgICAgICBRUiBDb2RlIHZlcnNpb25cbiAqIEBwYXJhbSAge0Vycm9yQ29ycmV0aW9uTGV2ZWx9IGVycm9yQ29ycmVjdGlvbkxldmVsIEVycm9yIGxldmVsXG4gKiBAcGFyYW0gIHtNYXNrUGF0dGVybn0gbWFza1BhdHRlcm4gICAgIE1hc2sgcGF0dGVyblxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgICAgICAgICAgICAgICBPYmplY3QgY29udGFpbmluZyBzeW1ib2wgZGF0YVxuICovXG5mdW5jdGlvbiBjcmVhdGVTeW1ib2wgKGRhdGEsIHZlcnNpb24sIGVycm9yQ29ycmVjdGlvbkxldmVsLCBtYXNrUGF0dGVybikge1xuICBsZXQgc2VnbWVudHNcblxuICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgIHNlZ21lbnRzID0gU2VnbWVudHMuZnJvbUFycmF5KGRhdGEpXG4gIH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgbGV0IGVzdGltYXRlZFZlcnNpb24gPSB2ZXJzaW9uXG5cbiAgICBpZiAoIWVzdGltYXRlZFZlcnNpb24pIHtcbiAgICAgIGNvbnN0IHJhd1NlZ21lbnRzID0gU2VnbWVudHMucmF3U3BsaXQoZGF0YSlcblxuICAgICAgLy8gRXN0aW1hdGUgYmVzdCB2ZXJzaW9uIHRoYXQgY2FuIGNvbnRhaW4gcmF3IHNwbGl0dGVkIHNlZ21lbnRzXG4gICAgICBlc3RpbWF0ZWRWZXJzaW9uID0gVmVyc2lvbi5nZXRCZXN0VmVyc2lvbkZvckRhdGEocmF3U2VnbWVudHMsIGVycm9yQ29ycmVjdGlvbkxldmVsKVxuICAgIH1cblxuICAgIC8vIEJ1aWxkIG9wdGltaXplZCBzZWdtZW50c1xuICAgIC8vIElmIGVzdGltYXRlZCB2ZXJzaW9uIGlzIHVuZGVmaW5lZCwgdHJ5IHdpdGggdGhlIGhpZ2hlc3QgdmVyc2lvblxuICAgIHNlZ21lbnRzID0gU2VnbWVudHMuZnJvbVN0cmluZyhkYXRhLCBlc3RpbWF0ZWRWZXJzaW9uIHx8IDQwKVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBkYXRhJylcbiAgfVxuXG4gIC8vIEdldCB0aGUgbWluIHZlcnNpb24gdGhhdCBjYW4gY29udGFpbiBkYXRhXG4gIGNvbnN0IGJlc3RWZXJzaW9uID0gVmVyc2lvbi5nZXRCZXN0VmVyc2lvbkZvckRhdGEoc2VnbWVudHMsIGVycm9yQ29ycmVjdGlvbkxldmVsKVxuXG4gIC8vIElmIG5vIHZlcnNpb24gaXMgZm91bmQsIGRhdGEgY2Fubm90IGJlIHN0b3JlZFxuICBpZiAoIWJlc3RWZXJzaW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdUaGUgYW1vdW50IG9mIGRhdGEgaXMgdG9vIGJpZyB0byBiZSBzdG9yZWQgaW4gYSBRUiBDb2RlJylcbiAgfVxuXG4gIC8vIElmIG5vdCBzcGVjaWZpZWQsIHVzZSBtaW4gdmVyc2lvbiBhcyBkZWZhdWx0XG4gIGlmICghdmVyc2lvbikge1xuICAgIHZlcnNpb24gPSBiZXN0VmVyc2lvblxuXG4gIC8vIENoZWNrIGlmIHRoZSBzcGVjaWZpZWQgdmVyc2lvbiBjYW4gY29udGFpbiB0aGUgZGF0YVxuICB9IGVsc2UgaWYgKHZlcnNpb24gPCBiZXN0VmVyc2lvbikge1xuICAgIHRocm93IG5ldyBFcnJvcignXFxuJyArXG4gICAgICAnVGhlIGNob3NlbiBRUiBDb2RlIHZlcnNpb24gY2Fubm90IGNvbnRhaW4gdGhpcyBhbW91bnQgb2YgZGF0YS5cXG4nICtcbiAgICAgICdNaW5pbXVtIHZlcnNpb24gcmVxdWlyZWQgdG8gc3RvcmUgY3VycmVudCBkYXRhIGlzOiAnICsgYmVzdFZlcnNpb24gKyAnLlxcbidcbiAgICApXG4gIH1cblxuICBjb25zdCBkYXRhQml0cyA9IGNyZWF0ZURhdGEodmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwsIHNlZ21lbnRzKVxuXG4gIC8vIEFsbG9jYXRlIG1hdHJpeCBidWZmZXJcbiAgY29uc3QgbW9kdWxlQ291bnQgPSBVdGlscy5nZXRTeW1ib2xTaXplKHZlcnNpb24pXG4gIGNvbnN0IG1vZHVsZXMgPSBuZXcgQml0TWF0cml4KG1vZHVsZUNvdW50KVxuXG4gIC8vIEFkZCBmdW5jdGlvbiBtb2R1bGVzXG4gIHNldHVwRmluZGVyUGF0dGVybihtb2R1bGVzLCB2ZXJzaW9uKVxuICBzZXR1cFRpbWluZ1BhdHRlcm4obW9kdWxlcylcbiAgc2V0dXBBbGlnbm1lbnRQYXR0ZXJuKG1vZHVsZXMsIHZlcnNpb24pXG5cbiAgLy8gQWRkIHRlbXBvcmFyeSBkdW1teSBiaXRzIGZvciBmb3JtYXQgaW5mbyBqdXN0IHRvIHNldCB0aGVtIGFzIHJlc2VydmVkLlxuICAvLyBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50IHRoZXNlIGJpdHMgZnJvbSBiZWluZyBtYXNrZWQgYnkge0BsaW5rIE1hc2tQYXR0ZXJuLmFwcGx5TWFza31cbiAgLy8gc2luY2UgdGhlIG1hc2tpbmcgb3BlcmF0aW9uIG11c3QgYmUgcGVyZm9ybWVkIG9ubHkgb24gdGhlIGVuY29kaW5nIHJlZ2lvbi5cbiAgLy8gVGhlc2UgYmxvY2tzIHdpbGwgYmUgcmVwbGFjZWQgd2l0aCBjb3JyZWN0IHZhbHVlcyBsYXRlciBpbiBjb2RlLlxuICBzZXR1cEZvcm1hdEluZm8obW9kdWxlcywgZXJyb3JDb3JyZWN0aW9uTGV2ZWwsIDApXG5cbiAgaWYgKHZlcnNpb24gPj0gNykge1xuICAgIHNldHVwVmVyc2lvbkluZm8obW9kdWxlcywgdmVyc2lvbilcbiAgfVxuXG4gIC8vIEFkZCBkYXRhIGNvZGV3b3Jkc1xuICBzZXR1cERhdGEobW9kdWxlcywgZGF0YUJpdHMpXG5cbiAgaWYgKGlzTmFOKG1hc2tQYXR0ZXJuKSkge1xuICAgIC8vIEZpbmQgYmVzdCBtYXNrIHBhdHRlcm5cbiAgICBtYXNrUGF0dGVybiA9IE1hc2tQYXR0ZXJuLmdldEJlc3RNYXNrKG1vZHVsZXMsXG4gICAgICBzZXR1cEZvcm1hdEluZm8uYmluZChudWxsLCBtb2R1bGVzLCBlcnJvckNvcnJlY3Rpb25MZXZlbCkpXG4gIH1cblxuICAvLyBBcHBseSBtYXNrIHBhdHRlcm5cbiAgTWFza1BhdHRlcm4uYXBwbHlNYXNrKG1hc2tQYXR0ZXJuLCBtb2R1bGVzKVxuXG4gIC8vIFJlcGxhY2UgZm9ybWF0IGluZm8gYml0cyB3aXRoIGNvcnJlY3QgdmFsdWVzXG4gIHNldHVwRm9ybWF0SW5mbyhtb2R1bGVzLCBlcnJvckNvcnJlY3Rpb25MZXZlbCwgbWFza1BhdHRlcm4pXG5cbiAgcmV0dXJuIHtcbiAgICBtb2R1bGVzOiBtb2R1bGVzLFxuICAgIHZlcnNpb246IHZlcnNpb24sXG4gICAgZXJyb3JDb3JyZWN0aW9uTGV2ZWw6IGVycm9yQ29ycmVjdGlvbkxldmVsLFxuICAgIG1hc2tQYXR0ZXJuOiBtYXNrUGF0dGVybixcbiAgICBzZWdtZW50czogc2VnbWVudHNcbiAgfVxufVxuXG4vKipcbiAqIFFSIENvZGVcbiAqXG4gKiBAcGFyYW0ge1N0cmluZyB8IEFycmF5fSBkYXRhICAgICAgICAgICAgICAgICBJbnB1dCBkYXRhXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAgICAgICAgICAgICAgICAgICAgICBPcHRpb25hbCBjb25maWd1cmF0aW9uc1xuICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMudmVyc2lvbiAgICAgICAgICAgICAgUVIgQ29kZSB2ZXJzaW9uXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5lcnJvckNvcnJlY3Rpb25MZXZlbCBFcnJvciBjb3JyZWN0aW9uIGxldmVsXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRvU0pJU0Z1bmMgICAgICAgICBIZWxwZXIgZnVuYyB0byBjb252ZXJ0IHV0ZjggdG8gc2ppc1xuICovXG5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZSAoZGF0YSwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIGRhdGEgPT09ICd1bmRlZmluZWQnIHx8IGRhdGEgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBpbnB1dCB0ZXh0JylcbiAgfVxuXG4gIGxldCBlcnJvckNvcnJlY3Rpb25MZXZlbCA9IEVDTGV2ZWwuTVxuICBsZXQgdmVyc2lvblxuICBsZXQgbWFza1xuXG4gIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBVc2UgaGlnaGVyIGVycm9yIGNvcnJlY3Rpb24gbGV2ZWwgYXMgZGVmYXVsdFxuICAgIGVycm9yQ29ycmVjdGlvbkxldmVsID0gRUNMZXZlbC5mcm9tKG9wdGlvbnMuZXJyb3JDb3JyZWN0aW9uTGV2ZWwsIEVDTGV2ZWwuTSlcbiAgICB2ZXJzaW9uID0gVmVyc2lvbi5mcm9tKG9wdGlvbnMudmVyc2lvbilcbiAgICBtYXNrID0gTWFza1BhdHRlcm4uZnJvbShvcHRpb25zLm1hc2tQYXR0ZXJuKVxuXG4gICAgaWYgKG9wdGlvbnMudG9TSklTRnVuYykge1xuICAgICAgVXRpbHMuc2V0VG9TSklTRnVuY3Rpb24ob3B0aW9ucy50b1NKSVNGdW5jKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjcmVhdGVTeW1ib2woZGF0YSwgdmVyc2lvbiwgZXJyb3JDb3JyZWN0aW9uTGV2ZWwsIG1hc2spXG59XG4iLCAiZnVuY3Rpb24gaGV4MnJnYmEgKGhleCkge1xuICBpZiAodHlwZW9mIGhleCA9PT0gJ251bWJlcicpIHtcbiAgICBoZXggPSBoZXgudG9TdHJpbmcoKVxuICB9XG5cbiAgaWYgKHR5cGVvZiBoZXggIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDb2xvciBzaG91bGQgYmUgZGVmaW5lZCBhcyBoZXggc3RyaW5nJylcbiAgfVxuXG4gIGxldCBoZXhDb2RlID0gaGV4LnNsaWNlKCkucmVwbGFjZSgnIycsICcnKS5zcGxpdCgnJylcbiAgaWYgKGhleENvZGUubGVuZ3RoIDwgMyB8fCBoZXhDb2RlLmxlbmd0aCA9PT0gNSB8fCBoZXhDb2RlLmxlbmd0aCA+IDgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IGNvbG9yOiAnICsgaGV4KVxuICB9XG5cbiAgLy8gQ29udmVydCBmcm9tIHNob3J0IHRvIGxvbmcgZm9ybSAoZmZmIC0+IGZmZmZmZilcbiAgaWYgKGhleENvZGUubGVuZ3RoID09PSAzIHx8IGhleENvZGUubGVuZ3RoID09PSA0KSB7XG4gICAgaGV4Q29kZSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGhleENvZGUubWFwKGZ1bmN0aW9uIChjKSB7XG4gICAgICByZXR1cm4gW2MsIGNdXG4gICAgfSkpXG4gIH1cblxuICAvLyBBZGQgZGVmYXVsdCBhbHBoYSB2YWx1ZVxuICBpZiAoaGV4Q29kZS5sZW5ndGggPT09IDYpIGhleENvZGUucHVzaCgnRicsICdGJylcblxuICBjb25zdCBoZXhWYWx1ZSA9IHBhcnNlSW50KGhleENvZGUuam9pbignJyksIDE2KVxuXG4gIHJldHVybiB7XG4gICAgcjogKGhleFZhbHVlID4+IDI0KSAmIDI1NSxcbiAgICBnOiAoaGV4VmFsdWUgPj4gMTYpICYgMjU1LFxuICAgIGI6IChoZXhWYWx1ZSA+PiA4KSAmIDI1NSxcbiAgICBhOiBoZXhWYWx1ZSAmIDI1NSxcbiAgICBoZXg6ICcjJyArIGhleENvZGUuc2xpY2UoMCwgNikuam9pbignJylcbiAgfVxufVxuXG5leHBvcnRzLmdldE9wdGlvbnMgPSBmdW5jdGlvbiBnZXRPcHRpb25zIChvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9XG4gIGlmICghb3B0aW9ucy5jb2xvcikgb3B0aW9ucy5jb2xvciA9IHt9XG5cbiAgY29uc3QgbWFyZ2luID0gdHlwZW9mIG9wdGlvbnMubWFyZ2luID09PSAndW5kZWZpbmVkJyB8fFxuICAgIG9wdGlvbnMubWFyZ2luID09PSBudWxsIHx8XG4gICAgb3B0aW9ucy5tYXJnaW4gPCAwXG4gICAgPyA0XG4gICAgOiBvcHRpb25zLm1hcmdpblxuXG4gIGNvbnN0IHdpZHRoID0gb3B0aW9ucy53aWR0aCAmJiBvcHRpb25zLndpZHRoID49IDIxID8gb3B0aW9ucy53aWR0aCA6IHVuZGVmaW5lZFxuICBjb25zdCBzY2FsZSA9IG9wdGlvbnMuc2NhbGUgfHwgNFxuXG4gIHJldHVybiB7XG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIHNjYWxlOiB3aWR0aCA/IDQgOiBzY2FsZSxcbiAgICBtYXJnaW46IG1hcmdpbixcbiAgICBjb2xvcjoge1xuICAgICAgZGFyazogaGV4MnJnYmEob3B0aW9ucy5jb2xvci5kYXJrIHx8ICcjMDAwMDAwZmYnKSxcbiAgICAgIGxpZ2h0OiBoZXgycmdiYShvcHRpb25zLmNvbG9yLmxpZ2h0IHx8ICcjZmZmZmZmZmYnKVxuICAgIH0sXG4gICAgdHlwZTogb3B0aW9ucy50eXBlLFxuICAgIHJlbmRlcmVyT3B0czogb3B0aW9ucy5yZW5kZXJlck9wdHMgfHwge31cbiAgfVxufVxuXG5leHBvcnRzLmdldFNjYWxlID0gZnVuY3Rpb24gZ2V0U2NhbGUgKHFyU2l6ZSwgb3B0cykge1xuICByZXR1cm4gb3B0cy53aWR0aCAmJiBvcHRzLndpZHRoID49IHFyU2l6ZSArIG9wdHMubWFyZ2luICogMlxuICAgID8gb3B0cy53aWR0aCAvIChxclNpemUgKyBvcHRzLm1hcmdpbiAqIDIpXG4gICAgOiBvcHRzLnNjYWxlXG59XG5cbmV4cG9ydHMuZ2V0SW1hZ2VXaWR0aCA9IGZ1bmN0aW9uIGdldEltYWdlV2lkdGggKHFyU2l6ZSwgb3B0cykge1xuICBjb25zdCBzY2FsZSA9IGV4cG9ydHMuZ2V0U2NhbGUocXJTaXplLCBvcHRzKVxuICByZXR1cm4gTWF0aC5mbG9vcigocXJTaXplICsgb3B0cy5tYXJnaW4gKiAyKSAqIHNjYWxlKVxufVxuXG5leHBvcnRzLnFyVG9JbWFnZURhdGEgPSBmdW5jdGlvbiBxclRvSW1hZ2VEYXRhIChpbWdEYXRhLCBxciwgb3B0cykge1xuICBjb25zdCBzaXplID0gcXIubW9kdWxlcy5zaXplXG4gIGNvbnN0IGRhdGEgPSBxci5tb2R1bGVzLmRhdGFcbiAgY29uc3Qgc2NhbGUgPSBleHBvcnRzLmdldFNjYWxlKHNpemUsIG9wdHMpXG4gIGNvbnN0IHN5bWJvbFNpemUgPSBNYXRoLmZsb29yKChzaXplICsgb3B0cy5tYXJnaW4gKiAyKSAqIHNjYWxlKVxuICBjb25zdCBzY2FsZWRNYXJnaW4gPSBvcHRzLm1hcmdpbiAqIHNjYWxlXG4gIGNvbnN0IHBhbGV0dGUgPSBbb3B0cy5jb2xvci5saWdodCwgb3B0cy5jb2xvci5kYXJrXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3ltYm9sU2l6ZTsgaSsrKSB7XG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBzeW1ib2xTaXplOyBqKyspIHtcbiAgICAgIGxldCBwb3NEc3QgPSAoaSAqIHN5bWJvbFNpemUgKyBqKSAqIDRcbiAgICAgIGxldCBweENvbG9yID0gb3B0cy5jb2xvci5saWdodFxuXG4gICAgICBpZiAoaSA+PSBzY2FsZWRNYXJnaW4gJiYgaiA+PSBzY2FsZWRNYXJnaW4gJiZcbiAgICAgICAgaSA8IHN5bWJvbFNpemUgLSBzY2FsZWRNYXJnaW4gJiYgaiA8IHN5bWJvbFNpemUgLSBzY2FsZWRNYXJnaW4pIHtcbiAgICAgICAgY29uc3QgaVNyYyA9IE1hdGguZmxvb3IoKGkgLSBzY2FsZWRNYXJnaW4pIC8gc2NhbGUpXG4gICAgICAgIGNvbnN0IGpTcmMgPSBNYXRoLmZsb29yKChqIC0gc2NhbGVkTWFyZ2luKSAvIHNjYWxlKVxuICAgICAgICBweENvbG9yID0gcGFsZXR0ZVtkYXRhW2lTcmMgKiBzaXplICsgalNyY10gPyAxIDogMF1cbiAgICAgIH1cblxuICAgICAgaW1nRGF0YVtwb3NEc3QrK10gPSBweENvbG9yLnJcbiAgICAgIGltZ0RhdGFbcG9zRHN0KytdID0gcHhDb2xvci5nXG4gICAgICBpbWdEYXRhW3Bvc0RzdCsrXSA9IHB4Q29sb3IuYlxuICAgICAgaW1nRGF0YVtwb3NEc3RdID0gcHhDb2xvci5hXG4gICAgfVxuICB9XG59XG4iLCAiY29uc3QgVXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJylcblxuZnVuY3Rpb24gY2xlYXJDYW52YXMgKGN0eCwgY2FudmFzLCBzaXplKSB7XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KVxuXG4gIGlmICghY2FudmFzLnN0eWxlKSBjYW52YXMuc3R5bGUgPSB7fVxuICBjYW52YXMuaGVpZ2h0ID0gc2l6ZVxuICBjYW52YXMud2lkdGggPSBzaXplXG4gIGNhbnZhcy5zdHlsZS5oZWlnaHQgPSBzaXplICsgJ3B4J1xuICBjYW52YXMuc3R5bGUud2lkdGggPSBzaXplICsgJ3B4J1xufVxuXG5mdW5jdGlvbiBnZXRDYW52YXNFbGVtZW50ICgpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgfSBjYXRjaCAoZSkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IG5lZWQgdG8gc3BlY2lmeSBhIGNhbnZhcyBlbGVtZW50JylcbiAgfVxufVxuXG5leHBvcnRzLnJlbmRlciA9IGZ1bmN0aW9uIHJlbmRlciAocXJEYXRhLCBjYW52YXMsIG9wdGlvbnMpIHtcbiAgbGV0IG9wdHMgPSBvcHRpb25zXG4gIGxldCBjYW52YXNFbCA9IGNhbnZhc1xuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3VuZGVmaW5lZCcgJiYgKCFjYW52YXMgfHwgIWNhbnZhcy5nZXRDb250ZXh0KSkge1xuICAgIG9wdHMgPSBjYW52YXNcbiAgICBjYW52YXMgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGlmICghY2FudmFzKSB7XG4gICAgY2FudmFzRWwgPSBnZXRDYW52YXNFbGVtZW50KClcbiAgfVxuXG4gIG9wdHMgPSBVdGlscy5nZXRPcHRpb25zKG9wdHMpXG4gIGNvbnN0IHNpemUgPSBVdGlscy5nZXRJbWFnZVdpZHRoKHFyRGF0YS5tb2R1bGVzLnNpemUsIG9wdHMpXG5cbiAgY29uc3QgY3R4ID0gY2FudmFzRWwuZ2V0Q29udGV4dCgnMmQnKVxuICBjb25zdCBpbWFnZSA9IGN0eC5jcmVhdGVJbWFnZURhdGEoc2l6ZSwgc2l6ZSlcbiAgVXRpbHMucXJUb0ltYWdlRGF0YShpbWFnZS5kYXRhLCBxckRhdGEsIG9wdHMpXG5cbiAgY2xlYXJDYW52YXMoY3R4LCBjYW52YXNFbCwgc2l6ZSlcbiAgY3R4LnB1dEltYWdlRGF0YShpbWFnZSwgMCwgMClcblxuICByZXR1cm4gY2FudmFzRWxcbn1cblxuZXhwb3J0cy5yZW5kZXJUb0RhdGFVUkwgPSBmdW5jdGlvbiByZW5kZXJUb0RhdGFVUkwgKHFyRGF0YSwgY2FudmFzLCBvcHRpb25zKSB7XG4gIGxldCBvcHRzID0gb3B0aW9uc1xuXG4gIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3VuZGVmaW5lZCcgJiYgKCFjYW52YXMgfHwgIWNhbnZhcy5nZXRDb250ZXh0KSkge1xuICAgIG9wdHMgPSBjYW52YXNcbiAgICBjYW52YXMgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGlmICghb3B0cykgb3B0cyA9IHt9XG5cbiAgY29uc3QgY2FudmFzRWwgPSBleHBvcnRzLnJlbmRlcihxckRhdGEsIGNhbnZhcywgb3B0cylcblxuICBjb25zdCB0eXBlID0gb3B0cy50eXBlIHx8ICdpbWFnZS9wbmcnXG4gIGNvbnN0IHJlbmRlcmVyT3B0cyA9IG9wdHMucmVuZGVyZXJPcHRzIHx8IHt9XG5cbiAgcmV0dXJuIGNhbnZhc0VsLnRvRGF0YVVSTCh0eXBlLCByZW5kZXJlck9wdHMucXVhbGl0eSlcbn1cbiIsICJjb25zdCBVdGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxuXG5mdW5jdGlvbiBnZXRDb2xvckF0dHJpYiAoY29sb3IsIGF0dHJpYikge1xuICBjb25zdCBhbHBoYSA9IGNvbG9yLmEgLyAyNTVcbiAgY29uc3Qgc3RyID0gYXR0cmliICsgJz1cIicgKyBjb2xvci5oZXggKyAnXCInXG5cbiAgcmV0dXJuIGFscGhhIDwgMVxuICAgID8gc3RyICsgJyAnICsgYXR0cmliICsgJy1vcGFjaXR5PVwiJyArIGFscGhhLnRvRml4ZWQoMikuc2xpY2UoMSkgKyAnXCInXG4gICAgOiBzdHJcbn1cblxuZnVuY3Rpb24gc3ZnQ21kIChjbWQsIHgsIHkpIHtcbiAgbGV0IHN0ciA9IGNtZCArIHhcbiAgaWYgKHR5cGVvZiB5ICE9PSAndW5kZWZpbmVkJykgc3RyICs9ICcgJyArIHlcblxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHFyVG9QYXRoIChkYXRhLCBzaXplLCBtYXJnaW4pIHtcbiAgbGV0IHBhdGggPSAnJ1xuICBsZXQgbW92ZUJ5ID0gMFxuICBsZXQgbmV3Um93ID0gZmFsc2VcbiAgbGV0IGxpbmVMZW5ndGggPSAwXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY29sID0gTWF0aC5mbG9vcihpICUgc2l6ZSlcbiAgICBjb25zdCByb3cgPSBNYXRoLmZsb29yKGkgLyBzaXplKVxuXG4gICAgaWYgKCFjb2wgJiYgIW5ld1JvdykgbmV3Um93ID0gdHJ1ZVxuXG4gICAgaWYgKGRhdGFbaV0pIHtcbiAgICAgIGxpbmVMZW5ndGgrK1xuXG4gICAgICBpZiAoIShpID4gMCAmJiBjb2wgPiAwICYmIGRhdGFbaSAtIDFdKSkge1xuICAgICAgICBwYXRoICs9IG5ld1Jvd1xuICAgICAgICAgID8gc3ZnQ21kKCdNJywgY29sICsgbWFyZ2luLCAwLjUgKyByb3cgKyBtYXJnaW4pXG4gICAgICAgICAgOiBzdmdDbWQoJ20nLCBtb3ZlQnksIDApXG5cbiAgICAgICAgbW92ZUJ5ID0gMFxuICAgICAgICBuZXdSb3cgPSBmYWxzZVxuICAgICAgfVxuXG4gICAgICBpZiAoIShjb2wgKyAxIDwgc2l6ZSAmJiBkYXRhW2kgKyAxXSkpIHtcbiAgICAgICAgcGF0aCArPSBzdmdDbWQoJ2gnLCBsaW5lTGVuZ3RoKVxuICAgICAgICBsaW5lTGVuZ3RoID0gMFxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtb3ZlQnkrK1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXRoXG59XG5cbmV4cG9ydHMucmVuZGVyID0gZnVuY3Rpb24gcmVuZGVyIChxckRhdGEsIG9wdGlvbnMsIGNiKSB7XG4gIGNvbnN0IG9wdHMgPSBVdGlscy5nZXRPcHRpb25zKG9wdGlvbnMpXG4gIGNvbnN0IHNpemUgPSBxckRhdGEubW9kdWxlcy5zaXplXG4gIGNvbnN0IGRhdGEgPSBxckRhdGEubW9kdWxlcy5kYXRhXG4gIGNvbnN0IHFyY29kZXNpemUgPSBzaXplICsgb3B0cy5tYXJnaW4gKiAyXG5cbiAgY29uc3QgYmcgPSAhb3B0cy5jb2xvci5saWdodC5hXG4gICAgPyAnJ1xuICAgIDogJzxwYXRoICcgKyBnZXRDb2xvckF0dHJpYihvcHRzLmNvbG9yLmxpZ2h0LCAnZmlsbCcpICtcbiAgICAgICcgZD1cIk0wIDBoJyArIHFyY29kZXNpemUgKyAndicgKyBxcmNvZGVzaXplICsgJ0gwelwiLz4nXG5cbiAgY29uc3QgcGF0aCA9XG4gICAgJzxwYXRoICcgKyBnZXRDb2xvckF0dHJpYihvcHRzLmNvbG9yLmRhcmssICdzdHJva2UnKSArXG4gICAgJyBkPVwiJyArIHFyVG9QYXRoKGRhdGEsIHNpemUsIG9wdHMubWFyZ2luKSArICdcIi8+J1xuXG4gIGNvbnN0IHZpZXdCb3ggPSAndmlld0JveD1cIicgKyAnMCAwICcgKyBxcmNvZGVzaXplICsgJyAnICsgcXJjb2Rlc2l6ZSArICdcIidcblxuICBjb25zdCB3aWR0aCA9ICFvcHRzLndpZHRoID8gJycgOiAnd2lkdGg9XCInICsgb3B0cy53aWR0aCArICdcIiBoZWlnaHQ9XCInICsgb3B0cy53aWR0aCArICdcIiAnXG5cbiAgY29uc3Qgc3ZnVGFnID0gJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICcgKyB3aWR0aCArIHZpZXdCb3ggKyAnIHNoYXBlLXJlbmRlcmluZz1cImNyaXNwRWRnZXNcIj4nICsgYmcgKyBwYXRoICsgJzwvc3ZnPlxcbidcblxuICBpZiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IobnVsbCwgc3ZnVGFnKVxuICB9XG5cbiAgcmV0dXJuIHN2Z1RhZ1xufVxuIiwgIlxuY29uc3QgY2FuUHJvbWlzZSA9IHJlcXVpcmUoJy4vY2FuLXByb21pc2UnKVxuXG5jb25zdCBRUkNvZGUgPSByZXF1aXJlKCcuL2NvcmUvcXJjb2RlJylcbmNvbnN0IENhbnZhc1JlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlci9jYW52YXMnKVxuY29uc3QgU3ZnUmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyL3N2Zy10YWcuanMnKVxuXG5mdW5jdGlvbiByZW5kZXJDYW52YXMgKHJlbmRlckZ1bmMsIGNhbnZhcywgdGV4dCwgb3B0cywgY2IpIHtcbiAgY29uc3QgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICBjb25zdCBhcmdzTnVtID0gYXJncy5sZW5ndGhcbiAgY29uc3QgaXNMYXN0QXJnQ2IgPSB0eXBlb2YgYXJnc1thcmdzTnVtIC0gMV0gPT09ICdmdW5jdGlvbidcblxuICBpZiAoIWlzTGFzdEFyZ0NiICYmICFjYW5Qcm9taXNlKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbGxiYWNrIHJlcXVpcmVkIGFzIGxhc3QgYXJndW1lbnQnKVxuICB9XG5cbiAgaWYgKGlzTGFzdEFyZ0NiKSB7XG4gICAgaWYgKGFyZ3NOdW0gPCAyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBmZXcgYXJndW1lbnRzIHByb3ZpZGVkJylcbiAgICB9XG5cbiAgICBpZiAoYXJnc051bSA9PT0gMikge1xuICAgICAgY2IgPSB0ZXh0XG4gICAgICB0ZXh0ID0gY2FudmFzXG4gICAgICBjYW52YXMgPSBvcHRzID0gdW5kZWZpbmVkXG4gICAgfSBlbHNlIGlmIChhcmdzTnVtID09PSAzKSB7XG4gICAgICBpZiAoY2FudmFzLmdldENvbnRleHQgJiYgdHlwZW9mIGNiID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjYiA9IG9wdHNcbiAgICAgICAgb3B0cyA9IHVuZGVmaW5lZFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2IgPSBvcHRzXG4gICAgICAgIG9wdHMgPSB0ZXh0XG4gICAgICAgIHRleHQgPSBjYW52YXNcbiAgICAgICAgY2FudmFzID0gdW5kZWZpbmVkXG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChhcmdzTnVtIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb28gZmV3IGFyZ3VtZW50cyBwcm92aWRlZCcpXG4gICAgfVxuXG4gICAgaWYgKGFyZ3NOdW0gPT09IDEpIHtcbiAgICAgIHRleHQgPSBjYW52YXNcbiAgICAgIGNhbnZhcyA9IG9wdHMgPSB1bmRlZmluZWRcbiAgICB9IGVsc2UgaWYgKGFyZ3NOdW0gPT09IDIgJiYgIWNhbnZhcy5nZXRDb250ZXh0KSB7XG4gICAgICBvcHRzID0gdGV4dFxuICAgICAgdGV4dCA9IGNhbnZhc1xuICAgICAgY2FudmFzID0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBRUkNvZGUuY3JlYXRlKHRleHQsIG9wdHMpXG4gICAgICAgIHJlc29sdmUocmVuZGVyRnVuYyhkYXRhLCBjYW52YXMsIG9wdHMpKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZWplY3QoZSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhID0gUVJDb2RlLmNyZWF0ZSh0ZXh0LCBvcHRzKVxuICAgIGNiKG51bGwsIHJlbmRlckZ1bmMoZGF0YSwgY2FudmFzLCBvcHRzKSlcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNiKGUpXG4gIH1cbn1cblxuZXhwb3J0cy5jcmVhdGUgPSBRUkNvZGUuY3JlYXRlXG5leHBvcnRzLnRvQ2FudmFzID0gcmVuZGVyQ2FudmFzLmJpbmQobnVsbCwgQ2FudmFzUmVuZGVyZXIucmVuZGVyKVxuZXhwb3J0cy50b0RhdGFVUkwgPSByZW5kZXJDYW52YXMuYmluZChudWxsLCBDYW52YXNSZW5kZXJlci5yZW5kZXJUb0RhdGFVUkwpXG5cbi8vIG9ubHkgc3ZnIGZvciBub3cuXG5leHBvcnRzLnRvU3RyaW5nID0gcmVuZGVyQ2FudmFzLmJpbmQobnVsbCwgZnVuY3Rpb24gKGRhdGEsIF8sIG9wdHMpIHtcbiAgcmV0dXJuIFN2Z1JlbmRlcmVyLnJlbmRlcihkYXRhLCBvcHRzKVxufSlcbiIsICJpbXBvcnQgeyBjYW5jZWxSZXF1ZXN0LCBteUxvYW5zIH0gZnJvbSBcIi4uL2FwaS9sb2Fuc1wiO1xyXG5pbXBvcnQgeyBwdWJsaWNTZXR0aW5ncywgc2V0dGluZ051bWJlciB9IGZyb20gXCIuLi9hcGkvY29udGVudFwiO1xyXG5pbXBvcnQgeyBib290IH0gZnJvbSBcIi4uL2NvcmUvYm9vdFwiO1xyXG5pbXBvcnQgeyBhY3Rpb25zLCBodG1sLCBpY29uLCBtb3VudCwgcXMgfSBmcm9tIFwiLi4vY29yZS9kb21cIjtcclxuaW1wb3J0IHsgZnJpZW5kbHkgfSBmcm9tIFwiLi4vY29yZS9lcnJvcnNcIjtcclxuaW1wb3J0IHsgY29uZmlybUJveCB9IGZyb20gXCIuLi9jb3JlL21vZGFsXCI7XHJcbmltcG9ydCB7IHJldmVhbCB9IGZyb20gXCIuLi9jb3JlL21vdGlvblwiO1xyXG5pbXBvcnQgeyBkdWVMYWJlbCwgZm9ybWF0RGF0ZSwgcGx1cmFsIH0gZnJvbSBcIi4uL2NvcmUvZm9ybWF0XCI7XHJcbmltcG9ydCB7IGN1cnJlbnQgfSBmcm9tIFwiLi4vY29yZS9zZXNzaW9uXCI7XHJcbmltcG9ydCB7IGZhaWwsIG9rIH0gZnJvbSBcIi4uL2NvcmUvdG9hc3RcIjtcclxuaW1wb3J0IHsgY292ZXIsIGVtcHR5LCBsb2FkaW5nLCBzdGF0dXNCYWRnZSB9IGZyb20gXCIuLi91aS9jb21wb25lbnRzXCI7XHJcbmltcG9ydCB0eXBlIHsgTG9hbiB9IGZyb20gXCIuLi90eXBlc1wiO1xyXG5pbXBvcnQgUVJDb2RlIGZyb20gXCJxcmNvZGVcIjtcclxuaW1wb3J0IHsgb3Blbk1vZGFsIH0gZnJvbSBcIi4uL2NvcmUvbW9kYWxcIjtcclxuXHJcbmNvbnN0IFRBQlMgPSBbXHJcbiAgeyBpZDogXCJhY3RpdmVcIiwgbGFiZWw6IFwiTm93XCIsIHN0YXR1c2VzOiBbXCJyZXF1ZXN0ZWRcIiwgXCJib3Jyb3dlZFwiXSB9LFxyXG4gIHsgaWQ6IFwiaGlzdG9yeVwiLCBsYWJlbDogXCJIaXN0b3J5XCIsIHN0YXR1c2VzOiBbXCJyZXR1cm5lZFwiLCBcInJlamVjdGVkXCIsIFwiY2FuY2VsbGVkXCJdIH0sXHJcbl0gYXMgY29uc3Q7XHJcblxyXG5sZXQgbG9hbnM6IExvYW5bXSA9IFtdO1xyXG5sZXQgdGFiOiAodHlwZW9mIFRBQlMpW251bWJlcl1bXCJpZFwiXSA9IFwiYWN0aXZlXCI7XHJcblxyXG5mdW5jdGlvbiByb3cobG9hbjogTG9hbikge1xyXG4gIGNvbnN0IGR1ZSA9IGxvYW4uc3RhdHVzID09PSBcImJvcnJvd2VkXCIgPyBkdWVMYWJlbChsb2FuLmR1ZV9hdCkgOiBudWxsO1xyXG4gIHJldHVybiBodG1sYFxyXG4gICAgPGFydGljbGUgY2xhc3M9XCJsb2FuLXJvdyBjYXJkIHB4XCIgZGF0YS1yZXZlYWw+XHJcbiAgICAgICR7bG9hbi5ib29rID8gY292ZXIoeyBpZDogbG9hbi5ib29rLmlkLCB0aXRsZTogbG9hbi5ib29rLnRpdGxlLCBjb3Zlcl91cmw6IGxvYW4uYm9vay5jb3Zlcl91cmwgfSkgOiBcIlwifVxyXG4gICAgICA8ZGl2PlxyXG4gICAgICAgIDxoMyBjbGFzcz1cImNhcmRfX3RpdGxlXCI+JHtsb2FuLmJvb2s/LnRpdGxlID8/IFwiUmVtb3ZlZCBib29rXCJ9ICR7c3RhdHVzQmFkZ2UobG9hbi5zdGF0dXMpfTwvaDM+XHJcbiAgICAgICAgPHAgY2xhc3M9XCJjYXJkX19tZXRhXCI+JHtsb2FuLmJvb2s/LmF1dGhvciA/PyBcIlwifTwvcD5cclxuICAgICAgICA8cCBjbGFzcz1cImNhcmRfX21ldGFcIj5SZXF1ZXN0ZWQgJHtmb3JtYXREYXRlKGxvYW4ucmVxdWVzdGVkX2F0KX0ke2xvYW4ucmV0dXJuZWRfYXQgPyBgIFx1MDBCNyBSZXR1cm5lZCAke2Zvcm1hdERhdGUobG9hbi5yZXR1cm5lZF9hdCl9YCA6IFwiXCJ9PC9wPlxyXG4gICAgICAgICR7ZHVlID8gaHRtbGA8c3BhbiBjbGFzcz1cImJhZGdlIGJhZGdlLS0ke2R1ZS50b25lfVwiPiR7ZHVlLnRleHR9PC9zcGFuPmAgOiBcIlwifVxyXG4gICAgICAgICR7bG9hbi5ub3RlID8gaHRtbGA8cCBjbGFzcz1cImNhcmRfX21ldGFcIj5Ob3RlOiAke2xvYW4ubm90ZX08L3A+YCA6IFwiXCJ9XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgICA8ZGl2IGNsYXNzPVwidGFibGVfX2FjdGlvbnNcIj4ke2xvYW4ucGlja3VwX2NvZGUgJiYgKGxvYW4uc3RhdHVzID09PSBcInJlcXVlc3RlZFwiIHx8IGxvYW4uc3RhdHVzID09PSBcImJvcnJvd2VkXCIpID8gaHRtbGA8YnV0dG9uIGNsYXNzPVwiYnRuIGJ0bi0tc20gYnRuLS1hY2NlbnRcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJxclwiIGRhdGEtaWQ9XCIke2xvYW4uaWR9XCI+JHtpY29uKFwicXJcIil9IE15IFFSPC9idXR0b24+YCA6IFwiXCJ9JHtsb2FuLnN0YXR1cyA9PT0gXCJyZXF1ZXN0ZWRcIiA/IGh0bWxgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tLXNtIGJ0bi0tZGFuZ2VyIHB4XCIgdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwiY2FuY2VsXCIgZGF0YS1pZD1cIiR7bG9hbi5pZH1cIj5DYW5jZWw8L2J1dHRvbj5gIDogXCJcIn08L2Rpdj5cclxuICAgIDwvYXJ0aWNsZT5gO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gIGNvbnN0IGNvdW50cyA9IE9iamVjdC5mcm9tRW50cmllcyhUQUJTLm1hcCgodCkgPT4gW3QuaWQsIGxvYW5zLmZpbHRlcigobCkgPT4gKHQuc3RhdHVzZXMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGwuc3RhdHVzKSkubGVuZ3RoXSkpO1xyXG4gIG1vdW50KHFzKFwiI2xvYW5UYWJzXCIpLCBodG1sYCR7VEFCUy5tYXAoKHQpID0+IGh0bWxgPGJ1dHRvbiBjbGFzcz1cInRhYlwiIHJvbGU9XCJ0YWJcIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJ0YWJcIiBkYXRhLXRhYj1cIiR7dC5pZH1cIiBhcmlhLXNlbGVjdGVkPVwiJHt0LmlkID09PSB0YWJ9XCI+JHt0LmxhYmVsfSA8c3BhbiBjbGFzcz1cInRhYl9fY291bnRcIj4ke2NvdW50c1t0LmlkXX08L3NwYW4+PC9idXR0b24+YCl9YCk7XHJcbiAgY29uc3Qgc2hvd24gPSBsb2Fucy5maWx0ZXIoKGwpID0+IChUQUJTLmZpbmQoKHQpID0+IHQuaWQgPT09IHRhYikhLnN0YXR1c2VzIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhsLnN0YXR1cykpO1xyXG4gIGNvbnN0IGxpc3QgPSBxcyhcIiNsb2FuTGlzdFwiKTtcclxuICBtb3VudChsaXN0LCBzaG93bi5sZW5ndGhcclxuICAgID8gaHRtbGA8ZGl2IGNsYXNzPVwic3RhY2tcIj4ke3Nob3duLm1hcChyb3cpfTwvZGl2PmBcclxuICAgIDogZW1wdHkodGFiID09PSBcImFjdGl2ZVwiID8gXCJObyBib29rcyByaWdodCBub3dcIiA6IFwiTm8gaGlzdG9yeSB5ZXRcIiwgdGFiID09PSBcImFjdGl2ZVwiID8gXCJQaWNrIHNvbWV0aGluZyBmcm9tIHRoZSBjYXRhbG9nLlwiIDogXCJSZXR1cm5lZCBhbmQgZGVjbGluZWQgYm9va3Mgc2hvdyB1cCBoZXJlLlwiKSk7XHJcbiAgcmV2ZWFsKGxpc3QpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIG1vdW50KHFzKFwiI2xvYW5MaXN0XCIpLCBsb2FkaW5nKFwiQ2hlY2tpbmcgeW91ciBzaGVsZlwiKSk7XHJcbiAgbG9hbnMgPSBhd2FpdCBteUxvYW5zKGN1cnJlbnQoKS5wcm9maWxlIS5pZCk7XHJcbiAgZHJhdygpO1xyXG59XHJcblxyXG5ib290KGFzeW5jICgpID0+IHtcclxuICBjb25zdCBzZXR0aW5ncyA9IGF3YWl0IHB1YmxpY1NldHRpbmdzKCk7XHJcbiAgY29uc3QgbWF4ID0gc2V0dGluZ051bWJlcihzZXR0aW5ncywgXCJtYXhfbG9hbnNcIiwgMyk7XHJcbiAgY29uc3QgZGF5cyA9IHNldHRpbmdOdW1iZXIoc2V0dGluZ3MsIFwibG9hbl9kYXlzXCIsIDcpO1xyXG4gIHFzKFwiI2xpbWl0Tm90ZVwiKS50ZXh0Q29udGVudCA9IGBVcCB0byAke3BsdXJhbChtYXgsIFwiYm9va1wiKX0gYXQgYSB0aW1lLCAke3BsdXJhbChkYXlzLCBcImRheVwiKX0gZWFjaC5gO1xyXG4gIGFjdGlvbnMocXMoXCJbZGF0YS1wYWdlLXJvb3RdXCIpLCB7XHJcbiAgICB0YWI6IChlbCkgPT4ge1xyXG4gICAgICB0YWIgPSBlbC5kYXRhc2V0LnRhYiBhcyB0eXBlb2YgdGFiO1xyXG4gICAgICBkcmF3KCk7XHJcbiAgICB9LFxyXG4gICAgLy8gdGhlIE9ORSBRUiB0aGUgbGlicmFyeSBkZXNrIHNjYW5zIGZvciBhbGwgb2YgdGhlIHN0dWRlbnQncyBib29rczsgdGhlIHNhbWUgb25lIGlzIGluIHRoZSBlbWFpbFxyXG4gICAgcXI6IGFzeW5jIChlbCkgPT4ge1xyXG4gICAgICBjb25zdCBsb2FuID0gbG9hbnMuZmluZCgobCkgPT4gbC5pZCA9PT0gTnVtYmVyKGVsLmRhdGFzZXQuaWQpKTtcclxuICAgICAgaWYgKCFsb2FuPy5waWNrdXBfY29kZSkgcmV0dXJuO1xyXG4gICAgICBjb25zdCBpbWFnZSA9IGF3YWl0IFFSQ29kZS50b0RhdGFVUkwoYCR7bG9jYXRpb24ub3JpZ2lufS9waWNrdXA/Yz0ke2xvYW4ucGlja3VwX2NvZGV9YCwgeyBtYXJnaW46IDEsIHdpZHRoOiAzNjAsIGVycm9yQ29ycmVjdGlvbkxldmVsOiBcIk1cIiwgY29sb3I6IHsgZGFyazogXCIjMGIxZjVjXCIsIGxpZ2h0OiBcIiNmZmZmZmZcIiB9IH0pO1xyXG4gICAgICBjb25zdCBtaW5lID0gbG9hbnMuZmlsdGVyKChsKSA9PiBsLnN0YXR1cyA9PT0gXCJyZXF1ZXN0ZWRcIiB8fCBsLnN0YXR1cyA9PT0gXCJib3Jyb3dlZFwiKTtcclxuICAgICAgb3Blbk1vZGFsKFwiTXkgcGlja3VwIFFSXCIsIGh0bWxgPGRpdiBjbGFzcz1cInFyLW1vZGFsXCI+PGltZyBzcmM9XCIke2ltYWdlfVwiIGFsdD1cIlFSIGNvZGUgZm9yICR7bG9hbi5waWNrdXBfY29kZX1cIj48c3BhbiBjbGFzcz1cInFyLW1vZGFsX19jb2RlIG1vbm9cIj4ke2xvYW4ucGlja3VwX2NvZGV9PC9zcGFuPlxyXG4gICAgICAgIDxwIGNsYXNzPVwidGV4dC1zb2Z0XCI+T25lIFFSIGZvciBhbGwgeW91ciBib29rcy4gU2hvdyBpdCBhdCB0aGUgbGlicmFyeSBkZXNrIGFuZCBzdGFmZiBzY2FuIGl0IG9uY2UuPC9wPlxyXG4gICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIj4ke21pbmUubWFwKChsKSA9PiBodG1sYDxsaSBjbGFzcz1cImxpc3RfX2l0ZW1cIj48ZGl2IGNsYXNzPVwibGlzdF9fYm9keVwiPjxwIGNsYXNzPVwibGlzdF9fdGl0bGVcIj4ke2wuYm9vaz8udGl0bGUgPz8gXCJCb29rXCJ9PC9wPjxwIGNsYXNzPVwibGlzdF9fbWV0YVwiPiR7bC5zdGF0dXMgPT09IFwicmVxdWVzdGVkXCIgPyBcIlJlc2VydmVkLCB3YWl0aW5nIGZvciBwaWNrdXBcIiA6IFwiQm9ycm93ZWRcIn08L3A+PC9kaXY+PC9saT5gKX08L3VsPjwvZGl2PmAsIHsgZm9vdGVyOiBodG1sYDxidXR0b24gY2xhc3M9XCJidG5cIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1jbG9zZT5Eb25lPC9idXR0b24+YCB9KTtcclxuICAgIH0sXHJcbiAgICBjYW5jZWw6IGFzeW5jIChlbCkgPT4ge1xyXG4gICAgICBpZiAoIShhd2FpdCBjb25maXJtQm94KFwiQ2FuY2VsIHRoaXMgcmVxdWVzdD9cIiwgXCJUaGUgYm9vayBnb2VzIGJhY2sgb24gdGhlIHNoZWxmIGZvciBvdGhlcnMuXCIsIFwiQ2FuY2VsIHJlcXVlc3RcIiwgdHJ1ZSkpKSByZXR1cm47XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgY2FuY2VsUmVxdWVzdChOdW1iZXIoZWwuZGF0YXNldC5pZCkpO1xyXG4gICAgICAgIG9rKFwiUmVxdWVzdCBjYW5jZWxsZWQuXCIpO1xyXG4gICAgICAgIGF3YWl0IGxvYWQoKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBmYWlsKGZyaWVuZGx5KGVycm9yKSk7XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgfSk7XHJcbiAgYXdhaXQgbG9hZCgpO1xyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFJQSxXQUFPLFVBQVUsV0FBWTtBQUMzQixhQUFPLE9BQU8sWUFBWSxjQUFjLFFBQVEsYUFBYSxRQUFRLFVBQVU7QUFBQSxJQUNqRjtBQUFBO0FBQUE7OztBQ05BO0FBQUE7QUFBQSxRQUFJO0FBQ0osUUFBTSxrQkFBa0I7QUFBQSxNQUN0QjtBQUFBO0FBQUEsTUFDQTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQzFDO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDN0M7QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUN0RDtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLElBQ3hEO0FBUUEsWUFBUSxnQkFBZ0IsU0FBUyxjQUFlLFNBQVM7QUFDdkQsVUFBSSxDQUFDLFFBQVMsT0FBTSxJQUFJLE1BQU0sdUNBQXVDO0FBQ3JFLFVBQUksVUFBVSxLQUFLLFVBQVUsR0FBSSxPQUFNLElBQUksTUFBTSwyQ0FBMkM7QUFDNUYsYUFBTyxVQUFVLElBQUk7QUFBQSxJQUN2QjtBQVFBLFlBQVEsMEJBQTBCLFNBQVMsd0JBQXlCLFNBQVM7QUFDM0UsYUFBTyxnQkFBZ0IsT0FBTztBQUFBLElBQ2hDO0FBUUEsWUFBUSxjQUFjLFNBQVUsTUFBTTtBQUNwQyxVQUFJLFFBQVE7QUFFWixhQUFPLFNBQVMsR0FBRztBQUNqQjtBQUNBLGtCQUFVO0FBQUEsTUFDWjtBQUVBLGFBQU87QUFBQSxJQUNUO0FBRUEsWUFBUSxvQkFBb0IsU0FBUyxrQkFBbUIsR0FBRztBQUN6RCxVQUFJLE9BQU8sTUFBTSxZQUFZO0FBQzNCLGNBQU0sSUFBSSxNQUFNLHVDQUF1QztBQUFBLE1BQ3pEO0FBRUEsdUJBQWlCO0FBQUEsSUFDbkI7QUFFQSxZQUFRLHFCQUFxQixXQUFZO0FBQ3ZDLGFBQU8sT0FBTyxtQkFBbUI7QUFBQSxJQUNuQztBQUVBLFlBQVEsU0FBUyxTQUFTLE9BQVEsT0FBTztBQUN2QyxhQUFPLGVBQWUsS0FBSztBQUFBLElBQzdCO0FBQUE7QUFBQTs7O0FDOURBO0FBQUE7QUFBQSxZQUFRLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDckIsWUFBUSxJQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ3JCLFlBQVEsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUNyQixZQUFRLElBQUksRUFBRSxLQUFLLEVBQUU7QUFFckIsYUFBUyxXQUFZLFFBQVE7QUFDM0IsVUFBSSxPQUFPLFdBQVcsVUFBVTtBQUM5QixjQUFNLElBQUksTUFBTSx1QkFBdUI7QUFBQSxNQUN6QztBQUVBLFlBQU0sUUFBUSxPQUFPLFlBQVk7QUFFakMsY0FBUSxPQUFPO0FBQUEsUUFDYixLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQ0gsaUJBQU8sUUFBUTtBQUFBLFFBRWpCLEtBQUs7QUFBQSxRQUNMLEtBQUs7QUFDSCxpQkFBTyxRQUFRO0FBQUEsUUFFakIsS0FBSztBQUFBLFFBQ0wsS0FBSztBQUNILGlCQUFPLFFBQVE7QUFBQSxRQUVqQixLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQ0gsaUJBQU8sUUFBUTtBQUFBLFFBRWpCO0FBQ0UsZ0JBQU0sSUFBSSxNQUFNLHVCQUF1QixNQUFNO0FBQUEsTUFDakQ7QUFBQSxJQUNGO0FBRUEsWUFBUSxVQUFVLFNBQVMsUUFBUyxPQUFPO0FBQ3pDLGFBQU8sU0FBUyxPQUFPLE1BQU0sUUFBUSxlQUNuQyxNQUFNLE9BQU8sS0FBSyxNQUFNLE1BQU07QUFBQSxJQUNsQztBQUVBLFlBQVEsT0FBTyxTQUFTLEtBQU0sT0FBTyxjQUFjO0FBQ2pELFVBQUksUUFBUSxRQUFRLEtBQUssR0FBRztBQUMxQixlQUFPO0FBQUEsTUFDVDtBQUVBLFVBQUk7QUFDRixlQUFPLFdBQVcsS0FBSztBQUFBLE1BQ3pCLFNBQVMsR0FBRztBQUNWLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBO0FBQUE7OztBQ2pEQTtBQUFBO0FBQUEsYUFBUyxZQUFhO0FBQ3BCLFdBQUssU0FBUyxDQUFDO0FBQ2YsV0FBSyxTQUFTO0FBQUEsSUFDaEI7QUFFQSxjQUFVLFlBQVk7QUFBQSxNQUVwQixLQUFLLFNBQVUsT0FBTztBQUNwQixjQUFNLFdBQVcsS0FBSyxNQUFNLFFBQVEsQ0FBQztBQUNyQyxnQkFBUyxLQUFLLE9BQU8sUUFBUSxNQUFPLElBQUksUUFBUSxJQUFNLE9BQU87QUFBQSxNQUMvRDtBQUFBLE1BRUEsS0FBSyxTQUFVLEtBQUssUUFBUTtBQUMxQixpQkFBUyxJQUFJLEdBQUcsSUFBSSxRQUFRLEtBQUs7QUFDL0IsZUFBSyxRQUFTLFFBQVMsU0FBUyxJQUFJLElBQU0sT0FBTyxDQUFDO0FBQUEsUUFDcEQ7QUFBQSxNQUNGO0FBQUEsTUFFQSxpQkFBaUIsV0FBWTtBQUMzQixlQUFPLEtBQUs7QUFBQSxNQUNkO0FBQUEsTUFFQSxRQUFRLFNBQVUsS0FBSztBQUNyQixjQUFNLFdBQVcsS0FBSyxNQUFNLEtBQUssU0FBUyxDQUFDO0FBQzNDLFlBQUksS0FBSyxPQUFPLFVBQVUsVUFBVTtBQUNsQyxlQUFLLE9BQU8sS0FBSyxDQUFDO0FBQUEsUUFDcEI7QUFFQSxZQUFJLEtBQUs7QUFDUCxlQUFLLE9BQU8sUUFBUSxLQUFNLFFBQVUsS0FBSyxTQUFTO0FBQUEsUUFDcEQ7QUFFQSxhQUFLO0FBQUEsTUFDUDtBQUFBLElBQ0Y7QUFFQSxXQUFPLFVBQVU7QUFBQTtBQUFBOzs7QUNwQ2pCO0FBQUE7QUFLQSxhQUFTLFVBQVcsTUFBTTtBQUN4QixVQUFJLENBQUMsUUFBUSxPQUFPLEdBQUc7QUFDckIsY0FBTSxJQUFJLE1BQU0sbURBQW1EO0FBQUEsTUFDckU7QUFFQSxXQUFLLE9BQU87QUFDWixXQUFLLE9BQU8sSUFBSSxXQUFXLE9BQU8sSUFBSTtBQUN0QyxXQUFLLGNBQWMsSUFBSSxXQUFXLE9BQU8sSUFBSTtBQUFBLElBQy9DO0FBV0EsY0FBVSxVQUFVLE1BQU0sU0FBVUEsTUFBSyxLQUFLLE9BQU8sVUFBVTtBQUM3RCxZQUFNLFFBQVFBLE9BQU0sS0FBSyxPQUFPO0FBQ2hDLFdBQUssS0FBSyxLQUFLLElBQUk7QUFDbkIsVUFBSSxTQUFVLE1BQUssWUFBWSxLQUFLLElBQUk7QUFBQSxJQUMxQztBQVNBLGNBQVUsVUFBVSxNQUFNLFNBQVVBLE1BQUssS0FBSztBQUM1QyxhQUFPLEtBQUssS0FBS0EsT0FBTSxLQUFLLE9BQU8sR0FBRztBQUFBLElBQ3hDO0FBVUEsY0FBVSxVQUFVLE1BQU0sU0FBVUEsTUFBSyxLQUFLLE9BQU87QUFDbkQsV0FBSyxLQUFLQSxPQUFNLEtBQUssT0FBTyxHQUFHLEtBQUs7QUFBQSxJQUN0QztBQVNBLGNBQVUsVUFBVSxhQUFhLFNBQVVBLE1BQUssS0FBSztBQUNuRCxhQUFPLEtBQUssWUFBWUEsT0FBTSxLQUFLLE9BQU8sR0FBRztBQUFBLElBQy9DO0FBRUEsV0FBTyxVQUFVO0FBQUE7QUFBQTs7O0FDaEVqQjtBQUFBO0FBVUEsUUFBTSxnQkFBZ0IsZ0JBQW1CO0FBZ0J6QyxZQUFRLGtCQUFrQixTQUFTLGdCQUFpQixTQUFTO0FBQzNELFVBQUksWUFBWSxFQUFHLFFBQU8sQ0FBQztBQUUzQixZQUFNLFdBQVcsS0FBSyxNQUFNLFVBQVUsQ0FBQyxJQUFJO0FBQzNDLFlBQU0sT0FBTyxjQUFjLE9BQU87QUFDbEMsWUFBTSxZQUFZLFNBQVMsTUFBTSxLQUFLLEtBQUssTUFBTSxPQUFPLE9BQU8sSUFBSSxXQUFXLEVBQUUsSUFBSTtBQUNwRixZQUFNLFlBQVksQ0FBQyxPQUFPLENBQUM7QUFFM0IsZUFBUyxJQUFJLEdBQUcsSUFBSSxXQUFXLEdBQUcsS0FBSztBQUNyQyxrQkFBVSxDQUFDLElBQUksVUFBVSxJQUFJLENBQUMsSUFBSTtBQUFBLE1BQ3BDO0FBRUEsZ0JBQVUsS0FBSyxDQUFDO0FBRWhCLGFBQU8sVUFBVSxRQUFRO0FBQUEsSUFDM0I7QUFzQkEsWUFBUSxlQUFlLFNBQVMsYUFBYyxTQUFTO0FBQ3JELFlBQU0sU0FBUyxDQUFDO0FBQ2hCLFlBQU0sTUFBTSxRQUFRLGdCQUFnQixPQUFPO0FBQzNDLFlBQU0sWUFBWSxJQUFJO0FBRXRCLGVBQVMsSUFBSSxHQUFHLElBQUksV0FBVyxLQUFLO0FBQ2xDLGlCQUFTLElBQUksR0FBRyxJQUFJLFdBQVcsS0FBSztBQUVsQyxjQUFLLE1BQU0sS0FBSyxNQUFNO0FBQUEsVUFDakIsTUFBTSxLQUFLLE1BQU0sWUFBWTtBQUFBLFVBQzdCLE1BQU0sWUFBWSxLQUFLLE1BQU0sR0FBSTtBQUNwQztBQUFBLFVBQ0Y7QUFFQSxpQkFBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUFBLFFBQzlCO0FBQUEsTUFDRjtBQUVBLGFBQU87QUFBQSxJQUNUO0FBQUE7QUFBQTs7O0FDbEZBO0FBQUE7QUFBQSxRQUFNLGdCQUFnQixnQkFBbUI7QUFDekMsUUFBTSxzQkFBc0I7QUFTNUIsWUFBUSxlQUFlLFNBQVMsYUFBYyxTQUFTO0FBQ3JELFlBQU0sT0FBTyxjQUFjLE9BQU87QUFFbEMsYUFBTztBQUFBO0FBQUEsUUFFTCxDQUFDLEdBQUcsQ0FBQztBQUFBO0FBQUEsUUFFTCxDQUFDLE9BQU8scUJBQXFCLENBQUM7QUFBQTtBQUFBLFFBRTlCLENBQUMsR0FBRyxPQUFPLG1CQUFtQjtBQUFBLE1BQ2hDO0FBQUEsSUFDRjtBQUFBO0FBQUE7OztBQ3JCQTtBQUFBO0FBSUEsWUFBUSxXQUFXO0FBQUEsTUFDakIsWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLElBQ2Q7QUFNQSxRQUFNLGdCQUFnQjtBQUFBLE1BQ3BCLElBQUk7QUFBQSxNQUNKLElBQUk7QUFBQSxNQUNKLElBQUk7QUFBQSxNQUNKLElBQUk7QUFBQSxJQUNOO0FBUUEsWUFBUSxVQUFVLFNBQVMsUUFBUyxNQUFNO0FBQ3hDLGFBQU8sUUFBUSxRQUFRLFNBQVMsTUFBTSxDQUFDLE1BQU0sSUFBSSxLQUFLLFFBQVEsS0FBSyxRQUFRO0FBQUEsSUFDN0U7QUFTQSxZQUFRLE9BQU8sU0FBUyxLQUFNLE9BQU87QUFDbkMsYUFBTyxRQUFRLFFBQVEsS0FBSyxJQUFJLFNBQVMsT0FBTyxFQUFFLElBQUk7QUFBQSxJQUN4RDtBQVNBLFlBQVEsZUFBZSxTQUFTLGFBQWMsTUFBTTtBQUNsRCxZQUFNLE9BQU8sS0FBSztBQUNsQixVQUFJLFNBQVM7QUFDYixVQUFJLGVBQWU7QUFDbkIsVUFBSSxlQUFlO0FBQ25CLFVBQUksVUFBVTtBQUNkLFVBQUksVUFBVTtBQUVkLGVBQVNDLE9BQU0sR0FBR0EsT0FBTSxNQUFNQSxRQUFPO0FBQ25DLHVCQUFlLGVBQWU7QUFDOUIsa0JBQVUsVUFBVTtBQUVwQixpQkFBUyxNQUFNLEdBQUcsTUFBTSxNQUFNLE9BQU87QUFDbkMsY0FBSUMsVUFBUyxLQUFLLElBQUlELE1BQUssR0FBRztBQUM5QixjQUFJQyxZQUFXLFNBQVM7QUFDdEI7QUFBQSxVQUNGLE9BQU87QUFDTCxnQkFBSSxnQkFBZ0IsRUFBRyxXQUFVLGNBQWMsTUFBTSxlQUFlO0FBQ3BFLHNCQUFVQTtBQUNWLDJCQUFlO0FBQUEsVUFDakI7QUFFQSxVQUFBQSxVQUFTLEtBQUssSUFBSSxLQUFLRCxJQUFHO0FBQzFCLGNBQUlDLFlBQVcsU0FBUztBQUN0QjtBQUFBLFVBQ0YsT0FBTztBQUNMLGdCQUFJLGdCQUFnQixFQUFHLFdBQVUsY0FBYyxNQUFNLGVBQWU7QUFDcEUsc0JBQVVBO0FBQ1YsMkJBQWU7QUFBQSxVQUNqQjtBQUFBLFFBQ0Y7QUFFQSxZQUFJLGdCQUFnQixFQUFHLFdBQVUsY0FBYyxNQUFNLGVBQWU7QUFDcEUsWUFBSSxnQkFBZ0IsRUFBRyxXQUFVLGNBQWMsTUFBTSxlQUFlO0FBQUEsTUFDdEU7QUFFQSxhQUFPO0FBQUEsSUFDVDtBQU9BLFlBQVEsZUFBZSxTQUFTLGFBQWMsTUFBTTtBQUNsRCxZQUFNLE9BQU8sS0FBSztBQUNsQixVQUFJLFNBQVM7QUFFYixlQUFTRCxPQUFNLEdBQUdBLE9BQU0sT0FBTyxHQUFHQSxRQUFPO0FBQ3ZDLGlCQUFTLE1BQU0sR0FBRyxNQUFNLE9BQU8sR0FBRyxPQUFPO0FBQ3ZDLGdCQUFNLE9BQU8sS0FBSyxJQUFJQSxNQUFLLEdBQUcsSUFDNUIsS0FBSyxJQUFJQSxNQUFLLE1BQU0sQ0FBQyxJQUNyQixLQUFLLElBQUlBLE9BQU0sR0FBRyxHQUFHLElBQ3JCLEtBQUssSUFBSUEsT0FBTSxHQUFHLE1BQU0sQ0FBQztBQUUzQixjQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUc7QUFBQSxRQUNoQztBQUFBLE1BQ0Y7QUFFQSxhQUFPLFNBQVMsY0FBYztBQUFBLElBQ2hDO0FBUUEsWUFBUSxlQUFlLFNBQVMsYUFBYyxNQUFNO0FBQ2xELFlBQU0sT0FBTyxLQUFLO0FBQ2xCLFVBQUksU0FBUztBQUNiLFVBQUksVUFBVTtBQUNkLFVBQUksVUFBVTtBQUVkLGVBQVNBLE9BQU0sR0FBR0EsT0FBTSxNQUFNQSxRQUFPO0FBQ25DLGtCQUFVLFVBQVU7QUFDcEIsaUJBQVMsTUFBTSxHQUFHLE1BQU0sTUFBTSxPQUFPO0FBQ25DLG9CQUFZLFdBQVcsSUFBSyxPQUFTLEtBQUssSUFBSUEsTUFBSyxHQUFHO0FBQ3RELGNBQUksT0FBTyxPQUFPLFlBQVksUUFBUyxZQUFZLElBQVE7QUFFM0Qsb0JBQVksV0FBVyxJQUFLLE9BQVMsS0FBSyxJQUFJLEtBQUtBLElBQUc7QUFDdEQsY0FBSSxPQUFPLE9BQU8sWUFBWSxRQUFTLFlBQVksSUFBUTtBQUFBLFFBQzdEO0FBQUEsTUFDRjtBQUVBLGFBQU8sU0FBUyxjQUFjO0FBQUEsSUFDaEM7QUFVQSxZQUFRLGVBQWUsU0FBUyxhQUFjLE1BQU07QUFDbEQsVUFBSSxZQUFZO0FBQ2hCLFlBQU0sZUFBZSxLQUFLLEtBQUs7QUFFL0IsZUFBUyxJQUFJLEdBQUcsSUFBSSxjQUFjLElBQUssY0FBYSxLQUFLLEtBQUssQ0FBQztBQUUvRCxZQUFNLElBQUksS0FBSyxJQUFJLEtBQUssS0FBTSxZQUFZLE1BQU0sZUFBZ0IsQ0FBQyxJQUFJLEVBQUU7QUFFdkUsYUFBTyxJQUFJLGNBQWM7QUFBQSxJQUMzQjtBQVVBLGFBQVMsVUFBVyxhQUFhLEdBQUcsR0FBRztBQUNyQyxjQUFRLGFBQWE7QUFBQSxRQUNuQixLQUFLLFFBQVEsU0FBUztBQUFZLGtCQUFRLElBQUksS0FBSyxNQUFNO0FBQUEsUUFDekQsS0FBSyxRQUFRLFNBQVM7QUFBWSxpQkFBTyxJQUFJLE1BQU07QUFBQSxRQUNuRCxLQUFLLFFBQVEsU0FBUztBQUFZLGlCQUFPLElBQUksTUFBTTtBQUFBLFFBQ25ELEtBQUssUUFBUSxTQUFTO0FBQVksa0JBQVEsSUFBSSxLQUFLLE1BQU07QUFBQSxRQUN6RCxLQUFLLFFBQVEsU0FBUztBQUFZLGtCQUFRLEtBQUssTUFBTSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxDQUFDLEtBQUssTUFBTTtBQUFBLFFBQ3pGLEtBQUssUUFBUSxTQUFTO0FBQVksaUJBQVEsSUFBSSxJQUFLLElBQUssSUFBSSxJQUFLLE1BQU07QUFBQSxRQUN2RSxLQUFLLFFBQVEsU0FBUztBQUFZLGtCQUFTLElBQUksSUFBSyxJQUFLLElBQUksSUFBSyxLQUFLLE1BQU07QUFBQSxRQUM3RSxLQUFLLFFBQVEsU0FBUztBQUFZLGtCQUFTLElBQUksSUFBSyxLQUFLLElBQUksS0FBSyxLQUFLLE1BQU07QUFBQSxRQUU3RTtBQUFTLGdCQUFNLElBQUksTUFBTSxxQkFBcUIsV0FBVztBQUFBLE1BQzNEO0FBQUEsSUFDRjtBQVFBLFlBQVEsWUFBWSxTQUFTLFVBQVcsU0FBUyxNQUFNO0FBQ3JELFlBQU0sT0FBTyxLQUFLO0FBRWxCLGVBQVMsTUFBTSxHQUFHLE1BQU0sTUFBTSxPQUFPO0FBQ25DLGlCQUFTQSxPQUFNLEdBQUdBLE9BQU0sTUFBTUEsUUFBTztBQUNuQyxjQUFJLEtBQUssV0FBV0EsTUFBSyxHQUFHLEVBQUc7QUFDL0IsZUFBSyxJQUFJQSxNQUFLLEtBQUssVUFBVSxTQUFTQSxNQUFLLEdBQUcsQ0FBQztBQUFBLFFBQ2pEO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFRQSxZQUFRLGNBQWMsU0FBUyxZQUFhLE1BQU0saUJBQWlCO0FBQ2pFLFlBQU0sY0FBYyxPQUFPLEtBQUssUUFBUSxRQUFRLEVBQUU7QUFDbEQsVUFBSSxjQUFjO0FBQ2xCLFVBQUksZUFBZTtBQUVuQixlQUFTLElBQUksR0FBRyxJQUFJLGFBQWEsS0FBSztBQUNwQyx3QkFBZ0IsQ0FBQztBQUNqQixnQkFBUSxVQUFVLEdBQUcsSUFBSTtBQUd6QixjQUFNLFVBQ0osUUFBUSxhQUFhLElBQUksSUFDekIsUUFBUSxhQUFhLElBQUksSUFDekIsUUFBUSxhQUFhLElBQUksSUFDekIsUUFBUSxhQUFhLElBQUk7QUFHM0IsZ0JBQVEsVUFBVSxHQUFHLElBQUk7QUFFekIsWUFBSSxVQUFVLGNBQWM7QUFDMUIseUJBQWU7QUFDZix3QkFBYztBQUFBLFFBQ2hCO0FBQUEsTUFDRjtBQUVBLGFBQU87QUFBQSxJQUNUO0FBQUE7QUFBQTs7O0FDek9BO0FBQUE7QUFBQSxRQUFNLFVBQVU7QUFFaEIsUUFBTSxrQkFBa0I7QUFBQTtBQUFBLE1BRXRCO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFDVDtBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQ1Q7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUNUO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFDVDtBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQ1Q7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUNUO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFDVDtBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQ1Q7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUNUO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFDVDtBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQ1Q7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUNWO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFJO0FBQUEsTUFDVjtBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBSTtBQUFBLE1BQ1Y7QUFBQSxNQUFHO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNYO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWDtBQUFBLE1BQUc7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1g7QUFBQSxNQUFHO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNYO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWDtBQUFBLE1BQUc7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1g7QUFBQSxNQUFHO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNYO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWDtBQUFBLE1BQUc7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1g7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsSUFDZDtBQUVBLFFBQU0scUJBQXFCO0FBQUE7QUFBQSxNQUV6QjtBQUFBLE1BQUc7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1g7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQ1o7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNaO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDWjtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSztBQUFBLE1BQ2I7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUs7QUFBQSxNQUNiO0FBQUEsTUFBSTtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZDtBQUFBLE1BQUk7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Q7QUFBQSxNQUFJO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNkO0FBQUEsTUFBSTtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZDtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Y7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNmO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Y7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNmO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Y7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNmO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Y7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNmO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFDZjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQ2Y7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUNmO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFNO0FBQUEsTUFDaEI7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQU07QUFBQSxNQUNoQjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBTTtBQUFBLE1BQ2hCO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFNO0FBQUEsTUFDaEI7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQU07QUFBQSxNQUNoQjtBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBTTtBQUFBLE1BQ2hCO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFNO0FBQUEsTUFDaEI7QUFBQSxNQUFLO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUNqQjtBQUFBLE1BQUs7QUFB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LEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxPQUFPLEdBQUcsUUFBUSxFQUFFLENBQUM7QUFDN0QsVUFBSSxDQUFDLE1BQU0sWUFBYTtBQUN4QixZQUFNLFFBQVEsTUFBTSxjQUFBQyxRQUFPLFVBQVUsR0FBRyxTQUFTLE1BQU0sYUFBYSxLQUFLLFdBQVcsSUFBSSxFQUFFLFFBQVEsR0FBRyxPQUFPLEtBQUssc0JBQXNCLEtBQUssT0FBTyxFQUFFLE1BQU0sV0FBVyxPQUFPLFVBQVUsRUFBRSxDQUFDO0FBQzFMLFlBQU0sT0FBTyxNQUFNLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxlQUFlLEVBQUUsV0FBVyxVQUFVO0FBQ3BGLGdCQUFVLGdCQUFnQix1Q0FBdUMsS0FBSyxzQkFBc0IsS0FBSyxXQUFXLHVDQUF1QyxLQUFLLFdBQVc7QUFBQTtBQUFBLDJCQUU5SSxLQUFLLElBQUksQ0FBQyxNQUFNLDZFQUE2RSxFQUFFLE1BQU0sU0FBUyxNQUFNLDZCQUE2QixFQUFFLFdBQVcsY0FBYyxpQ0FBaUMsVUFBVSxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsUUFBUSxpRUFBaUUsQ0FBQztBQUFBLElBQzNWO0FBQUEsSUFDQSxRQUFRLE9BQU8sT0FBTztBQUNwQixVQUFJLENBQUUsTUFBTSxXQUFXLHdCQUF3QiwrQ0FBK0Msa0JBQWtCLElBQUksRUFBSTtBQUN4SCxVQUFJO0FBQ0YsY0FBTSxjQUFjLE9BQU8sR0FBRyxRQUFRLEVBQUUsQ0FBQztBQUN6QyxXQUFHLG9CQUFvQjtBQUN2QixjQUFNLEtBQUs7QUFBQSxNQUNiLFNBQVMsT0FBTztBQUNkLGFBQUssU0FBUyxLQUFLLENBQUM7QUFBQSxNQUN0QjtBQUFBLElBQ0Y7QUFBQSxFQUNGLENBQUM7QUFDRCxRQUFNLEtBQUs7QUFDYixDQUFDOyIsCiAgIm5hbWVzIjogWyJyb3ciLCAicm93IiwgIm1vZHVsZSIsICJyb3ciLCAicmVxdWlyZV91dGlscyIsICJyb3ciLCAiUVJDb2RlIiwgIlFSQ29kZSJdCn0K
