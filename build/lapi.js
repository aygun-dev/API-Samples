/**
 * @fileOverview Declares the API namespace
 * the lapi object is simply an adapter layer for the Lagoa platform. It simply wraps application level
 * interfaces (changing parameters of objects in an embed scene).
 * @todo Add platform level functionality such as assets loading, projects and user queries, etc...
 */

/**
 * @namespace lapi
 */
var lapi = {};
/**
 * @ignore
 * @fileOverview implements lapi interfaces to lagoa
 * the lapi object is simply an adapter layer for the Lagoa platform. It is a wrapper of application level
 * API's (for example changing parameters of objects in an embed scene).
 * @todo Add platform level functionality such as assets loading, projects and user queries, etc...
 */

(function(){

  /**
   * Constants
   * @namespace
   */
  lapi.CONSTANTS = {};
  /**
   * Enum for standard console msgs.
   * @enum {string}
   */
  lapi.CONSTANTS.CONSOLE_MSGS = {
    IMMUTABLE : "cannot change this"
  };

  lapi.CONSTANTS.SCENE = {
    LIGHT : "LightID",
    CAMERA : "CameraID",
    MESH : "MeshID",
    MATERIAL : "MaterialID",
    TEXTURE : "TextureID",
    GROUP : "GroupID",
    PROJECTION : "TextureProjectionID",
    STATES : "SceneStateID"
  };

  /**
   * @type {Number}
   * @private
   */
  lapi._precision = 3;

  /**
   * @type {Number}
   * @private
   */
  lapi._cbStack = 0;

  /**
   * @type {Object}
   * @private
   */
  lapi._cbmap = {};

  /**
   * @type {Object}
   * @private
   */
  lapi._eventCbMap = {};

  /**
   * @type {String}
   * @private
   */
  lapi._lagoaUrl="https://lagoa.com";

  /**
   * @type {number}
   * @private
   */
  lapi._user_id = 24;

  /**
   * @type {number}
   * @private
   */
  lapi._project_id;

  /**
   * @type {string}
   * @private
   */
  lapi._assetGuid;

  /**
   * @type {object}
   * @private
   */
  lapi._objData = {};

  /**
   * @type {{}}
   * @private
   */
  lapi._sceneTimer;


  /**
   * method for on Object Added event
   * @virtual
   * @callback called when object has been added to the scene. Expects the SceneObject that has jus been added;
   */

   lapi.onObjectAdded = function(){};


  /**
   * method for fetching the guid of the object we just clicked on
   * @virtual
   * @callback called when we are in checkGuidTool context and we click on an object
   * Expects an object with a tuid and guid  ex {tuid : 'MeshID', guid : '9cbcd524-5991-4861-b98a-764dfa72400d'} 
   */

   lapi.checkGuidToolCB = function(){};

  /**
   * method for first render frame event
   * @virtual
   */

   lapi.onFirstFrame = function(){};

  /**
   * Implements the MPI interface to receive messages back from the lagoa embed
   * @private
   */
  window.addEventListener("message", function(e){
    var retval = JSON.parse(e.data);
    if(retval.channel == 'rpcend') {

//      console.warn("returning RPC call", lapi._cbStack);
//      --lapi._cbStack;
      if (retval.subchannel) {
        var subchannel = retval.subchannel;
        if(subchannel === 'objectAdded'){
          var scn = lapi.getActiveScene();
          var tuid = retval.data.tuid;
          var pset = retval.data.pset;
          scn.addObject(tuid,retval.data.guid,pset,function(obj){
            var guid = obj.properties.getParameter('guid').value;
            if(lapi._cbmap[guid]){
              var callback = lapi._cbmap[guid];
              callback(obj);
              delete lapi._cbmap[guid];
            }
            lapi.onObjectAdded(obj);
          });
        } else if(subchannel === 'firstFrame'){
          lapi.onFirstFrame();
        } else if(subchannel === 'checkGuid'){
          lapi.checkGuidToolCB(retval.data);
        }
      } else {
        if(lapi._cbmap[retval.id]){
          var callback = lapi._cbmap[retval.id];
          callback(retval);
          delete lapi._cbmap[retval.id];
        }
        else if(lapi._eventCbMap[retval.id]){
          var cbArray = lapi._eventCbMap[retval.id];
          for(var i = 0 ; i < cbArray.length; ++i){
            cbArray[i](retval.data);
          }
        }
      }
    }
  });

  /**
   * @type {string}
   * @private
   */
  lapi._activeCamera = null;

  /**
   * @type {boolean}
   * @private
   */
  lapi._isRendering = false;

  /**
   * Mess with time
   * @type {boolean}
   * @private
   */
  lapi._isPlaying = false;

  /**
   * internal object to store the Time interval callback
   * @type {null}
   * @private
   */
  lapi._timeIntervalId = null;

  /**
   * @type {number}
   * @private
   */
  lapi._frame = 0;

  lapi._generateRandomString = function (){
    return 'xxxxxxxxxx'.replace(/x/g,function(){return Math.floor(Math.random()*16).toString(16)});
  };

  lapi._generateGUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  /**
   * Pass messgage to SC
   * @in_message {object} message we will stringify and send to SC
   */
  lapi._messageIframe = function(in_message){
    var iframe = document.getElementById('lagoaframe');
    iframe.contentWindow.postMessage(JSON.stringify(in_message), '*');
  };

  /**
   * RPC call for SC to execute.
   * @message {string} instructions we want to execute
   * @callback {function} Optional callback. It will use whatever the RPC call returns. Note, that RPC
   * return value is a stringified object we parse. It's not returning a proxy or the actual object.
   * Interactions with the scene will happen only through embedRPC calls.
   */
  lapi._embedRPC = function(message, callback, params){
    var randName = lapi._generateRandomString();
    params = params || undefined;
    if(callback){
      lapi._cbmap[randName] = callback;
    }
    lapi._messageIframe({channel : 'embedrpc', id: randName, command : message, params : params});
  };

  /**
   * Active scene loaded in the embed
   * @type {lapi.Scene}
   * @private
   */
  lapi._activeScene = null;

  /**
   * accessor to return the current loaded scene
   * @returns {lapi.Scene}
   */
  lapi.getActiveScene = function(){
    return lapi._activeScene;
  };

  /**
   * Initialize routine to cache embed scene data in local variables.
   */
  lapi._initialize = function(){

    var self = this;

    // grab the things we are interested in.
    // we assume there are CameraID, MeshID, MaterialID, GroupID, TextureID, etc, kind of objects....
    lapi._embedRPC( "var classedItems = ACTIVEAPP.GetClassedItems();" +
      "var sceneKeys = {};" +
      "for( var i in classedItems ){ " +
      " sceneKeys[i] = Object.keys( classedItems[i] );" +
      "};" +
      "sceneKeys;",
      function(e){

        // the classed item includes the scene itself... we handle this specially because
        // it can cause problems.
        var sceneGuid = e.data["SceneID"][0];
        var classedItems = e.data;

        // delete the scene guid because this can cause trouble...
        delete classedItems["SceneID"];
        self._activeScene = new lapi.Scene( sceneGuid, classedItems, function(){
          var cams = self._activeScene.getCameras();
          self._activeCamera = cams[0];

          // give it sometime to call the event...
          setTimeout( lapi.onSceneLoaded, 500 );
        });
    });
  };

  /*
   * Load assets dynamically into the scene.
   * @in_assetArray {Array} a collection of assets we want to load.
   * Each member is an object of the type {name : {string}, datatype : {number} , version_guid : {string}}.
   * ex : lapi._loadAssets([{name : 'UntitledScene',datatype : 14, version_guid : '5fee03c9-8985-42fa-a4aa-a5689c6ab7e9'}]);
   * @private
   */
  lapi._loadAssets = function(in_assetArray, in_cb){
    in_cb = in_cb || null;
    lapi._embedRPC('loadAssets', in_cb,in_assetArray);
  };

  var BACKEND_DELAY_SHORT = 3000;
  var BACKEND_DELAY_LONG = 6000;


  /*
   * Fire a job that relies on the the backend. In other words, we  query our system
   * for the result of this call.
   * @in_command {String}  The type of command we want to run.
   * @in_params {Object} Optional and can be anything(object,array, string etc.)
   * @in_delay {Number} Optional delay that will determine the frequency of querrying the backend.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   * @in_readyCb {Function} Optional callback that checks if our data uis ready.
   * This is necessary because an entry may already exist before its members are set.
   * The callback must return true on success and false otherwise!
   * @private
   */
  lapi._backEndJob = function(in_command, in_params, in_delay, in_readyCb, in_cb){
    in_cb = in_cb || null;
    in_readyCb = in_readyCb || null;
    in_params = in_params || undefined;
    in_delay = in_delay || BACKEND_DELAY_LONG;
    var pollDelay  = null;
    if(in_delay > BACKEND_DELAY_LONG){
      pollDelay  = BACKEND_DELAY_LONG;
    } else {
      pollDelay = in_delay;
    }
    lapi._embedRPC(in_command, function(in_response){
      if(in_response.error){
        console.error(in_command + ': ' + in_response.error);
        return;
      }
      var guid = null;
      var path = '';
      var args = '';
      if(in_response.data.newScene){
        path = '/assets/';
        args = '?versions=true';
        guid = in_response.data.asset_guid;
      } else {
        path = '/versions/';
        guid = in_response.data.version_guid;
      }
      if(in_cb){
        var initTimer = null;
        var timer = null;
        var cb = function(){
          var _cb = function(reply){
            if(!reply.errors){
              if(in_readyCb && !in_readyCb(reply)){
                return;
              } else {
                clearInterval(timer);
                timer = null;
                in_cb(reply);
              }
            }
          };
          $.get(lapi._lagoaUrl + path +guid+'.json' + args,_cb, 'jsonp');
        };
        var fireCb  = function(){
          clearTimeout(initTimer);
          initTimer = null;
          timer = setInterval(cb,pollDelay);
        };
        initTimer = setTimeout(fireCb, in_delay);
      }
    },in_params);
  };

  /*
   * Save the current rendering. Note : must be rendering.
   *  in_params.name {String} Optional name of the object.
   *  in_params.tags {Array} Optional array of strings representing the tags.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.saveRender = function(in_params, in_cb){
    var _ready = function(data){
      if(data.downloadable_formats.length){
        return true;
      }
      return false;
    };
    lapi._backEndJob('saveRender',in_params,BACKEND_DELAY_SHORT,_ready,in_cb);
  };

  /*
   * Save the scene. This saves the current scene in our backend system.
   * Note that the asset guid of this saved scene is the same as the original but it differs in version_guids.
   * @in_params {Object}  Optional param object that specify this scene's tags or if we are creating a new scene. Helps for searching.
   *  in_params.tags  {Array} Optional array of strings representing the tags.
   *  in_params.newScene {Boolean} Optional flag to indicate we are creating a new scene.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.saveScene = function(in_params, in_cb){
    lapi._backEndJob('saveScene',in_params,BACKEND_DELAY_SHORT,null,in_cb);
  };

  /*
   * Start a BG Render. 
   * @in_params {Object}  Optional argument objects.
   *  in_params.name {String} Optional name of the object.
   *  in_params.duration {Number} Optional number of minutes that we will render for.
   *  in_params.width {Number} Optional width value in pixels.
   *  in_params.height {Number} Optional height value in pixels.
   *  in_params.tags {Array} Optional array of strings representing the tags.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.startBackgroundRender = function(in_params, in_cb){
    var delay = 1;
    if(in_params){
      delay = delay || in_params.duration;
    }
    delay *= 60000
    var _ready = function(data){
      if(data.downloadable_formats.length){
        return true;
      }
      return false;
    };
    lapi._backEndJob('startBackgroundRender',in_params,delay,_ready,in_cb);
  };

  /*
   * Fetch a compressed version of the scene. One that you can upload directly to Lagoa. 
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.fetchScene = function(in_cb){
    lapi._embedRPC('compressScene', function(in_response){
      if(in_cb){
        in_cb(in_response.data);
      }
    })
  };


  /*
   * Fetch assets that match specified parameters. All the arguments are optional.
   * @in_params.tags {Array} Array of strings representing the tags.
   * @in_params.match {Boolean} If true, will return assets who matches all the tags. Otherwise, return 
   * object if any tag matches.
   * @in_params.projects {Array} Array of numbers representing ids of the projects we want to fetch from.
   * @in_params.datatypes {Array} Array of numbers representing the type of assets we'd like to fetch.
   * @in_params.max {Number} max number of elements we want.
   * @in_params.query {String} The query parameter takes into account the asset's name,  owner's name,description and its tags. If there is a match it will show.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.fetchAssets = function(in_params,in_cb){
    in_params = in_params || {};
    $.ajax({url: lapi._lagoaUrl + '/users/current_user.json', type: 'GET', success: function(data) {
      var user = '';
      if(data.id){
        user = 'current_user_id=' + data.id;
      }
      var tags = '';
      var projects = '';
      var query = '';
      var datatypes = '';
      var created = '';
      var updated = '';
      if(in_params.tags){
        var union = '';
        if(in_params.match){
          union = '&union_tag=true&';
        }
        tags = union + 'tags='+ in_params.tags.join();
      }

      if(in_params.projects){
        projects = '&project_ids=' + in_params.projects.join();
      }

      if(in_params.datatypes){
        datatypes = '&datatype_ids=' + in_params.datatypes.join();
      }

      if(in_params.query){
        query = '&query=' + in_params.query;
      }

      var _createDateRangeString = function(prefix,range){
        var res = '';
        for(var r in range){
          res += ('&' + prefix + '_at_' + r + '=' + range[r]);
        }
        return res;
      };

      if(in_params.created){
        created = _createDateRangeString('created',in_params.created);
      }
      if(in_params.updated){
        updated = _createDateRangeString('updated',in_params.updated);
      }
      var searchStr = lapi._lagoaUrl + '/search/assets.json?'+ user + created + updated + tags + projects + datatypes + query + '&sort_updated_at=true';
      if(in_params.max){
        $.get(searchStr + '&per_page=' + in_params.max + '&page=1',in_cb, 'jsonp');
        return;
      }
      searchStr += '&per_page=25&page=';
      var assets = [];
      var page = 0;
      var accum = function(idx,res){
        res = res || [];
        var len = res.length;
        if(!len && idx !== 0){
          in_cb(assets);
          return;
        }
        if(len){
          for(var i = 0; i < len; ++i){
            assets.push(res[i]);
          }
        }
        ++idx;
        $.get(searchStr + idx,accum.bind(null, idx), 'jsonp');
      };
      accum(0);
    }, dataType: 'jsonp' });
  };

  /*
   * Fetch assets that match an array of tags.
   * @in_match {Boolean} If true, will return assets who matches all the tags. Otherwise, return 
   * object if any tag matches.
   * @in_tags {Array} Array of strings representing the tags.
   * @in_cb {Function} Optional callback that expects a JSON object (our result) as an argument.
   */
  lapi.fetchAssetsByTags = function(in_match,in_tags,in_cb){
    console.warn('Deprecated - Please use fetchAssets instead');
    lapi.fetchAssets({tags : in_tags, match : in_match},in_cb);
  };

  /**
  * Assign value to object property .
  * @in_GUID {string} The GUID of the object we want to modify.
  * @in_property {string} The property of the object we want to modify.
  * @in_values {object} The values we are assigning.
  */
  lapi.setObjectParameter = function( in_GUID, in_property, in_values ){
    console.warn('Deprecated - Please use setObjectParameters instead');
    var properties = {};
    properties[in_property] = in_values
    lapi.setObjectParameters(in_GUID, properties);
  };

  /**
  * Assign values to object various properties. This differs from
  * setObjectParameter in that you can only update a property at a time.
  * @in_GUID {string} The GUID of the object we want to modify.
  * @in_properties {Object} This object will have the property names as keys and they will map to the new values.
  * For example, to modify the camera's Position and TargetPosition, in_properties would be of the form : 
  * {
  *   Position : { x : 10, y : 15, z : 15},
  *   TargetPosition : { x : 0, y : 1, z : 3}
  * }
  * Ex :To access camera's Watermark and modify its color property.
  * {
  *  Watermark : {
  *    color : {
  *     r : 0.25,
  *     g : 0.15
  *    }
  *  }
  * }
  */
  lapi.setObjectParameters = function( in_GUID, in_properties){
    var propList = [];
    var paramList = [];
    var idx = 0;
    var pset = lapi.getActiveScene().getObjectByGuid(in_GUID).properties;

    var _createPropertyPath = function(property,path,pset){
      // Recurse through object hierarchy and create property access path.
      // Also when we find an object whose members are values, we push them
      // to the parameterList.
      var isParameterObject = false;
      for(var key in property){
        var v = property[key];
        if(v instanceof Object){
          _createPropertyPath(v,path + ".getProperty('" + key + "')",pset.properties[key]);
        } else {
          isParameterObject = true;
          if(typeof v !== "string" ){
            paramList.push("{ parameter : prop" + idx + ".getParameter('" + key + "'), value : " + v + "}");
          } else {
            paramList.push("{ parameter : prop" + idx + ".getParameter('" + key + "'), value : '" + v + "'}");
          }
          pset.parameters[key]._setValueMuted(v);
        }
      }
      if(isParameterObject){
        propList.push('var prop' + idx + ' = ' + path +';');
        ++idx;
      }
    };
    _createPropertyPath(in_properties, "obj.PropertySet",pset,0);
    var command = "var obj = ACTIVEAPP.getScene().GetByGUID('" + in_GUID +"');"
      + propList.join(' ')
      +" ACTIVEAPP.RunCommand({ command : 'SetParameterValues'"
      + ", data : {ctxt : obj, list : "
      + "[" + paramList.join()+ "]}"
      + ", mutebackend : false, forcedirty : true });"

    lapi._embedRPC(
      command,
      function(e){
        if(e.error){
          console.error("Couldn't modify object with guid :  " + in_GUID + ' with the following parameters :' );
          console.error(in_properties);
        }
      }
    );
  };

  /**
   * run a command on the embed – this uses a very limited interface we have...
   * via the message passing interface there is not much that can be done other than
   * call a command by it's name with no real parameters.
   * @private
   */
  lapi._runCommand = function( in_string ){
    lapi._embedRPC( "ACTIVEAPP.runCommand('" + in_string + "')" );
  };

  /**
   * method to control the display of the toolbar
   * @in_enable {Boolean} flag for indicating if we want to display the toolbar or not.
   */
  lapi.showToolbar = function(in_enable){
    var str = "";
    if(in_enable){
      str = "ACTIVEAPP.toolbar.show();";
    } else {
      str = "ACTIVEAPP.toolbar.hide();";
    }
    lapi._embedRPC(str);
  };

  /**
   * Desselect all selected objects
   */
  lapi.desselectAll = function(){
    lapi._runCommand('DesselectAll');
  };

  /**
   * apply a material to an object by using their guid's
   * @param {String} in_materialGuid
   * @param {String} in_meshGuid
   */
  lapi.applyMaterialToObjectByGuid = function( in_materialGuid, in_meshGuid ){

    var scn = lapi.getActiveScene();

    var mesh = scn.getObjectByGuid( in_meshGuid );
    var mat = scn.getObjectByGuid( in_materialGuid );

    var matParam = mesh.properties.getProperty("Materials").getParameter("tmaterial");
    matParam.value = mat.properties.getParameter("guid").value;
  };

  /**
   * Apply a material to a mesh by using their names
   * @example lapi.applyMaterialToMeshByName( "Glossy Diffuse", "Sphere" );
   * @param {String} in_materialName
   * @param {String} in_meshName
   */
  lapi.applyMaterialToMeshByName = function( in_materialName, in_meshName ){

    var scn = lapi.getActiveScene();

    var mesh = scn.getObjectByName( in_meshName )[0];
    var mat = scn.getObjectByName( in_materialName )[0];

    var matParam = mesh.properties.getProperty("Materials").getParameter("tmaterial");
    matParam.value = mat.properties.getParameter("guid").value;
  };


 /**
 * isRendering
 * @returns {Boolean} rendering status
 */
  lapi.isRendering = function(){
    return this._isRendering;
  };

  /**
  * startRender in the embeded scene
  */
  lapi.startRender = function(){
    this._isRendering = true;
    lapi._embedRPC("ACTIVEAPP.StartRender()");
  };

  /**
   * stopRender in the embeded scene
   */
  lapi.stopRender = function(){
    this._isRendering = false;
    lapi._embedRPC("ACTIVEAPP.StopRender()");
  };

  /**
   * Get active camera
   * return {SceneObject} camera
   */
  lapi.getCamera = function(){
    return this._activeCamera;
  };

  /**
   * Set the camera resolution parameters to in_Params.width and in_Params.height, if either is missing
   * the current value is preserved.
   * @param in_Params {Object} containing two members, width{Number} and height{Number}
   * TODO move this routine into a specialized camera class
   */
  lapi.setCameraResolution = function( in_Params ){

    // get the camera and the resolution property
    var cam = lapi.getCamera();
    var camGuid = cam.properties.getParameter("guid").value;

    var resProp = cam.getProperty("Resolution");

    // validate we have some decent parameters to work with or default to what is already set to
    in_Params.width  = "width"  in in_Params ? in_Params.width  : resProp.parameters.width.value;
    in_Params.height = "height" in in_Params ? in_Params.height : resProp.parameters.height.value;

    // set once
    lapi.setObjectParameters(
      camGuid,
      {
        Resolution : {
          width  : in_Params.width,
          height : in_Params.height 
        }
      }
    );
  };

  /**
   * isPlaying test to know if we are in changing time
   * @return {Boolean} playing status
   */
  lapi.isPlaying = function(){ return this._isPlaying; };

  /**
   * @function stop playing the timeline
   */
  lapi.stop = function(){
    this._isPlaying = false;
    this._frame = 0;
  };

  /**
   * @function start playing the timeline
   */
  lapi.play = function(in_fps){

    in_fps = Math.round(1000/in_fps) || Math.round(1000/30) ; // ~30fps is the default

    // abort early
    if (this.isPlaying()) return;

    // start some variables
    var start = null;
    var self = this;
    self._timeIntervalId = null;
    self._isPlaying = true;

    // creat tthe play routine
    function doStep(){
      ++self._frame;
      if (self.isPlaying()) {
        self.stepCb( self._frame );
      }
      else{
        clearInterval(self._timeIntervalId);
      }
    }

    // start play
    self._timeIntervalId = setInterval(doStep, in_fps);
  };

  lapi.nextFrame = function(){
    ++this._frame;
    this.stepCb( this._frame );
  };

  /**
   * @function pause the timeline
   */
  lapi.pause = function(){
    // abort early
    if (this.isPlaying()){
      clearInterval(this._timeIntervalId);
      this._timeIntervalId = null;
    }
  };

  lapi._activeTool = function(in_tool){
    lapi._embedRPC("ACTIVEAPP.getToolManager().setActiveTool('" + in_tool + "');");
  }

  lapi.moveTool = function(){
    lapi._activeTool('MoveTool');
  };

  lapi.scaleTool = function(){
    lapi._activeTool('ScaleTool');
  };

  lapi.rotateTool = function(){
    lapi._activeTool('RotationTool');
  };

  lapi.orbitTool = function(){
    lapi._activeTool('OrbitTool');
  };

  lapi.panTool = function(){
    lapi._activeTool('PanTool');
  };

  lapi.checkGuidTool = function(){
    lapi._activeTool('CheckGuidTool');
  }

  /**
   * method to enable mouse inetractions.
   * This means the viewport reacts to the mouse inetractions ( dollies, orbits).
   * @in_enable {Boolean} Flag that enables/disables mouse interactions.
   */
  lapi.enableMouseInteractions = function (in_enable){
    var action;
    if(in_enable){
      action = 'appendBinding';
    } else {
      action = 'removeBinding';
    }
    lapi._embedRPC("ACTIVEAPP.vpman.leafWalk(function (v) {"
      + "if ( (v instanceof Application.Viewport)) {"
        + "v." + action +"({"
        + "event : 'wheel',"
        + "callback : v._onWheel"
        + "});"
      + "}"
    +"});");
  };

  /**
   * method for on Scene Loaded event
   * @virtual
   * @callback called when scene finishes loading – no geometry data is guaranteed to have loaded
   */
  lapi.onSceneLoaded = function(){};

  /**
   * method for stepping to the next frame
   * @virtual
   * @callback called when the animation has to step a frame
   */
  lapi.stepCb = function(){};

  // Make sure that the whole scene is loaded! Only then can you  set the first object selection.
  // This happens because we want the user to have a reference object to guide them.
  $(function() {
    function checkLoaded(){
//      console.warn("waiting for scene to load...");
      lapi._embedRPC("ACTIVEAPP.getSceneLoaded();", function(in_response) {
        if (in_response.data === true){
          clearInterval(timer);
          lapi._initialize();
        }
      });
    }
    var timer = setInterval(checkLoaded,500);
  });

})();

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

