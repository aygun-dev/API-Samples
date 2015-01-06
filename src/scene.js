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