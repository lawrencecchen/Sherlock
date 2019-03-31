"use strict";
exports.__esModule = true;
var RectangleUtils = /** @class */ (function () {
    function RectangleUtils() {
    }
    RectangleUtils.is_adjacent = function (A, B) {
        var _a = A[0], ax1 = _a[0], ay1 = _a[1], _b = A[1], ax2 = _b[0], ay2 = _b[1];
        var _c = B[0], bx1 = _c[0], by1 = _c[1], _d = B[1], bx2 = _d[0], by2 = _d[1];
        var tolerance = 1;
        var adj = !(((ax1 - bx2) > tolerance)
            || ((bx1 - ax2) > tolerance)
            || ((ay1 - by2) > tolerance)
            || ((by1 - ay2) > tolerance));
        return adj;
    };
    RectangleUtils.bounding_box = function (A, B) {
        var _a = A[0], ax1 = _a[0], ay1 = _a[1], _b = A[1], ax2 = _b[0], ay2 = _b[1];
        var _c = B[0], bx1 = _c[0], by1 = _c[1], _d = B[1], bx2 = _d[0], by2 = _d[1];
        return [[Math.min(ax1, bx1), Math.min(ay1, by1)],
            [Math.max(ax2, bx2), Math.max(ay2, by2)]];
    };
    RectangleUtils.area = function (A) {
        var _a = A[0], ax1 = _a[0], ay1 = _a[1], _b = A[1], ax2 = _b[0], ay2 = _b[1];
        var length = ax2 - ax1 + 1;
        var width = ay2 - ay1 + 1;
        return length * width;
    };
    RectangleUtils.mergeable = function (A, B) {
        return RectangleUtils.is_adjacent(A, B)
            && (RectangleUtils.area(A) + RectangleUtils.area(B) == RectangleUtils.area(RectangleUtils.bounding_box(A, B)));
    };
    RectangleUtils.testme = function () {
        console.assert(RectangleUtils.mergeable([[1, 1], [1, 1]], [[2, 1], [2, 1]]), "nope1");
        console.assert(RectangleUtils.mergeable([[1, 1], [1, 10]], [[2, 1], [2, 10]]), "nope2");
        console.assert(RectangleUtils.mergeable([[2, 2], [4, 4]], [[5, 2], [8, 4]]), "nope3");
        console.assert(!RectangleUtils.mergeable([[2, 2], [4, 4]], [[4, 2], [8, 5]]), "nope4");
        console.assert(!RectangleUtils.mergeable([[1, 1], [1, 10]], [[2, 1], [2, 11]]), "nope5");
        console.assert(!RectangleUtils.mergeable([[1, 1], [1, 10]], [[3, 1], [3, 10]]), "nope6");
    };
    return RectangleUtils;
}());
exports.RectangleUtils = RectangleUtils;
