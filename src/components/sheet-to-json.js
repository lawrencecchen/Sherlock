'use strict';
var fs = require('fs');
var xlsx = require('xlsx');
var sha224 = require('crypto-js/sha224');
var base64 = require('crypto-js/enc-base64');
var general_re = '\\$?[A-Z][A-Z]?\\$?\\d+'; // column and row number, optionally with $
var pair_re = new RegExp('(' + general_re + '):(' + general_re + ')');
var singleton_re = new RegExp(general_re);
var selections;
(function (selections) {
    selections[selections["FORMULAS"] = 0] = "FORMULAS";
    selections[selections["VALUES"] = 1] = "VALUES";
    selections[selections["STYLES"] = 2] = "STYLES";
})(selections || (selections = {}));
;
function processWorksheet(sheet, selection) {
    var ref = "A1:A1"; // for empty sheets.
    if ("!ref" in sheet) {
        // Not empty.
        ref = sheet["!ref"];
    }
    var decodedRange = xlsx.utils.decode_range(ref);
    var startColumn = decodedRange['s']['c'];
    var startRow = decodedRange['s']['r'];
    var endColumn = decodedRange['e']['c'];
    var endRow = decodedRange['e']['r'];
    var rows = [];
    for (var r = startRow; r <= endRow; r++) {
        var row = [];
        for (var c = startColumn; c <= endColumn; c++) {
            var cell = xlsx.utils.encode_cell({ 'c': c, 'r': r });
            var cellValue = sheet[cell];
            // console.log(cell + ': ' + JSON.stringify(cellValue));
            var cellValueStr = "";
            if (cellValue) {
                switch (selection) {
                    case selections.FORMULAS:
                        if (!cellValue['f']) {
                            cellValueStr = "";
                        }
                        else {
                            cellValueStr = "=" + cellValue['f'];
                        }
                        break;
                    case selections.VALUES:
                        // Numeric values.
                        if (cellValue['t'] === 'n') {
                            cellValueStr = JSON.stringify(cellValue['v']);
                        }
                        break;
                    case selections.STYLES:
                        if (cellValue['s']) {
                            // Encode the style as a hash (and just keep the first 10 characters).
                            var styleString = JSON.stringify(cellValue['s']);
                            var str = base64.stringify(sha224(styleString));
                            cellValueStr = str.slice(0, 10);
                        }
                        break;
                }
            }
            row.push(cellValueStr);
        }
        rows.push(row);
    }
    return rows;
}
// Process command-line arguments.
var usageString = 'Usage: $0 <command> [options]';
var args = require('yargs')
    .usage(usageString)
    .command('--input', 'Input from filename (Excel file).')
    .alias('i', 'input')
    .nargs('input', 1)
    .command('--directory', 'Read from a directory of files (all either .xls or .xlsx).')
    .alias('d', 'directory')
    .help('h')
    .alias('h', 'help')
    .argv;
if (args.help) {
    process.exit(0);
}
if ((Boolean(args.input) === Boolean(args.directory))) {
    console.log("Specify exactly one of --input and --directory.");
    console.log(args.input);
    console.log(args.directory);
    process.exit(0);
}
var files = [];
if (args.input) {
    files.push(args.input);
}
var base = '';
if (args.directory) {
    // Load up all files to process.
    files = fs.readdirSync(args.directory).filter(function (x) { return x.endsWith('.xls') || x.endsWith('.xlsx'); });
    base = args.directory + '/';
}
var outputs = [];
for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
    var filename = files_1[_i];
    var f = xlsx.readFile(filename, { "cellStyles": true });
    //console.log(JSON.stringify(f, null, 4));
    var output = {};
    output["workbookName"] = filename;
    output["worksheets"] = [];
    var sheetNames = f.SheetNames;
    var sheets = f.Sheets;
    for (var _a = 0, sheetNames_1 = sheetNames; _a < sheetNames_1.length; _a++) {
        var sheet = sheetNames_1[_a];
        // Try to parse the ref to see if it's a pair (e.g., A1:B10) or a singleton (e.g., C9).
        // If the latter, make it into a pair (e.g., C9:C9).
        var ref = void 0;
        if ("!ref" in sheets[sheet]) {
            ref = sheets[sheet]["!ref"];
        }
        else {
            // Empty sheet.
            ref = "A1:A1";
        }
        var result = pair_re.exec(ref); // pair_re.exec(ref);
        if (result) {
            // It's a pair; we're fine.
        }
        else {
            // Singleton. Make it a pair.
            ref = ref + ":" + ref;
        }
        var sheetRange = sheet + "!" + ref;
        output["worksheets"].push({
            "sheetName": sheet,
            "usedRangeAddress": sheetRange,
            "formulas": processWorksheet(sheets[sheet], selections.FORMULAS),
            "values": processWorksheet(sheets[sheet], selections.VALUES),
            "styles": processWorksheet(sheets[sheet], selections.STYLES)
        });
    }
    outputs.push(output);
}
console.log(JSON.stringify(outputs, null, 4));
