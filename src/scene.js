/**
 * @ignore
 * @fileOverview declares the Scene api class.
 */

/** flat Scene representation organized by object kind (Light, Material, Mesh, etc...)
 * @param {object} in_guidList is expected to be { classID : [ Array ] }
 * @constructor Scene
 */
lapi.Scene = function( in_sceneGuid, in_guidList ){

  // this is just so we keep track of the guid of the scene here.
  this._guid = in_sceneGuid;

  // organize by class
  this._classedItems = {};

  // the guid list for search
  this._guidItems = {};

  // the scene object count
  this._objectCount = 0;


  for( var i in in_guidList ){

    var tmpGuid;

    var classID = in_guidList[i];

    // create a hash of the classed type
    var initClass = this._classedItems[i] = {};

    // build the shallow SceneObject in place
    for( var j in classID){
      tmpGuid = classID[j];
      this._guidItems[tmpGuid] = initClass[tmpGuid] = new lapi.SceneObject( tmpGuid );
      ++this._objectCount;
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
      if( in_name === o.properties.getParameter("name").value ){
        find.push(o);
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

  addObject : function(in_tuid,in_guid,in_cb){
    var initClass = this._classedItems[in_tuid];
    if(!initClass){
      initClass = this._classedItems[in_tuid] = {};
    }
    var self = this;
    var sceneObject = new lapi.SceneObject( in_guid, function(obj){
      self._guidItems[in_guid] = initClass[in_guid] = obj;
      if(in_cb){
        in_cb(obj);
      }
    });
    ++this._objectCount;
  },

  /**
   * Duplicate a SceneObject.
   * @param {lapi.SceneObject} in_sceneObhect The SceneObject we want to duplicate.
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
    var self = this;
    lapi._embedRPC(" var newGuid = generateGUID();"
      + "var pset = ACTIVEAPP.GetScene().GetByGUID('"+guid+"').PropertySet.flatten({"
      +   "flattenType: Application.CONSTANTS.FLATTEN_PARAMETER_TYPE.VALUE_ONLY"
      + "});"
      + "pset.guid.value = newGuid;"
      + "pset.name.value = '" + name +"';"
      + "var obj  = [{tuid : pset.tuid.value , pset : pset}];"
      + " ACTIVEAPP.RunCommand({"
      +   "command : 'InsertObjects',"
      +   "data : obj"
      + " });"
      + "newGuid;",
      function(in_response){
        if(in_cb){
          lapi._cbmap[in_response.data] = in_cb;
        }
      });
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
        lapi._cbmap[in_response.data] = in_cb;
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
        lapi._cbmap[in_response.data] = in_cb;
      }
    });
  }

};