/**
 * @ignore
 * @fileOverview Implements the SceneObject api class.
 */

/** A object to handle and represent a Lagoa SceneObject outside of the platform
 * This object will be initialized – based on the input guid – producing a
 * mirror object locally outside of the embed.
 * @param {string} in_guid guid of an object in the scene
 * @param {Object} (Optional) PropertySet object to populate the SceneObject. This avoids an async call.
 * @param {function} in_cb (optional) callback is called when object is done initializing.
 * The callback expects an SceneObject.
 * @class SceneObject
 */
lapi.SceneObject = function( in_guid,in_pset,in_cb){
  var _guid = in_guid;
  var _properties = {};
  var _self = this;
  this._copiedCount = 0;
  in_pset = in_pset || undefined;
  in_cb = in_cb || undefined;

  Object.defineProperty(this,"properties",{
   /**
    * Get the property of the SceneObject
    * @type {Property}
    */
    get:function(){return _properties;},
  /**
    * @method setter block access to changing the reference
    * to the properties object represented by this SceneObject
    */
    set:function(in_val){ console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );},
    enumerable: true
  });


  Object.defineProperty(this,"guid",{
   /**
    * @member {string} guid of this object
    */
    get:function(){return _guid;},
   /**
    * @member {string} setter that blocks changing the guid of this object
    */
    set:function(in_val){console.error( lapi.CONSTANTS.CONSOLE_MSGS.IMMUTABLE );},
    enumerable: true
  });


  if(in_pset){
    _properties = _self._pSetDeepCopy( _self, in_pset );
    if(in_cb){
      in_cb(_self);
    }
  } else {
    // We cache the entire PropertySet object (flattened) for local access
    // The deep copy routine builds the embed object using the local property and parameter objects
    console.warn("Building PSet of " + in_guid );
    lapi._embedRPC("ACTIVEAPP.getScene().GetByGUID('"+in_guid+"').PropertySet.flatten({"
      +   "flattenType: Application.CONSTANTS.FLATTEN_PARAMETER_TYPE.VALUE_ID"
      + "});",
      function(in_embedRPC_message){
        if( !(in_embedRPC_message.error === "EXECERR") ){
          var pSet = in_embedRPC_message.data;
          _properties = _self._pSetDeepCopy( _self, pSet );
          if(in_cb){
            in_cb(_self);
          }
        }
      }
    );
  }

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
    var matGuid = this.properties.getProperty("Materials").getParameter("tmaterial").value;
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
   * RPC call for SC to execute. It will bind our callbacks to the object's modifications.
   * As a bonus, we will now automatically track the values of the property parameters and update our object
   * accordingly. This way, the user won't be responsible for the updating/tracking!
   * @in_propName {string} The property of the object we want to track.
   * @callback {function} Optional callback. It will use a stringified property object or
   * a paramater. Note : property objects is made of key-value entries, where the key is a
   * parameter id and value is a strigified parameter. The exception being if a property is
   * a single parameter. Then, it's just the parameter object itself.  
   */
  bindProperty : function( in_propName, callback){
    var eventName = this.guid + ':' + in_propName;
    var initialBind = false;
    if(!lapi._eventCbMap[eventName]){
      initialBind = true;
      var cb;
      var property = this.getProperty(in_propName);
      if(property){
        var setPropertyValues = function(prop,data){
          for( var i in data){
            var param = prop.getParameter(i);
            if(param){
              param._setValueMuted(data[i].value);
            } else {
              var innerProp = prop.getProperty(i);
              if(innerProp){
                setPropertyValues(innerProp,data[i]);
              }
            }
          }          
        }
        cb = function(data){
          setPropertyValues(property,data);
        };
      }else {
        property = this.properties.getParameter(in_propName);
        cb = function(data){
          property._setValueMuted(data.value);
        };

      }
      lapi._eventCbMap[eventName] = [cb];
    }
    if(callback){
      lapi._eventCbMap[eventName].push(callback);
    }
    if(initialBind){
      lapi._messageIframe({channel : 'embedrpc', id: eventName});
    }
  },

  /**
   * RPC call for SC to execute. It will unbind all callbacks from specific object's modifications.
   * This also means we are no longer tracking the object values.
   * @in_propName {string} The property of the object we want to track.
   */
  unbindProperty : function( in_propName){
    var eventName = this.guid + ':' + in_propName;
    if(!lapi._eventCbMap[eventName]){
      return;
    }
    delete lapi._eventCbMap[eventName];
    lapi._messageIframe({channel : 'embedrpc', id: eventName, unbind : true});
  },

  /**
   * This will unbind a specific callback from the object's property modifications.
   * @in_propName {string} The property of the object we want to track.
   * @callback {function}  The callback we want to unbind.
   */
  unbindPropertyCb : function( in_propName, callback){
    var eventName = this.guid + ':' + in_propName;
    if(!lapi._eventCbMap[eventName]){
      return;
    }
    var index = lapi._eventCbMap[eventName].indexOf(callback);
    if (index > -1) {
      lapi._eventCbMap[eventName].splice(index, 1);
    }
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
        if( in_prop[i].id && in_prop[i].type ){  // if it has an ID and a TYPE then it is a parameter object...
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
  },

  /**
   * This is an asynchronous function!
   * Compute the BoundingBox of an object in world space. In other words, take into
   * account the translation,rotation and scale components.
   * @in_cb {function} function that expects an object  {min : {x : v, y : v, z :v}, max :{...}}
   * the 'v' is a stand-in for numerical values.
   */
  computeTransformedAABB : function(in_cb){
    var bb = this.properties.getProperty("BoundingBoxMin");
    if(!bb){
      console.warn('object has no bounding box');
      return;
    }
    lapi._embedRPC("var obj = ACTIVEAPP.getScene().GetByGUID('" + this.guid +"');"
      + "var bbox = ACTIVEAPP.boundingBoxForEntity(obj);"
      + "bbox.transformAndAxisAlign(obj.matrix);",function(in_response){
        in_cb(in_response.data);
      });
  },

  /**
   * This is an asynchronous function!
   * If this is an object with children, return an array of their guids!
   * @in_cb {function} function that expects an array of guids
   */
  fetchChildren : function(in_cb){
    lapi._embedRPC("var obj = ACTIVEAPP.getScene().GetByGUID('" + this.guid +"');"
      + "var arr = [];"
      + "if (obj._children) { "
      + " for (var i = 0 ; i < obj._children.length; ++i) {"
      +  "  arr[i] = obj._children[i].guid; "
      +  "}"
      + "}"
      + "arr",function(in_response){
        in_cb(in_response.data);
      });
  },

  /**
   * Translate this object in local space!
   * @in_axis {String} the axis we want translate in : must be 'x','y' or 'z'.
   * @in_distance {number} value to translate.
   */
  translate : function(in_axis, in_distance){
    var axis = in_axis.toUpperCase();
    lapi._embedRPC("var mesh  = ACTIVEAPP.getScene().GetByGUID('" + this.guid +"');" 
      +"mesh.translate"+ axis +"("+in_distance+");"
      +"var prop = mesh.PropertySet.getProperty('Position');"
      +"var newPos = {x: mesh.position.x, y : mesh.position.y , z : mesh.position.z};"
      +"mesh.position.x = 0; mesh.position.y = 0; mesh.position.z = 0;"
      +"ACTIVEAPP.RunCommand({ command : 'SetParameterValues'"
      + ", data : {ctxt : mesh, list : "
      + "[{parameter : prop.getParameter('x'), value : newPos.x}"
      + ",{parameter : prop.getParameter('y'), value : newPos.y}"
      + ",{parameter : prop.getParameter('z'), value : newPos.z}]}"
      + ", mutebackend : mesh.local, forcedirty : true });");
  },

  /**
   * Set image. ( Background, EnvironmentMap ,Watermark...etc)
   * @in_property {String} the object property that we must assign path and imgType to.
   * @in_guid {String} the guid of the image.
   * @in_imgType {String} the ext/type of the image.
   */
  setImage : function(in_property, in_path, in_imgType){
    var property = {};
    property[in_property]  = {
      imgType : in_imgType,
      path : in_path
    }
    lapi.setObjectParameters(this.guid, property);
  },

  /**
   * Set Texture.{ Material reflactance,reflectivity etc.}
   * @in_property {String} the object property that we must assign path and imgType to.
   * @in_guid {String} the guid of the image.
   * @in_imgType {String} the ext/type of the image.
   */
  setTexture : function(in_property, in_guid, in_imgType){
    var property = {};
    property[in_property]  = {
      imgtype : in_imgType,
      texture : in_guid
    }
    lapi.setObjectParameters(this.guid, property);
  },

  /**
  * Assign values to an object's various properties.
  * @in_properties {Object} This object will have the property names as keys and they will map to the new values.
  * For example, to modify the camera's Position and TargetPosition, in_properties would be of the form : 
  * {
  *   Position : { x : 10, y : 15, z : 15},
  *   TargetPosition : { x : 0, y : 1, z : 3}
  * }
  * Also, you can access nested properties.
  * Ex :To access camera's Watermark and modify its color property.
  * {
  *  Watermark : {
  *    color : {
  *     r : 0.25,
  *     g : 0.15
  *    }
  *  }
  * }
  */
  setParameters : function(in_properties){
    lapi.setObjectParameters(this.guid,in_properties);
  },

  /**
  * Returns a string representation of the object's property.
  * Suitable for pretty printing.
  */
  stringifyPropertySet : function(){
    var _stringifyProperty =  function (in_prop, in_shift){
      var params = in_prop.parameters;
      var props = in_prop.properties;
      var newShift = in_shift + '  ';
      var paramStr = in_shift + in_prop.name + ' : ' + '{ \n';
      for(var k in params){
        paramStr += (newShift  + k + ' : ' + params[k].value +',\n');
      }

      for(var p in props){
        paramStr += _stringifyProperty(props[p],newShift);
      }
      paramStr += in_shift  +'}\n';
      return paramStr;
    };
    return _stringifyProperty(this.properties,'');
  }

};

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

