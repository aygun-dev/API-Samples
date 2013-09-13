/**
 * API namespace
 * this object is simply an adapter layer for the Lagoa platform. It wraps application level
 * interfaces (changing parameters of objects in an embed scene).
 * TODO Add platform level functionality such as assets loading, projects and user queries, etc...
 */

var lapi = {};

(function(){

  /**
   * Enum for standard console msgs.
   * @enum {string}
   */
  lapi.CONSOLE_MSGS = {
    IMMUTABLE : "cannot change this"
  };

  /**
   *
   * @param in_ctxtObject the object this parameter belongs to
   * @param in_parentProperty the parent Property object
   * @param in_params the input parameters takes {name, value, type}
   * @constructor
   */
  var Parameter = function( in_ctxtObject, in_parentProperty, in_params ){


    /**
     * @type {string}
     * @private
     */
    var _name  = in_params.name || "";
    var _value = in_params.value || null;
    var _type = in_params.type || null;
    var _parent = in_parentProperty || null;
    var _contextObject = in_ctxtObject || null;
    var _id = in_params.id || null;

    /**
     * name getter
     * @returns {string} the name of the parameter
     */
    this.__defineGetter__("name", function(){ return _name; });

    /**
     * setter blocker
     * @params {string} blocks member variable from changing, this routine will return an error
     */
    this.__defineSetter__("name", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });


    /**
     * type getter
     * @returns {string} the type of the parameter
     */
    this.__defineGetter__("type", function(){ return _type; });

    /**
     * setter blocker
     * @params {string} blocks member variable from changing, this routine will return an error
     */
    this.__defineSetter__("type", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });

    /**
     * parent getter
     * @returns {string} the parent of the parameter
     */
    this.__defineGetter__("parent", function(){ return _parent; });

    /**
     * setter blocker
     * @params {string} blocks member variable from changing, this routine will return an error
     */
    this.__defineSetter__("parent", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });

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
    this.__defineSetter__("id", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });

    /**
     * parent setter
     * @returns {string} sets the value of this Parameter, and pushes the change to the Lagoa platform
     */
    this.__defineSetter__("value", function(in_val){
      _value = in_val;
      var paramList = {};
      paramList[ this.id ] = this.value;
      var parentPropName = this.parent.name;
      lapi.setObjectParameter( _contextObject.properties.getParameter("GUID").value, parentPropName, paramList )
    })

  };

  Parameter.prototype = {
    constructor : Parameter
  };

  /**
   * A object to handle and represent a Lagoa Property outside of the platform
   * @param in_name name of the property
   * @constructor constructor of the property
   */

  var Property = function( in_name ){

    var _parameters = {};
    var _properties = {};
    var _name = in_name;

    this.__defineGetter__("name", function(){ return _name; });
    this.__defineSetter__("name", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });
    this.__defineGetter__("parameters", function(){ return _parameters; });
    this.__defineSetter__("parameters", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });
    this.__defineGetter__("properties", function(){ return _properties; });
    this.__defineSetter__("properties", function(in_val){ console.error( CONSOLE_MSGS.IMMUTABLE ); });

  };

  /**
   * @type {{constructor: Function, getParameter: Function, addParameter: Function, appendProperty: Function, getProperty: Function}}
   */
  Property.prototype = {
    constructor    : Property,

    /**
     * Accessor to get parameters by name in the Property
     * @param {string} in_param_name the name of the parameter we are looking for
     * @returns {Parameter} object
     */
    getParameter   : function( in_param_name ){ return this.parameters[in_param_name]; },

    /**
     * Add a Parameter object to this Property
     * @param {Parameter} in_parameter object to be added
     */
    addParameter   : function( in_parameter ){ this.parameters[in_parameter.name] = in_parameter; },

    /**
     * Append a property under this property
     * @param in_property
     */
    appendProperty : function( in_property ){ this.properties[in_property.name] = in_property; },

    /**
     * get a property by name
     * @param {string} in_property_name the name of the property we are looking for
     * @returns {Property} object found with name
     */
    getProperty    : function( in_property_name ){ return this.properties[in_property_name]; }

  };


  /**
   * A object to handle and represent a Lagoa SceneObject outside of the platform
   * @param in_guid guid representing an object in the scene
   */
  var SceneObject = function( in_guid ){
    var _guid = in_guid;
    var _properties = {};

    var self = this;

    this.__defineGetter__("properties", function(){
      return _properties;
    });

    this.__defineSetter__("properties", function(in_val){
      console.error( CONSOLE_MSGS.IMMUTABLE );
    });

    this.__defineGetter__("guid", function(){
      return _guid;
    });

    this.__defineSetter__("guid", function(in_val){
      console.error( CONSOLE_MSGS.IMMUTABLE );
    });

    // We cache the entire PropertySet object (flattened) for local access
    // The deep copy routine builds the embed object using the local property and parameter objects
    lapi._embedRPC("ACTIVEAPP.GetScene().GetByGUID('"+in_guid+"').PropertySet.flatten()",
      function(in_embedRPC_message){
        var pSet = in_embedRPC_message.data;
        _properties = pSetDeepCopy( self, pSet );
      }
    );


  };

  SceneObject.prototype = {

    constructor : SceneObject,

    getMaterial : function(){
      var matGuid = this.properties.getProperty("Materials").getParameter("Material").value;
      return lapi.getObjectByGuid( matGuid );
    }

  };

  /**
   * @in_ctxtObject the object this pset belongs to
   * @in_pset the propertySet object returned from an lapi._embedRPC call
   */
  var pSetDeepCopy = function( in_ctxtObject, in_pset ){

    var rtn = new Property("PropertySet");

    var diveIn = function( in_prop, in_rtn ){
      for( var i in in_prop ){
        if(in_prop[i].name){                                                // it is a parameter
          in_rtn.addParameter( new Parameter( in_ctxtObject, in_rtn, in_prop[i] ));
        }else{
          var newProp = new Property(i);
          in_rtn.appendProperty( newProp );                              // it is a property
          diveIn(in_prop[i], newProp );
        }
      }
    };

    diveIn(in_pset, rtn);

    return rtn;
  };

  lapi._cbStack = 0;
  lapi._cbmap = {};

  lapi.objGUID = "";
  lapi.materialName = "";
  lapi.lagoaUrl="http://lagoa.com";
  lapi.meshCount = 0;
  lapi.user_id = 24;
  lapi.project_id;
  lapi.asset_guid;
  lapi.objData = {};
  lapi.sceneTimer;

  window.addEventListener("message", function(e){
    var retval = JSON.parse(e.data);
    if(retval.channel == 'rpcend') {

//      console.warn("returning RPC call", lapi._cbStack);
      --lapi._cbStack;

      if(lapi._cbmap[retval.id]){
        var callback = lapi._cbmap[retval.id];
        callback(retval);
        delete lapi._cbmap[retval.id];
      }
    }
  });

  lapi._transient = "";
  lapi._sceneObjects = {};
  lapi._camera = "";
  lapi._isRendering = false;

  // mess with time
  lapi._isPlaying = false;
  lapi._frame = 0;


  /**
   * Initialize routine to cache embed scene data in local variables.
   */
  lapi.initialize = function(){

    var self = this;

    // TODO we are very selective about our local scene representation...
    // we should generalize this and
    var interestingGuids = [];

    var addGuidsToList = function ( in_response ) {
      var items = in_response.data;
      for(var i in items){
        interestingGuids.push(items[i]);
      }
    };

    // grab the things we are interested in
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['MeshID'])", addGuidsToList);  //can choose MeshID, LightID, CameraID
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['MaterialID'])", addGuidsToList );
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['LightID'])", addGuidsToList );
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['TextureID'])", addGuidsToList );
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['TextureProjectionID'])", addGuidsToList );
    lapi._embedRPC( "Object.keys(ACTIVEAPP.GetClassedItems()['GroupID'])", addGuidsToList );
    lapi._embedRPC( "ACTIVEAPP.GetCamera().guid", function(e){ self._camera = e.data; } );

    // TODO WARNING big hack ahead...
    // because of the nature of the async API, this initialization routine here is the "only chance"
    // we have to create an accurate copy of the scene – before any changes are made.
    setTimeout( function(){
      for(var i =0; i<interestingGuids.length; i++){
        self._initializeObject( interestingGuids[i] );
      }
    },2000);

    // TODO this setTimeout would be avoidded if we had a RPC queue.
    // run the onSceneLoaded callback
    setTimeout( function(){
      lapi.onSceneLoaded() }, 4000 );
  };

  lapi._initializeObject = function( in_object_guid ){
    var self = this;
    self._sceneObjects[ in_object_guid ] = new SceneObject( in_object_guid );
  };

  lapi.getAppliedMaterial = function( in_guid ){
    var self = this;
    var cb = function( in_msg ){
      self._transient = in_msg.data;
    };
    lapi._embedRPC("ACTIVEAPP.GetScene().GetByGUID('" + in_guid +"').PropertySet.flatten().Materials.tmaterial.value", cb);
  };

  lapi.getObjectByGuid = function(in_guid){
    return this._sceneObjects[in_guid];
  };

  lapi.getObjectByName = function( in_name ){
    var find = [];
    var sceneObjs = this._sceneObjects;
    var o;

    for( var i in sceneObjs){
      o = sceneObjs[i];
      if( in_name === o.properties.getParameter("Name").value ){
        find.push(o);
      }
    }

    return find;
  };

  lapi.getObjectByName = function( in_name ){
    var find = [];
    var sceneObjs = this._sceneObjects;
    var o;

    for( var i in sceneObjs){
      o = sceneObjs[i];
      if( in_name === o.properties.getParameter("Name").value ){
        find.push(o);
      }
    }

    return find;
  };

  /**
  * Assign value to object property .
  * @in_GUID {string} The GUID of the object we want to modify.
  * @in_property {string} The property of the object we want to modify.
  * @in_values {object} The values we are assigning.
  */
  lapi.setObjectParameter = function( in_GUID, in_property, in_values ){
    lapi._embedRPC("ACTIVEAPP.setObjectParameter('" +in_GUID + "'"
      +",{property : '" + in_property + "', value : "
      + JSON.stringify(in_values) + "});",function(in_response){
    });
  };

  lapi.desselectAll = function(){
    lapi._embedRPC( "ACTIVEAPP.runCommand('DesselectAll'))");
  };

  lapi.applyMaterialToObject = function( in_mat_guid, in_obj_guid ){
    lapi._embedRPC( "ACTIVEAPP.ApplyMaterial( {ctxt:'" + in_obj_guid + "', material:'" + in_mat_guid + "'})" );
  };

  lapi.applyMaterialToMeshByName = function( matName, meshName ){

    // this is how we get the matGuid value when embedRPC returns
    var applyMaterial = function( in_embedRPC_message ){

      console.log('embedRPC return', in_embedRPC_message);

      // get the guid from the returned message
      var matGuid = in_embedRPC_message.data.value;

      // call the apply material that takes a guid and a guid.
      lapi.applyMaterialToObject( matGuid, lapi.getObjectByName( meshName ).guid );
    }

    // go through the API embed call
    lapi._embedRPC( "ACTIVEAPP.GetScene().GetObjectByName('"+matName+"').PropertySet.getParameter('guid');" ,applyMaterial);

  };

  lapi.getProperties = function( in_object_guid ){
    function cb( in_embedRPC_message ){
      in_rtn = in_embedRPC_message.data;
    }

    lapi._embedRPC( "ACTIVEAPP.GetScene().GetByGUID('"+in_object_guid+"').PropertySet.flatten()" , cb);
  };

 /**
 * isRendering
 * @returns {bool} rendering status
 */
  lapi.isRendering = function(){
    return this._isRendering;
  };

  /**
  * startRender in the embed
  */
  lapi.startRender = function(){
    this._isRendering = true;
    lapi._embedRPC("ACTIVEAPP.StartRender()");
  };

  /**
   * stopRender in the embed
   */
  lapi.stopRender = function(){
    this._isRendering = false;
    lapi._embedRPC("ACTIVEAPP.StopRender()");
  },

  /**
   * get active camera from the embed
   * return {SceneObject} of camera
   */
  lapi.getCamera = function(){ return this._camera; },
  lapi.isPlaying = function(){ return this._isPlaying; },
  lapi.stop = function(){ this._isPlaying = false; },
  lapi.play = function(){

    // abort early
    if (this.isPlaying()) return;

    // start some variables
    var start = null;
    var self = this;
    var intervalId = null;
    self._isPlaying = true;

    // creat tthe play routine
    function doStep(){
      ++self._frame;
      if (self.isPlaying()) {
        self.stepCb( self._frame );
      }
      else{
        clearInterval(intervalId);
      }
    }

    // start play
    var intervalId = setInterval(doStep, 48);
  };

  lapi.onSceneLoaded = function(){};
  lapi.stepCb = function(){};

  lapi.utils = {
    hexFromRGB : function(r, g, b) {
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
    hexToRGB : function(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }
  };

  /**
   * RPC call for SC to execute.
   * @message {string} instructions we want to execute
   * @callback {function} Optional callback. It will use whatever the RPC call returns. Note, that RPC
   * return value is a stringified object we parse. It's not returning a proxy or the actual object.
   * Interactions with the scene will happen only through embedRPC calls.
   */
  lapi._embedRPC = function(message, callback){
    var randName = 'xxxxxxxxxx'.replace(/x/g,function(){return Math.floor(Math.random()*16).toString(16)});
    var iframe = document.getElementById('lagoaframe');
    if(callback){
      lapi._cbmap[randName] = callback;
      lapi._cbStack++;    // the messages are emitted here, we want to keep a count
    }
    iframe.contentWindow.postMessage(JSON.stringify({channel : 'embedrpc', id: randName, command : message}), '*');
    console.warn("API: "+ message);
  };

  // Make sure that the whole scene is loaded! Only then can you  set the first object selection.
  // This happens because we want the user to have a reference object to guide them.
  $(function() {
    function checkLoaded(){
//      console.warn("waiting for scene to load...");
      lapi._embedRPC("ACTIVEAPP.getSceneLoaded();", function(in_response) {
        if (in_response.data === true){
          clearInterval(timer);
          lapi.initialize();
        }
      });
    }
    var timer = setInterval(checkLoaded,3000);
  });

})();