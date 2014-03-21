
  // NB : MUST OF THIS FORM  ---> params = { property : 'Position', value : {x : .., y:..} }

  /*
  id : 'SchematicPosition'
  values : x, y (num)

  id : 'Position'
  values : x, y, z (num)

  id : 'Rotation' 
  values : x, y, z, anglex, angley, anglez (num)

  id : 'Scale'
  values : x, y, z (num)

  id : 'RenderSettings'
  values : directCompositing, seeObjectsInside, renderVisible, shadowCast, giBounces (bool)

  id : 'Materials'
  values : tmaterial (string)

  id : 'UVProjection'
  values : projectionGuid (string)

  id : 'Visibility'
  values : visible (bool)

  id : 'LightMesh'
  values : enable (bool) , intensity (num)

  id : 'LightMeshColor'
  values : r, g, b (num)
  */

// Callback map for a each RPC. It is indexed by the RPC unique id.
var cbmap = {};
// Holder variable for the object we want to interact with.
var objGUID = "";
var materialName = "";
var lagoaUrl="";
var meshCount = 0;
var userID;
var projectID;
var assets = {};
var objData = {};
var sceneTimer;

/**
 * RPC call for SC to execute.
 * @message {string} instructions we want to execute
 * @callback {function} Optional callback. It will use whatever the RPC call returns. Note, that RPC
 * return value is a stringified object we parse. It's not returning a proxy or the actual object. 
 * Interactions with the scene will happen only through embedRPC calls.
 */
function embedRPC(message, callback){
  var randName = 'xxxxxxxxxx'.replace(/x/g,function(){return Math.floor(Math.random()*16).toString(16)});
  var iframe = document.getElementById('lagoaframe');
  if(callback){
    cbmap[randName] = callback;
  }
  iframe.contentWindow.postMessage(JSON.stringify({channel : 'embedrpc', id: randName, command : message}), '*');
};

window.addEventListener("message", function(e){
  var retval = JSON.parse(e.data);
  if(retval.channel == 'rpcend') {
    if(cbmap[retval.id]){
      var callback = cbmap[retval.id];
      callback(retval);
      delete cbmap[retval.id];
    }
  }
});

function onLoad() {
  fetchAndInitUserData();
  updateGuidMenu();
  updateMaterialMenu();
  updateToolsMenu();
  updateAssetMenu();
};

/**
 * Get a list of asset guids from the scene. Then,
 * update the asset guid menu.
 */
function updateGuidMenu(){
    var count = 0;
    var cb = function (in_response) {
      var items = in_response.data;
      $('#js-guid_select_menu').empty();
      for(var itemKey in items){
        $('#js-guid_select_menu').append("<option value="+
          itemKey+">" + items[itemKey].parameters.name.value
           + "</option>");
          ++count;
      }
      meshCount = count;
      $("#js-guid_select_menu option:first").attr('selected','selected');
      $("#js-guid_select_menu").select2();
      pickObjGUID();
    };
    // RPC to get a list of Mesh Objects
    embedRPC("ACTIVEAPP.GetClassedItems()['MeshID']",cb);  //can choose MeshID, LightID, CameraID
}

/**
 * Get a list of tools from the app. Then,
 * update the asset tool menu.
 */
function updateToolsMenu(){
  $('#js-tools_select_menu').empty();
  var validTools =['OrbitTool','PanTool'
    ,'DollyTool','ZoomTool'
    ,'SelectTool','ScaleTool'
    ,'RotationTool','MoveTool'];
  $('#js-tools_select_menu').append("<option></option>");
  for(var i = 0 ; i < validTools.length ; ++i){
    $('#js-tools_select_menu').append("<option>" + validTools[i] + "</option>");
  }
  $("#js-tools_select_menu option:first").attr('selected','selected');
  $("#js-tools_select_menu").select2({placeholder: "Select a Tool"});
}

/**
 * Get a list of materials from the app. Then,
 * update the materials menu.
 */
function updateMaterialMenu(){
  var cb = function (in_response) {
    var materials = in_response.data;
    $('#js-material_select_menu').empty();
    // default material is Diffuse
    $('#js-material_select_menu').append("<option>BASEMATERIAL</option>");
    for(var matName in materials){
        $('#js-material_select_menu').append("<option>" + matName + "</option>");
    }
    $("#js-material_select_menu option:first").attr('selected','selected');
    $("#js-material_select_menu").select2();
    pickMaterial();
  };
  // RPC to get a list of Mesh Objects
  embedRPC("window.engine_materials",cb);  // can choose MeshID, LightID, CameraID
}