/**
 * @ignore
 * @fileOverview declares the Scene api class.
 */

/** flat Scene representation organized by object kind (Light, Material, Mesh, etc...)
 * @param {object} in_guidList is expected to be { classID : [ Array ] }
 * @param {Callback} Function that is called when all objects are loaded.
 * @constructor Scene
 */
lapi.Scene = function( in_sceneGuid, in_guidList,in_cb ){

  // this is just so we keep track of the guid of the scene here.
  this._guid = in_sceneGuid;

  // organize by class
  this._classedItems = {};

  // the guid list for search
  this._guidItems = {};

  // the scene object count
  this._objectCount = 0;

  var that = this;
  for( var i in in_guidList ){

    var tmpGuid;

    var classID = in_guidList[i];

    // create a hash of the classed type
    var initClass = this._classedItems[i] = {};

    // build the shallow SceneObject in place
    for( var j in classID){
      tmpGuid = classID[j];
      this._guidItems[tmpGuid] = initClass[tmpGuid] = new lapi.SceneObject( tmpGuid , null, function(){
        ++that._objectCount; 
        if(that._objectCount === Object.keys(that._guidItems).length){
          in_cb();
        }
      });
    }
  }
};

/**
 * @memberof Scene
 */
lapi.Scene.prototype = {
  constructor    : lapi.Scene,

  /**
   * Get an object via it's guid
   * @param in_guid
   * @returns {String}
   */
  getObjectByGuid : function( in_guid ){
    return this._guidItems[ in_guid ];
  },

  getObjectByName : function( in_name ){
    var find = [];
    var sceneObjs = this._guidItems;
    var o;

    for( var i in sceneObjs){
      o = sceneObjs[i];
      var param = o.properties.getParameter("name");
      if(param){
        if( in_name === o.properties.getParameter("name").value ){
          find.push(o);
        }
      }
    }
    return find;
  },

  getLights : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.LIGHT ] );
  },

  getCameras : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.CAMERA ]);
  },

  getMeshes : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.MESH ]);
  },

  getMaterials : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.MATERIAL ]);
  },

  getTextures : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.TEXTURE ]);
  },

  getGroups : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.GROUP ]);
  },

  getStates : function(){
    return lapi.utils.objToArray(this._classedItems[ lapi.CONSTANTS.SCENE.STATES ]);
  },

  getObjectCount : function(){
    return this._objectCount;
  },

  /*
   * Load scene assets dynamically into the scene. Coule be meshes, images, materials or scenes!
   * @in_assetArray {Array} a collection of assets we want to load.
   *  Each member is an object of the type {name : {string}, datatype : {number} , version_guid : {string}}.
   *  guid : The guid of the asset we want to load
   *  datatype :  The datatype of the asset
   *  name : name of the asset. Can be user-defined.
   *  ex : addAssets([{name : 'UntitledScene',datatype : 14, version_guid : '5fee03c9-8985-42fa-a4aa-a5689c6ab7e9'}], cb);
   * @in_cb {Function} optional callback that expects an array of guids of the just added assets.
   */

  addAssets : function(in_assetArray,in_cb){
    lapi._loadAssets(in_assetArray,in_cb);
  },

  /*
   * Add an object to the scene!
   * @in_tuid {String} the tuid type of this object. "MeshID", "MaterialID" etc.
   * @in_guid {String} the guid of this object.
   * @in_pset {Object} (Optional) PropertySet data for this object.
   * @in_cb {Function} optional callback that expects an array of guids of the just added assets.
   */
  addObject : function(in_tuid,in_guid,in_pset,in_cb){
    var initClass = this._classedItems[in_tuid];
    in_pset = in_pset || null;
    if(!initClass){
      initClass = this._classedItems[in_tuid] = {};
    }
    this._guidItems[in_guid] = initClass[in_guid] = new lapi.SceneObject( in_guid,in_pset,in_cb);
    ++this._objectCount;
  },

  /**
   * Duplicate a SceneObject.
   * @param {lapi.SceneObject} in_sceneObject The SceneObject we want to duplicate.
   * @param {function} in_cb  optional callback that expects a  SceneObject as an argument. The object is the one we just added.
   */
  duplicateObject : function(in_sceneObject,in_cb){
    var self = this;
    var tuid = in_sceneObject.properties.getParameter('tuid').value;
    if(tuid === 'SceneStateID' || tuid === 'CameraID'){
      console.warn("Cannot duplicate states or cameras.");
      return;
    }

    var guid = in_sceneObject.properties.getParameter('guid').value;
    var name = [in_sceneObject.properties.getParameter('name').value,
      'Copy ',
        String(in_sceneObject._copiedCount++)
    ].join(' ');
    var newGuid = lapi._generateGUID();
    var self = this;
    if(in_cb){
      lapi._cbmap[newGuid] = in_cb;
    }
    lapi._embedRPC("var pset = ACTIVEAPP.getScene().GetByGUID('"+guid+"').PropertySet.flatten({"
      +   "flattenType: Application.CONSTANTS.FLATTEN_PARAMETER_TYPE.VALUE_ONLY"
      + "});"
      + "pset.guid.value = '" + newGuid +"';"
      + "pset.name.value = '" + name +"';"
      + "var obj  = [{tuid : pset.tuid.value , pset : pset}];"
      + " ACTIVEAPP.RunCommand({"
      +   "command : 'InsertObjects',"
      +   "data : obj"
      + " });"
    );
  },

  /**
   * Delete a SceneObject.
   * @param {lapi.SceneObject} in_sceneObject The SceneObject we want to delete.
   */
  deleteObject : function(in_sceneObject){
    var self = this;
    var tuid = in_sceneObject.properties.getParameter('tuid').value;
    if(tuid === 'CameraID'){
      console.warn("Cannot delete camera!");
      return;
    }

    var guid = in_sceneObject.properties.getParameter('guid').value;
    var self = this;
    lapi._embedRPC("var obj = ACTIVEAPP.getScene().GetByGUID('"+guid+"');"
      + " ACTIVEAPP.RunCommand({"
      + "   command : 'Delete',"
      + "   data : { "
      + "     ctxt : obj"
      + "   }"
      + "});",
      function(e){
        if(e.error){
          return;
        }
        var initClass = self._classedItems[tuid];
        delete self._guidItems[guid];
        delete initClass[guid];
        --self._objectCount;
      }
    );
  },

  /**
   * Add a new material to scene.
   * @param {string} in_materialType  The type of material the user wants to add : 'Glossy Diffuse','Architectural Glass' etc.
   * @param {function} in_cb  optional callback that expects a material SceneObject as an argument. The object is the one we just added
   * to the scene through addNewMaterial().
   */
  addNewMaterial : function(in_materialType,in_cb){
    var self = this;
    lapi._embedRPC("var mat = ACTIVEAPP.AddEngineMaterial({minortype : '"
    + in_materialType + "'});"
    + "mat.guid;",function(in_response){
        if(in_cb){
          var scn = lapi.getActiveScene();
          in_cb(scn.getObjectByGuid(in_response.data));
        }
    });
  },

  /**
   * Add a new light to scene.
   * @param {string} in_lightType  The type of light the user wants to add : 'DomeLight','SunSkyLight' etc.
   * @param {function} in_cb  optional callback that expects a light SceneObject as an argument. The object is the 
   * one we just added to the scene through addNewLight().
   */
  addNewLight : function(in_lightType,in_cb){
    var self = this;
    lapi._embedRPC("var light = ACTIVEAPP.AddLight({minortype : '"
    + in_lightType + "'});"
    + "light.guid;",function(in_response){
        if(in_cb){
          var scn = lapi.getActiveScene();
          in_cb(scn.getObjectByGuid(in_response.data));
        }
    });
  },

  /**
   * Activate a scene state.
   * @param {Object} in_state The state we want to make active.
   * @param {function} in_cb  Optional callback that gets executed after activating a scene state. Does not expect any arguments.
   */
  setActiveSceneState : function(in_state, in_cb){
    lapi._embedRPC("ACTIVEAPP.sceneStateManager.activateState('" + in_state.guid +"');", function(e){
      if(!e.error){
        in_cb();
      } else {
        console.log('There was an error. Could not change scene state.');
      }
    });
  },


  /**
   * Orbit scene using yaw and pitch.
   * @param {Object} in_params pitch and yaw values.
   * in_params.pitch {Number} The amount in degrees we will rotate the camera's pitch.
   * in_params.yaw {Number} The amount in degrees we will rotate the camera's yaw.
   */
  orbit : function(in_params){
    in_params = in_params || {};
    in_params.pitch = in_params.pitch || 0;
    in_params.yaw = in_params.yaw || 0;
    var pitch = (in_params.pitch/ 360) * 2 * Math.PI;
    var yaw = (in_params.yaw/ 360) * 2 * Math.PI;
    lapi._embedRPC('var cam = ACTIVEAPP.GetCamera();'
      +"var prop = cam.PropertySet.getProperty('Position');"
      +'var position = Application.Math.safeOrbit({'
      +'up: cam.up,'
      +'center: cam.target.position,'
      +'position: cam.position,'
      +'yawDelta:' + yaw + ','
      +'pitchDelta:' + pitch
      +'});'
      +"ACTIVEAPP.RunCommand({ command : 'SetParameterValues'"
      +', data : {ctxt : cam'
      +", list : [{ parameter : prop.getParameter('x'), value : position.x.toFixed(" + lapi._precision + ") }"
      +", { parameter : prop.getParameter('y'), value : position.y.toFixed(" + lapi._precision + ") }"
      +", { parameter : prop.getParameter('z'), value : position.z.toFixed(" + lapi._precision + ") }]}"
      +', mutebackend : cam.local'
      +', forcedirty : true });'
    );
  },

  /**
   * Orbit scene using pitch.
   * @param {Number} in_degrees  The amount in degrees we will rotate the camera.
   */
  orbitPitch : function(in_degrees){
    this.orbit({
      pitch : in_degrees
    });
  },


  /**
   * Orbit scene using yaw.
   * @param {Number} in_degrees  The amount in degrees we will rotate the camera.
   */
  orbitYaw : function(in_degrees){
    this.orbit({
      yaw : in_degrees
    });
  }


};
