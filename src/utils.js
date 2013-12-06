/**
 * @ignore
 * @fileOverview Declares the utils namespace
 */

/**
 * @namespace lapi.utils
 */
lapi.utils = {

  objToArray : function(in_Obj){

    var rtn = [];

    for(var i in in_Obj){
      rtn.push(in_Obj[i]);
    }

    return rtn;
  },

  /**
   * RGB to HEX color conversion
   * @param {Number} r red value from 0-255 range
   * @param {Number} g green value from 0-255 range
   * @param {Number} b blue value from 0-255 range
   * @example rgbToHEX(255, 125, 65); //returns "FF7D41"
   * @returns {String}
   */
  rgbToHEX : function(r, g, b) {
    var hex = [
      r.toString( 16 ),
      g.toString( 16 ),
      b.toString( 16 )
    ];
    $.each( hex, function( nr, val ) {
      if ( val.length === 1 ) {
        hex[ nr ] = "0" + val;
      }
    });
    return hex.join( "" ).toUpperCase();
  },

  /**
   * HEX to RGB color conversion
   * @param hex
   * @returns {{r: Number, g: Number, b: Number}}
   */
  hexToRGB : function(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
};