/**
 * Get a list of projects associated with user. Then,
 * update the projects menu.
 */
function updateProjectsMenu(in_userID){
  var cb = function (data) {
    for(var i = 0 ; i < data.length ; ++i){
        var project = data[i];
        $('#js-projects_select_menu').append("<option value="+
          project.id+">" + project.name + "</option>");
    }
    $("#js-projects_select_menu option:first").attr('selected','selected');
    $("#js-projects_select_menu").select2();
    pickProjectID();
  };
  $.get(lagoaUrl + '/projects.json',{user_id : in_userID},cb, 'jsonp');
};

    /**
    * Get a list of assets associated with a project id. Then,
    * update the assets menu.
    */
    function updateAssetMenu(){
      assets = {};
      var cb = function (data) {
        $('#js-assets_select_menu').empty();
        $('#js-assets_select_menu').append("<option value></option>");
        for(var i = 0 ; i < data.length ; ++i){
          var asset = data[i];
          $('#js-assets_select_menu').append("<option value="+
            asset.latest.guid+">" + asset.name + "</option>");
          assets[asset.latest.guid] = asset.latest.datatype_id;
        }
        $("#js-assets_select_menu").select2({placeholder: "Select an Asset"});
      };
      $.get(lapi._lagoaUrl + '/search/assets.json?per_page=100&page=1&datatype_ids=14,21&sort_updated_at=true',cb, 'jsonp');
    };


/**
 * Get the app URL in order to fetch project and asset data.
 * Then, query the ID of the current logged user and use it
 * to find their associated projects. With the projectIDs, the
 * page can load and use any asset uploaded to a particular project. 
 */
function fetchAndInitUserData(){
  var cb = function(in_response){
    lagoaUrl = in_response.data;
    var  userCB = function(data){
      if(data.id){
        userID = data.id;
      }
      updateProjectsMenu(userID);
    }
    $.get(lagoaUrl + '/users/'+'current_user.json',userCB, 'jsonp');
  };
  embedRPC("window.location.protocol + '//' + window.location.host",cb);
}

/** 
 * A callback for obj selection dropdown menu.
 */
function pickObjGUID(){
  objGUID = "";
  $("#js-guid_select_menu option:selected").each(function (){
    objGUID += $(this).val();
  });
  embedRPC("var obj = ACTIVEAPP.scene.GetByGUID('" +  objGUID + "'); "
    + "ACTIVEAPP.SetSelection(obj);ACTIVEAPP.selection.GetAsArray()"
    , function(in_response){
      objData = in_response.data[0];
      $('#scale-x-value').val(objData.properties.Scale.parameters.x.value);
      $('#scale-y-value').val(objData.properties.Scale.parameters.y.value);
      $('#scale-z-value').val(objData.properties.Scale.parameters.z.value);
      $('#position-x-value').val(objData.properties.Rotation.parameters.x.value);
      $('#position-y-value').val(objData.properties.Rotation.parameters.y.value);
      $('#position-z-value').val(objData.properties.Rotation.parameters.z.value);
      $('#rotation-x-value').val(objData.properties.Position.parameters.x.value);
      $('#rotation-y-value').val(objData.properties.Position.parameters.y.value);
      $('#rotation-z-value').val(objData.properties.Position.parameters.z.value);
  });
  updatMaterialColor();
};
/** 
 * A callback for project selection dropdown menu.
 * Select the chosen project and update our asset list.
 */
function updatMaterialColor(){
  embedRPC("var obj = ACTIVEAPP.scene.GetByGUID('" +  objGUID + "'); "
    + "var matData ={color : obj.material.color, name : obj.material.name};"
    + "matData",function(in_response){
      var color = in_response.data.color;
      var matName = in_response.data.name;
      matName = matName.replace(/[0-9]+$/, '');
      matName = matName.trim();
      $('#js-material_select_menu').select2("data",{text: matName});
      $('#rgb-x-value').val(color.r);
      $('#rgb-y-value').val(color.g);
      $('#rgb-z-value').val(color.b);
  });
}

/** 
 * A callback for project selection dropdown menu.
 * Select the chosen project and update our asset list.
 */
function pickProjectID(){
  $("#js-projects_select_menu option:selected").each(function (){
    projectID = $(this).val();
  });
  updateAssetMenu(projectID);
};

  /** 
  * A callback for asset selection dropdown menu.
  * Select the chosen asset.
  */
  function pickAsset(){
    var assetName  ="";
    var assetGUID='';
    $("#js-assets_select_menu option:selected").each(function (){
      assetGUID = $(this).val();
      assetName = $(this).text();
    });
    lapi.getActiveScene().addAssets([{name: assetName, datatype : assets[assetGUID],version_guid: assetGUID}]);
  };



