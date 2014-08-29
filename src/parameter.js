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

  Object.defineProperty(this,"name",{
   /**
    * the name of the parameter
    * @type {string}
    * @name name
    * @memberof Parameter
    */
    get:function(){return _name;},
    /**
    * setter blocker – blocks member variable from changing, this routine will return an error
    * @params {string}
    */
    set:function(in_val){console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); },
    enumerable: true
  });


  Object.defineProperty(this,"type",{
   /**
    * type getter
    * @returns {string} the type of the parameter
    */
    get:function(){return _type;},
   /**
    * setter blocker
    * @params {string} blocks member variable from changing, this routine will return an error
    */
    set:function(in_val){console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); },
    enumerable: true
  });


  Object.defineProperty(this,"parent",{
  /**
    * parent getter
    * @returns {string} the parent of the parameter
    */
    get:function(){return _parent;},
   /**
    * setter blocker
    * @params {string} blocks member variable from changing, this routine will return an error
    */
    set:function(in_val){console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); },
    enumerable: true
  });


  Object.defineProperty(this,"value",{
    /**
    * value getter
    * @returns {number|string|boolean} the value of the parameter
    */
    get:function(){return _value;},
    /**
    * parent setter
    * @returns {string} sets the value of this Parameter, and pushes the change to the Lagoa platform
    */
    set:function(in_val){
      _value = in_val;
      var paramList = {};
      paramList[ this.id ] = this.value;
      var parentPropHierarchy = [];
      var parent = this.parent;
      var property = paramList;
      while(parent && parent.name !== 'PropertySet'){
        var o = {};
        o[parent.name] = property;
        property = o;
        parent = parent.parent;
      }
      lapi.setObjectParameters( _contextObject.properties.getParameter("guid").value, property);
    },
    enumerable: true
  });

  Object.defineProperty(this,"id",{
   /**
    * value getter
    * @returns {string} the id of the parameter
    */
    get:function(){return _id;},
   /**
    * setter blocker
    * @params {string} blocks member variable from changing, this routine will return an error
    */
    set:function(in_val){console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE ); },
    enumerable: true
  });

  /**
   * Set the value of this parameter without updating the back-end
   * @private
   */
  this._setValueMuted = function(in_val){
    _value = in_val;
  }

};


/**
 * @memberof Parameter
 */
lapi.Parameter.prototype = {
  constructor : lapi.Parameter
};
