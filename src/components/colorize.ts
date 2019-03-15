export class Colorize {

    // Matchers for all kinds of Excel expressions.
    private static general_dep = '\\$?[A-Z]+\\$?\\d+'; // column and row number, optionally with $
    private static single_dep = new RegExp('('+Colorize.general_dep+')');
    private static range_pair = new RegExp('('+Colorize.general_dep+'):('+Colorize.general_dep+')', 'g');
    private static cell_both_relative = new RegExp('^[^\\$]?([A-Z]+)(\\d+)');
    private static cell_col_absolute = new RegExp('^\\$([A-Z]+)[^\\$]?(\\d+)');
    private static cell_row_absolute = new RegExp('^[^\\$]?([A-Z]+)\\$(\\d+)');
    private static cell_both_absolute = new RegExp('^\\$([A-Z]+)\\$(\\d+)');

    private static color_list = ["pink", "blue", "yellow", "green", "skyblue" ]

    private static hash(str: string) : number {
	// From https://github.com/darkskyapp/string-hash
	var hash = 5381,
	i = str.length;
	
	while(i) {
	    hash = (hash * 33) ^ str.charCodeAt(--i);
	}

	/* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
	 * integers. Since we want the results to be always positive, convert the
	 * signed int to an unsigned by doing an unsigned bitshift. */
	return hash >>> 0;
    }
    
    private static rgbFromHSV(h,s,v) : Array<number> {
	// From https://gist.github.com/mjackson/5311256#gistcomment-2789005
	/**
	 * I: An array of three elements hue (h) ∈ [0, 360], and saturation (s) and value (v) which are ∈ [0, 1]
	 * O: An array of red (r), green (g), blue (b), all ∈ [0, 255]
	 * Derived from https://en.wikipedia.org/wiki/HSL_and_HSV
	 * This stackexchange was the clearest derivation I found to reimplement https://cs.stackexchange.com/questions/64549/convert-hsv-to-rgb-colors
	 */

	let hprime = h / 60;
	const c = v * s;
	const x = c * (1 - Math.abs(hprime % 2 - 1)); 
	const m = v - c;
	let r, g, b;
	if (!hprime) {r = 0; g = 0; b = 0; }
	if (hprime >= 0 && hprime < 1) { r = c; g = x; b = 0}
	if (hprime >= 1 && hprime < 2) { r = x; g = c; b = 0}
	if (hprime >= 2 && hprime < 3) { r = 0; g = c; b = x}
	if (hprime >= 3 && hprime < 4) { r = 0; g = x; b = c}
	if (hprime >= 4 && hprime < 5) { r = x; g = 0; b = c}
	if (hprime >= 5 && hprime < 6) { r = c; g = 0; b = x}
	
	r = Math.round( (r + m)* 255);
	g = Math.round( (g + m)* 255);
	b = Math.round( (b + m)* 255);

	return [r, g, b]
    }
    
    
    // Convert an Excel column name (a string of alphabetical charcaters) into a number.
    public static column_name_to_index(name: string) : number {
	if (name.length === 1) { // optimizing for the overwhelmingly common case
	    return name[0].charCodeAt(0) - 'A'.charCodeAt(0) + 1;
	}
	let value = 0;
	let reversed_name = name.split("").reverse();
	for (let i of reversed_name) {
	    value *= 26;
	    value = (i.charCodeAt(0) - 'A'.charCodeAt(0)) + 1;
	}
	return value;
    }


    // Returns a vector (x, y) corresponding to the column and row of the computed dependency.
    public static cell_dependency(cell: string, origin_col: number, origin_row: number) : Array<number> {
	let r = Colorize.cell_both_relative.exec(cell);
	if (r) {
	    console.log("both_relative");
	    let col = Colorize.column_name_to_index(r[1]);
	    let row = parseInt(r[2]);
	    return [col - origin_col, row - origin_row];
	}

	r = Colorize.cell_col_absolute.exec(cell);
	if (r) {
	    console.log("col_absolute");
	    let col = Colorize.column_name_to_index(r[1]);
	    let row = parseInt(r[2]);
	    return [col, row - origin_row];
	}

	r = Colorize.cell_row_absolute.exec(cell);
	if (r) {
	    console.log("row_absolute");
	    let col = Colorize.column_name_to_index(r[1]);
	    let row = parseInt(r[2]);
	    return [col - origin_col, row];
	}
	
	r = Colorize.cell_both_absolute.exec(cell);
	if (r) {
	    console.log("both_absolute");
	    let col = Colorize.column_name_to_index(r[1]);
	    let row = parseInt(r[2]);
	    return [col, row];
	}

	throw new Error('We should never get here.');
	return [0, 0];
    }


    public static dependencies(range: string, origin_col: number, origin_row: number) : Array<number> {

	let base_vector = [0, 0];
	
	let found_pair = null;
	
	// First, get all the range pairs out.
	while (found_pair = Colorize.range_pair.exec(range)) {
	    if (found_pair) {
		//	    console.log(found_pair);
		let first_cell = found_pair[1];
		console.log(first_cell);
		let first_vec = Colorize.cell_dependency(first_cell, origin_col, origin_row);
		let last_cell = found_pair[2];
		console.log(last_cell);
		let last_vec = Colorize.cell_dependency(last_cell, origin_col, origin_row);

		// First_vec is the upper-left hand side of a rectangle.
		// Last_vec is the lower-right hand side of a rectangle.
		// Compute the appropriate vectors to be added.

		// e.g., [3, 2] --> [5, 5] ==
		//          [3, 2], [3, 3], [3, 4], [3, 5]
		//          [4, 2], [4, 3], [4, 4], [4, 5]
		//          [5, 2], [5, 3], [5, 4], [5, 5]
		// 
		// vector to be added is [4 * (3 + 4 + 5), 3 * (2 + 3 + 4 + 5) ]
		//  = [48, 42]

		let sum_x = 0;
		let sum_y = 0;
		let width = last_vec[1] - first_vec[1] + 1;   // 4
		sum_x = width * ((last_vec[0]*(last_vec[0]+1))/2 - ((first_vec[0]-1)*((first_vec[0]-1)+1))/2);
		let length = last_vec[0] - first_vec[0] + 1;   // 3
		sum_y = length * ((last_vec[1]*(last_vec[1]+1))/2 - ((first_vec[1]-1)*((first_vec[1]-1)+1))/2);

		base_vector[0] += sum_x;
		base_vector[1] += sum_y;
		
		// Wipe out the matched contents of range.
		let newRange = range.replace(found_pair[0], '_'.repeat(found_pair[0].length));
		range = newRange;
	    }
	}

	// Now look for singletons.
	let singleton = null;
	while (singleton = Colorize.single_dep.exec(range)) {
	    if (singleton) {
		//	    console.log(found_pair);
		let first_cell = singleton[1];
		console.log(first_cell);
		let vec = Colorize.cell_dependency(first_cell, origin_col, origin_row);
		base_vector[0] += vec[0];
		base_vector[1] += vec[1];
		// Wipe out the matched contents of range.
		let newRange = range.replace(singleton[0], '_'.repeat(singleton[0].length));
		range = newRange;
	    }
	}

	return base_vector;

    }

    public static hash_vector(vec: Array<number>) : number {
	return Colorize.hash(JSON.stringify(vec));
    }
    

}

console.log(Colorize.dependencies('$C$2:$E$5', 10, 10));
console.log(Colorize.dependencies('$A$123,A1:B$12,$A12:$B$14', 10, 10));
console.log(Colorize.hash_vector(Colorize.dependencies('$C$2:$E$5', 10, 10)));
console.log(Colorize.hash_vector(Colorize.dependencies('$C$2:$E$6', 10, 10)));