/**
 * A callback for material selection dropdown menu. Select
 * the chosen object.
 */
function pickMaterial(){
  materialName = "";
  $("#js-material_select_menu option:selected").each(function (){
    materialName += $(this).text();
  });
  embedRPC("var mat = ACTIVEAPP.AddEngineMaterial({minortype : '"
    + materialName + "'});"
    + "ACTIVEAPP.ApplyMaterial({ctxt : '" + objGUID 
    +"', material : mat});",function(in_response){
      updatMaterialColor();
    });
};

/** 
 * A callback for tool selection dropdown menu.
 * Select the chosen object.
 */

function pickTool(){
  var toolName = "";
  $("#js-tools_select_menu option:selected").each(function (){
    toolName = $(this).text();
  });
  embedRPC("ACTIVEAPP.getToolManager().setActiveTool('"+ toolName + "');",function(in_response){
    console.log(in_response);
  });
};

/** 
 * A callback for update button. Update the object.
 * Select chosen property. Can be extended below!
 */
function updateObject(){
  var r = $('#rgb-x-value').val();
  var g = $('#rgb-y-value').val();
  var b = $('#rgb-z-value').val();
  embedRPC("var obj = ACTIVEAPP.scene.GetByGUID('" +  objGUID + "'); "
    +"obj.material.color.r = " + r +"; obj.material.color.g = " + g +"; "
    +"obj.material.color.b = " + b +";");
  var params = {};
  params.x = $('#scale-x-value').val();
  params.y = $('#scale-y-value').val();
  params.z = $('#scale-z-value').val();
  setObjectParameter(objGUID , 'Scale', params);
  params.x = $('#position-x-value').val();
  params.y = $('#position-y-value').val();
  params.z = $('#position-z-value').val();
  setObjectParameter(objGUID , 'Position', params);
  params = {};
  params.anglex = $('#rotation-x-value').val();
  params.angley = $('#rotation-y-value').val();
  params.anglez = $('#rotation-z-value').val();
  setObjectParameter(objGUID , 'Rotation', params);
}

/**
 * Assign value to object property .
 * @in_GUID {string} The GUID of the object we want to modify.
 * @in_property {string} The property of the object we want to modify.
 * @in_values {object} The values we are assigning.
 */
function setObjectParameter(in_GUID,in_property,in_values){
  embedRPC("ACTIVEAPP.setObjectParameter('" +in_GUID + "'"
    +",{property : '" + in_property + "', value : " 
    + JSON.stringify(in_values) + "});",function(in_response){
    console.log(in_response);
  });
};

/** A function to load an asset into the scene
 * @in_assets : array of assets {version_guid,datatype, name}
 */
function loadAssets(in_asset){
  var url;
  var dataTypeID;
  var cb = function(data){
    url = data.file.file.url;
    dataTypeID = data.datatype_id;
    embedRPC("var dataType = ACTIVEAPP.getDataTypeString("+dataTypeID+ "); "
      + "ACTIVEAPP.fetchAndProcessData({scene_data : '" +url+"', scene_ext : dataType, "
      + "name : '"+ in_asset.name + "'});",function(in_response){
        // update guid menu when asset has been loaded.
        var checkAssetLoaded = function(){
          embedRPC("ACTIVEAPP.scene.meshcount;",function(in_response){
            if(in_response.data !== meshCount){
              clearInterval(sceneTimer);
              updateGuidMenu();
            }
          });
        };
        sceneTimer = setInterval(checkAssetLoaded,3000);
      });
  };
  $.get(lagoaUrl + '/versions/'+in_asset.version_guid+'.json',cb,'jsonp');
};

$(function() {
  // Make sure that the whole scene is loaded! Only then can you  set the first object selection.
  // This happens because we want the user to have a reference object to guide them.
  function checkLoaded(){
    console.log("waiting for scene to load...");
    embedRPC("ACTIVEAPP.getSceneLoaded();", function(in_response) { 
      if (in_response.data === true){
        clearInterval(timer);
        onLoad();}
      });
  }
  var timer = setInterval(checkLoaded,3000);

  $('#js-guid_select_menu').change(pickObjGUID);
  $('#js-material_select_menu').change(pickMaterial);
  $('#js-projects_select_menu').change(pickProjectID);
  $('#js-tools_select_menu').change(pickTool);
  $('#js-assets_select_menu').change(pickAsset);
  $('#update').click(updateObject);
});
