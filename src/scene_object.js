/**
 * @ignore
 * @fileOverview Implements the SceneObject api class.
 */

/** A object to handle and represent a Lagoa SceneObject outside of the platform
 * This object will be initialized – based on the input guid – producing a
 * mirror object locally outside of the embed.
 * @param {string} in_guid guid of an object in the scene
 * @class SceneObject
 */
lapi.SceneObject = function( in_guid ){
  var _guid = in_guid;
  var _properties = {};
  var _self = this;

  /**
   * Get the property of the SceneObject
   * @type {Property}
   */
  this.__defineGetter__("properties", function(){
    return _properties;
  });

  /**
   * @method setter block access to changing the reference
   * to the properties object represented by this SceneObject
   */
  this.__defineSetter__("properties", function(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  });

  /**
   * @member {string} guid of this object
   */
  this.__defineGetter__("guid", function(){
    return _guid;
  });

  /**
   * @member {string} setter that blocks changing the guid of this object
   */
  this.__defineSetter__("guid", function(in_val){
    console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );
  });

  // We cache the entire PropertySet object (flattened) for local access
  // The deep copy routine builds the embed object using the local property and parameter objects
  console.warn("Building PSet of " + in_guid );
  lapi._embedRPC("ACTIVEAPP.GetScene().GetByGUID('"+in_guid+"').PropertySet.flatten()",
    function(in_embedRPC_message){
      if( !(in_embedRPC_message.error === "EXECERR") ){
        var pSet = in_embedRPC_message.data;
        _properties = _self._pSetDeepCopy( _self, pSet );
      }
    }
  );

};

/**
 * @memberof SceneObject
 */
lapi.SceneObject.prototype = {

  constructor : lapi.SceneObject,

  /**
   * Get the material applied to this SceneObject if any.
   * @returns {SceneObject}
   */
  getMaterial : function(){
    var matGuid = this.properties.getProperty("Materials").getParameter("Material").value;
    return lapi.getActiveScene().getObjectByGuid( matGuid );
  },

  /**
   * a shortcut to get a property under properties
   * @param in_propName
   * @returns {*|Property|undefined}
   */
  getProperty : function( in_propName ){
    return this.properties.getProperty( in_propName );
  },

  /**
   * copy a PropertySet that is returned via an embedRPC call. The returned object is
   * parsed into a local object made out of SceneObject, Property and Parameter classes.
   * @in_ctxtObject {SceneObject} the object this pset belongs to
   * @in_pset {object} the propertySet object returned from an lapi._embedRPC call
   * @private
   */
  _pSetDeepCopy : function( in_ctxtObject, in_pset ){

    var rtn = new lapi.Property("PropertySet");

    var diveIn = function( in_prop, in_rtn ){
      for( var i in in_prop ){
        if( in_prop[i] instanceof Object ){                                                // it is a parameter
          in_rtn.addParameter( new lapi.Parameter( in_ctxtObject, in_rtn, in_prop[i] ));
        }else{
          var newProp = new lapi.Property(i);
          in_rtn.appendProperty( newProp );                              // it is a property
          diveIn(in_prop[i], newProp );
        }
      }
    };

    diveIn(in_pset, rtn);

    return rtn;
  }

};
