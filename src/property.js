/**
 * @ignore
 * @fileOverview declares the Property api class.
 */

/** A light weight Property object to represent Lagoa Property Sets outside of the embed
 * The goal of this object is to simplify the interaction with the 3D scene by providing
 * a mirror object that takes care of refreshing the scene inside of the embed.
 * @ignore
 * @param {string} in_name name of the property
 * @constructor Property
 */
lapi.Property = function( in_name ){

  /**
   * @type {lapi.Parameter}
   * @private
   */
  this._parameters = {};

  /**
   * Name lookup for search by name
   * @type {lapi.Parameter}
   * @private
   */
  this._parametersByName = {};

  /**
   * @dict
   * @private
   */
  this._properties = {};

  /**
   * @type {string}
   * @private
   */
  this._name = in_name;

  /**
   * @type {Property}
   * @private
   */
  this._parent = null;

};


/**
 * @memberof Property
 */
lapi.Property.prototype = {

  constructor : lapi.Property,

  /**
   * Accessor to get parameters by ID in this Property
   * @function getParameter
   * @param {string} in_param_id the name of the parameter we are looking for
   * @returns {Parameter} object
   */
  getParameter : function( in_param_id ){
    return this.parameters[in_param_id];
  },

  /**
   * Add a Parameter object to this Property
   * @param {Parameter} in_parameter object to be added
   */
  addParameter   : function( in_parameter ){
    this.parameters[in_parameter.id] = in_parameter;
    this._parametersByName[in_parameter.name] = in_parameter;
  },

  /**
   * Append another property under this property
   * @param {Property} in_property
   */
  appendProperty : function( in_property ){ in_property._parent = this; this.properties[in_property.name] = in_property; },

  /**
   * Get a property by name
   * @param {String} in_property_name the name of the property we are looking for
   * @returns {Property|undefined} the property named with in_property_name,
   * if none is found this returns undefined
   */
  getProperty    : function( in_property_name ){ return this.properties[in_property_name]; },

  /**
   * The name of this Property.
   * trying to change this member will return an error.
   * @type {String}
   */
  get name(){
    return this._name;
  },

  /**
   * setter to block change to this variable
   * @private
   */
  set name(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  },

  /**
   * The parent of this Property,if it exists. 
   * Otherwise return null.
   * @type {Property}
   */
  get parent(){
    return this._parent;
  },

  /**
   * setter to assign its parent property.
   * @private
   */
  set parent(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  },

  /**
   * The dictionary of parameters belonging to this Property.
   * trying to change this member will return an error.
   * @type {Object}
   */
  get parameters(){
    return this._parameters;
  },

  /**
   * setter to block change to this variable
   * @private
   */
  set parameters(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  },

  /**
   * The dictionary of properties belonging to this Property.
   * trying to change this member will return an error.
   * @type {Object}
   */
  get properties(){
    return this._properties;
  },

  /**
   * setter to block change to this variable
   * @private
   */
  set properties(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  }
};
