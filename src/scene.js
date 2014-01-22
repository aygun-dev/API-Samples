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

  addAssets : function(in_assetArray){
    lapi._loadAssets(in_assetArray);
  },

  addObject : function(in_tuid,in_guid){
    var initClass = this._classedItems[in_tuid];
    this._guidItems[in_guid] = initClass[in_guid] = new lapi.SceneObject( in_guid );
    ++this._objectCount;
  },

  addMaterial : function(in_materialType){
    var self = this;
    lapi._embedRPC("var mat = ACTIVEAPP.AddEngineMaterial({minortype : '"
    + in_materialType + "'});"
    + "mat.guid;",function(in_response){
      self.addObject('MaterialID',in_response.data);
    });
  },

  addLight : function(in_lightType){
    var self = this;
    lapi._embedRPC("var light = ACTIVEAPP.AddLight({minortype : '"
    + in_lightType + "'});"
    + "light.guid;",function(in_response){
      self.addObject('LightID',in_response.data);
    });
  }

};