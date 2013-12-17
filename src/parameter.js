/**
 * @ignore
 * @fileOverview declares the parameter api class.
 */

/** @param {lapi.SceneObject} in_ctxtObject the object this parameter belongs to
 * @param {lapi.Property} in_parentProperty the parent Property object
 * @param {object} in_params the input parameters takes name, value, type
 * @constructor Parameter
 */

lapi.Parameter = function( in_ctxtObject, in_parentProperty, in_params ){

  /**
   * @type {string}
   * @private
   */
  var _name  = in_params.name || "";

  /**
   *
   * @type {*|null}
   * @private
   */
  var _value = in_params.value || null;

  /**
   * @type {string|null}
   * @private
   */
  var _type = in_params.type || null;

  /**
   * @type {Property|null}
   * @private
   */
  var _parent = in_parentProperty || null;

  /**
   * @type {SceneObject|null}
   * @private
   */
  var _contextObject = in_ctxtObject || null;

  /**
   * @type {number|null}
   * @private
   */
  var _id = in_params.id || null;

  /**
   * the name of the parameter
   * @type {string}
   * @name name
   * @memberof Parameter
   */
  this.__defineGetter__("name", function(){ return _name; });

  /**
   * setter blocker – blocks member variable from changing, this routine will return an error
   * @params {string}
   */
  this.__defineSetter__("name", function(in_val){ console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); });

  /**
   * type getter
   * @returns {string} the type of the parameter
   */
  this.__defineGetter__("type", function(){ return _type; });

  /**
   * setter blocker
   * @params {string} blocks member variable from changing, this routine will return an error
   */
  this.__defineSetter__("type", function(in_val){ console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); });

  /**
   * parent getter
   * @returns {string} the parent of the parameter
   */
  this.__defineGetter__("parent", function(){ return _parent; });

  /**
   * setter blocker
   * @params {string} blocks member variable from changing, this routine will return an error
   */
  this.__defineSetter__("parent", function(in_val){ console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); });

  /**
   * value getter
   * @returns {number|string|boolean} the value of the parameter
   */
  this.__defineGetter__("value", function(){ return _value; });

  /**
   * value getter
   * @returns {string} the id of the parameter
   */
  this.__defineGetter__("id", function() {return _id;});

  /**
   * setter blocker
   * @params {string} blocks member variable from changing, this routine will return an error
   */
  this.__defineSetter__("id", function(in_val){ console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); });

  /**
   * parent setter
   * @returns {string} sets the value of this Parameter, and pushes the change to the Lagoa platform
   */
  this.__defineSetter__("value", function(in_val){
    _value = in_val;
    var paramList = {};
    paramList[ this.id ] = this.value;
    if(this.parent._remoteUpdate) return;
    var parentPropName = this.parent.name;
    lapi.setObjectParameter( _contextObject.properties.getParameter("GUID").value, parentPropName, paramList )
  })

};


/**
 * @memberof Parameter
 */
lapi.Parameter.prototype = {
  constructor : lapi.Parameter
};
