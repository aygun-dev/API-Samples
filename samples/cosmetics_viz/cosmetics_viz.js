// some constants
var ONE_OVER_255 = 1/255;
var EXPORT_TAG = "export";

var FPS = 24;
var ANIM_MAX_FRAMES = 30;
var RENDER_WIDTH = 600;

var exportMeshes = [];  //lapi.SceneObject array
var currentMesh = 0;    // keep track of the object we are looking at.

// Scene Objects
var LIPSTICK_MATERIAL_NAME = "new skin lips";

// hair style
var hairIDs = {
  PONY_TAIL : "PonyTail",
  SHORT_HAIR : "ShortHair"
};
var ACTIVE_HAIR_HEAD = hairIDs.PONY_TAIL;

var lipstickPicker = null;
var LabInputField = { isUpdating:false };

var one_degree_in_radian = 0.0174532925;

function degreeToRadian( in_degree ){
  return in_degree * one_degree_in_radian;
}


// Hair defs borrowed from Application
var hairDefs = [
  { name : 'Caucasian Natural Dark Brown'   , value : "w_b3__caucasian_natural_dark_brown.bin"},
  { name : 'Caucasian Natural Brown'   , value : "w_b4__caucasian_natural_brown.bin"},
  { name : 'Caucasian Natural Medium Brown'   , value : "w_b5__caucasian_natural_medium_brown.bin"},
  { name : 'Caucasian Natural Light Brown'   , value : "w_b6__caucasian_natural_light_brown.bin"},
  { name : 'Caucasian Natural Dark Blond'   , value : "w_b7__caucasian_natural_dark_blond.bin"},
  { name : 'Caucasian Natural Medium Blond'   , value : "w_b8__caucasian_natural_medium_blond.bin"},
  { name : 'Caucasian Natural Blond'   , value : "w_b9__caucasian_natural_blond.bin"},
  { name : 'Caucasian Auburn'   , value : "xx__caucasian_auburn.bin"},
  { name : 'Caucasian Auburn Red'   , value : "xx__caucasian_auburn_red.bin"},
  { name : 'Caucasian Aubergine'   , value : "w_33_66_b9__caucasian_aubergine.bin"}
];


// hard coded view presets
var camPresets = [
  { Position : { x : 4.3, y : -16, z: 160 },
    TargetPosition : { x : 0.9, y : 2.8, z : 0 },
    Lens   : { zoom : 150, focallength: 78, dofradius :0, bladeCnt : 5 }
  },

  { Position : { x : 19, y : -2, z: 50 },
    TargetPosition : { x : 0.8, y : 2.2, z: 0.1},
    Lens   : { zoom : 50, focallength: 36, dofradius:0, bladeCnt : 5 }
  },

  { Position : { x : 10, y : -2, z: 29 },
    TargetPosition : { x : -2, y : 2.8, z : 0 },
    Lens   : { zoom : 50, focallength: 16, dofradius :0, bladeCnt : 5 }
  }
];

// TODO COG to the property set... here we just account for offset
var offset = { x: -45, y: -9, z: 0 };

var cam, camPos, targetPos;

function setCamera( in_camPreset ){

  console.log( "setCamera()", in_camPreset );

  var cam = lapi.getCamera();
  var camGuid = cam.properties.parameters.guid.value;

  for( var prop in in_camPreset ){
    lapi.setObjectParameter( camGuid, prop, in_camPreset[prop] );
  }

  // also update the HTML elements.
  updateCameraUIControls( in_camPreset );
}

// linear interpolation for the animation stuff
function lerp( a, b, d ){
  return a + d * (b - a);
}

// setup the camera animation and play
function playCameraInterpolation( aCamVector, bCamVector, aTargetVector, bTargetVector ){

  // animation length in frames
  var currFrame = 0;

  // setup our frame update routine
  lapi.stepCb = function( e ){

    currFrame++;

    var dt = currFrame/ANIM_MAX_FRAMES;

    // we are only inrerested in X changes...
    camPos.x.value = lerp(aCamVector.x, bCamVector.x, dt);
    targetPos.x.value = lerp(aTargetVector.x, bCamVector.x, dt);



//        console.log("interpolating", lerp(aCamVector.x, bCamVector.x, dt), "frame", currFrame, dt);

    if(camPos.x.value === bCamVector.x || currFrame >= ANIM_MAX_FRAMES ){
      lapi.stop();
      console.log("stop");
    }
  };

  // play the animation
  lapi.play(FPS);
}

function setHairStyle( in_hairMeshName ){
  var scn = lapi.getActiveScene();

  for( var i in hairIDs){
    if(in_hairMeshName != hairIDs[i]){
      scn.getObjectByName( hairIDs[i] )[0].getProperty("RenderSettings").getParameter("renderVisible").value = false;
    }else{
      scn.getObjectByName( in_hairMeshName )[0].getProperty("RenderSettings").getParameter("renderVisible").value = true;
      ACTIVE_HAIR_HEAD = in_hairMeshName;
    }
  }
}

// Bind the buttons
$('.js-orbit').bind( "click", function(){
  lapi.orbitTool();
});

$('.js-short-hair').bind( "click", function(){
  setHairStyle( hairIDs.SHORT_HAIR );
});

$('.js-pony-tail').bind( "click", function(){
  setHairStyle( hairIDs.PONY_TAIL );
});

$('.js-pan').bind( "click", function(){
  lapi.panTool();
});

$('.js-view-1').bind( "click", function(){
  setCamera( camPresets[0] );
});

$('.js-view-2').bind( "click", function(){
  setCamera( camPresets[1] );
});

$('.js-view-3').bind( "click", function(){
  setCamera( camPresets[2] );
});

function setOnClickPattern( in_htmlElement, in_clickValue ){
  $(in_htmlElement).click(function(e){
    // grab the parameter that the element will handle
    var mat = exportMeshes[currentMesh].getMaterial();
    var param = mat.getProperty("color").parameters.Texture;
    param.value = in_clickValue;
  })
}

function addPatterns(){
  // our patterns
  var scn = lapi.getActiveScene()
  var textures = scn.getTextures();

  // scrape all textures that start with "EXPORT_TAG".
  var tmpTexture = null;
  var textureName = "";
  var isExport = false;

  // expose all textures
  for( var i=0 ;i<textures.length; ++i){
    tmpTexture = textures[i];
    textureName = tmpTexture.properties.parameters.name.value;
    isExport = textureName.indexOf(EXPORT_TAG);
    if(isExport >= 0){

      // create the HTML element
      var imgUrl = tmpTexture.getProperty("url").parameters.url.value;
      var img = $(document.createElement('img'));

      // assign the callback
      setOnClickPattern( img, tmpTexture.properties.parameters.guid.value );

      img.attr('src', imgUrl );
      img.appendTo('#patterns');
    }
  }
}

function getAllExportMeshes(in_scene){

  var meshes = in_scene.getMeshes();
  var meshName = "";
  var countMeshes = meshes.length;
  var countExported = 0;

  // yes, we will just sort this by name
  var meshesToExport = {};
  var sortList = [];
  var i;

  for (i=0; i<countMeshes; i++){
    meshName = meshes[i].properties.getParameter("name").value;
    if(meshName.indexOf(EXPORT_TAG)>=0){
      sortList.push(meshName);
      meshesToExport[meshName] = meshes[i];
    }
  }

  sortList.sort();
  countExported = sortList.length;

  for(i=0; i<countExported; i++){
    exportMeshes[i] = meshesToExport[sortList[i]];
  }
}

function getLipstick(){
  return (lapi.getActiveScene().getObjectByName( LIPSTICK_MATERIAL_NAME )[0]);
}

var updatingLip = false;

// hack around the HTMl madness...
function updateLipColour(container, color){

  var mat = getLipstick();

  // we are interested in changing the reflectance property
  // for Velvet shader the color is called "color..."
  var reflectance = mat.properties.getProperty("reflectance");

  // pow 2 is just for gamma correction
  reflectance.parameters.f0.value   = Math.pow( color.rgba.r * ONE_OVER_255, 2.2 );
  reflectance.parameters.f1.value = Math.pow( color.rgba.g * ONE_OVER_255, 2.2 );
  reflectance.parameters.f2.value  = Math.pow( color.rgba.b * ONE_OVER_255, 2.2 );

  if(!LabInputField.isUpdating){
    updateLabInput(color);
  }

}

function updateGlossiness( in_value ){
  var mat = getLipstick();
  mat.properties.getProperty("roughness").getParameter("f0").value = in_value;
}


function setupScene(in_scn){

  var cam = lapi.getCamera();

  // go to the first camera position
  setCamera( camPresets[0] );

  // now we will set all the GL meshes to not visible
  var meshes = in_scn.getMeshes();
  for( var m in meshes ){
    meshes[m].getProperty("Visibility").getParameter("visible").value = false;
  }

  cam.getProperty("Film").parameters.width.value = 24;
  lapi.setCameraResolution( { width: RENDER_WIDTH } );

}
// start rendering and hide meshes
function beginRendering(in_scn){

  // this timeout just prevents us from racing... avoid a bug. Just trust me.
  // start rendering
  setTimeout( function(){
    lapi.startRender()
  }, 1000 );
}

// lens zoom slider
function refreshZoomSlider(e, nr){
  var cam = lapi.getCamera();
  cam.properties.getProperty("Lens").parameters.zoom.value = nr.value;
}

function refreshLipstickFinish(e, nr){
  updateGlossiness( nr.value / 100 ); // normalize to 0-1 range.
}

function createHTMLElements(){

  var lipstickPicker = $(".cielch-picker1").ColorPickerSliders({
    flat: true,
    color: 'rgb(138, 0, 50',
    swatches: ["rgb(138, 0, 50)","rgb(150, 10, 20)","rgb(200, 20, 15)"],
    onchange : updateLipColour,
    order: {
      cie: 1
    },
    labels: {
      cielightness: 'CIE Lightness',
      ciechroma: 'CIE Chroma',
      ciehue: 'CIE Hue'
    }
  });

  $("#slider-lipstick_finish-js").slider({ orientation: "horizontal",
    range: "min",
    min: 0,
    max: 100,
    value: 50,
    slide: refreshLipstickFinish,
    change: refreshLipstickFinish
  });

  $("#slider-zoom-js").slider({ orientation: "horizontal",
    range: "min",
    min: 40,
    max: 200,
    value: 150,
    slide: refreshZoomSlider,
    change: refreshZoomSlider
  });


  // Hair colour picker
  //////////////////////////////
  var hairColourPicker = $("select[name='hair-selector-js']");
  var option;

  for( var def in hairDefs ){
    option = document.createElement('option');
    option.value = hairDefs[def].value;
    option.innerText = hairDefs[def].name;
    option.selected = "selected";
    hairColourPicker.append(option);
  }

  // this call will build a new set of HTML elements to represent the above select list
  var ui_picker = $("select[name='hair-selector-js']").selectpicker({style: 'btn-primary', menuStyle: 'dropdown-inverse'});

  // bind the hange event so we send the change to Lagoa.
  ui_picker.bind("change",function(e){
    var scn = lapi.getActiveScene();

    var activeHairStyle = scn.getObjectByName( ACTIVE_HAIR_HEAD )[0];
    var hairMaterial = scn.getObjectByGuid( activeHairStyle.getProperty("Materials").getParameter("tmaterial").value );
    hairMaterial.properties.getProperty("component 1").parameters["component 1"].value = hairColourPicker[0].value;
  });


  // bind the inputs fields
  function updateSliders(){
    LabInputField.isUpdating = true;
    lipstickPicker.trigger('colorpickersliders.updateColor', getColourInput() );
    LabInputField.isUpdating = false;
  }

  LabInputField.L = $(".L-input-js").on("change", updateSliders )[0];
  LabInputField.a = $(".a-input-js").on("change", updateSliders )[0];
  LabInputField.b = $(".b-input-js").on("change", updateSliders )[0];

  LabInputField.init = true;

  function getColourInput(){
    var rgbConverted = LabToRGB( Number(LabInputField.L.value), Number(LabInputField.a.value), Number(LabInputField.b.value) );
    return ( "rgb(" + rgbConverted.r + "," + rgbConverted.g + "," + rgbConverted.b + ")" );
  }
}

function updateLabInput( color ){
  if(LabInputField.init){
    var colorLab = CIELchToCIELab(color.cielch.l, color.cielch.c, color.cielch.h);
    LabInputField.L.value = colorLab.l;
    LabInputField.a.value = colorLab.a;
    LabInputField.b.value = colorLab.b;
  }
}

function LabToXYZ( in_L, in_a, in_b ){

  var ref_X =  95.047;     //Observer= 2°, Illuminant= D65
  var ref_Y = 100.000;
  var ref_Z = 108.883;

  var Y = ( in_L + 16 ) / 116;
  var X = in_a / 500 + Y;
  var Z = Y - in_b / 200;

  var YYY = Math.pow(Y,3);
  var XXX = Math.pow(X,3);
  var ZZZ = Math.pow(Z,3);

  YYY > 0.008856 ? Y = YYY : Y = ( Y - 16 / 116 ) / 7.787;
  XXX > 0.008856 ? X = XXX : X = ( X - 16 / 116 ) / 7.787;
  ZZZ > 0.008856 ? Z = ZZZ : Z = ( Z - 16 / 116 ) / 7.787;

  return { x : ref_X * X, y : ref_Y * Y, z : ref_Z * Z };
}

function XYZToRGB( in_x, in_y, in_z ){

  var one_over_2_4 = 1 / 2.4;

  var X = in_x / 100;        //X from 0 to  95.047      (Observer = 2°, Illuminant = D65)
  var Y = in_y / 100;        //Y from 0 to 100.000
  var Z = in_z / 100;        //Z from 0 to 108.883

  var R = (X *  3.2406) + (Y * -1.5372) + (Z * -0.4986);
  var G = (X * -0.9689) + (Y *  1.8758) + (Z *  0.0415);
  var B = (X *  0.0557) + (Y * -0.2040) + (Z *  1.0570);

  R > 0.0031308 ? R = 1.055 * ( Math.pow(R, one_over_2_4 ) - 0.055) : R = 12.92 * R;
  G > 0.0031308 ? G = 1.055 * ( Math.pow(G, one_over_2_4 ) - 0.055) : G = 12.92 * G;
  B > 0.0031308 ? B = 1.055 * ( Math.pow(B, one_over_2_4 ) - 0.055) : B = 12.92 * B;

  return { r : R * 255, g : G * 255, b : B * 255 };
}

function RGBToXYZ( in_r, in_g, in_b ){
  var R = ( in_r / 255 );        //R from 0 to 255
  var G = ( in_g / 255 );        //G from 0 to 255
  var B = ( in_b / 255 );        //B from 0 to 255

  R > 0.04045 ? R = Math.pow( (R + 0.055 ) / 1.055, 2.4 ) : R = R / 12.92;
  G > 0.04045 ? G = Math.pow( (G + 0.055 ) / 1.055, 2.4 ) : G = G / 12.92;
  B > 0.04045 ? B = Math.pow( (B + 0.055 ) / 1.055, 2.4 ) : B = B / 12.92;

  R = R * 100;
  G = G * 100;
  B = B * 100;

  //Observer. = 2°, Illuminant = D65
  return { x : R * 0.4124 + G * 0.3576 + B * 0.1805,
           y : R * 0.2126 + G * 0.7152 + B * 0.0722,
           z : R * 0.0193 + G * 0.1192 + B * 0.9505 };
}

function XYZToLab( in_x, in_y, in_z ){

  var ref_X = 95.047;
  var ref_Y = 100.000;
  var ref_Z = 108.883;

  var X = in_x / ref_X;          //Observer= 2°, Illuminant= D65
  var Y = in_y / ref_Y;
  var Z = in_z / ref_Z;

  X > 0.008856 ? X = Math.pow( X, ( 1/3 ) ) : X = ( 7.787 * X ) + ( 16 / 116 );
  Y > 0.008856 ? Y = Math.pow( Y, ( 1/3 ) ) : Y = ( 7.787 * Y ) + ( 16 / 116 );
  Z > 0.008856 ? Z = Math.pow( Z, ( 1/3 ) ) : Z = ( 7.787 * Z ) + ( 16 / 116 );

  return { l : ( 116 * Y ) - 16,
           a : 500 * ( X - Y ),
           b : 200 * ( Y - Z )};
}

function CIELchToCIELab( in_l, in_c, in_h ){

  return { l : in_l,
    a : Math.cos( degreeToRadian( in_h ) ) * in_c,
    b : Math.sin( degreeToRadian( in_h ) ) * in_c };
}

function RGBToLab( in_r, in_g, in_b ){
  var xyz = RGBToXYZ(in_r, in_g, in_b);
  return XYZToLab(xyz.x, xyz.y, xyz.z);
}

function LabToRGB(in_l, in_a, in_b){
  var xyz = LabToXYZ(in_l, in_a, in_b);
  return XYZToRGB(xyz.x, xyz.y, xyz.z);
}

function updateCameraUIControls( in_camPreset ){

  var zoom = in_camPreset.Lens.zoom;

  // get the slider
  var zoomSlider = $("#slider1");

  // set the min to be the zoom value, so the user can only zoom in, not out
  zoomSlider.slider('option', 'min', zoom );

  // set the max to be 2x min
  zoomSlider.slider('option', 'max', zoom*2 );

  // set the zoom value
  zoomSlider.slider('value', zoom );
}

$(document).ready(function() {

  // called once the scene is fully loaded – warning: geometry might not be present!
  lapi.onSceneLoaded = function(){

    // set some defaults
    var scn = lapi.getActiveScene();
    var cam = lapi.getCamera();

    // build our app UI
//    addPatterns();

    setupScene(scn);

    // we will keep track of camera for animation
    camPos = cam.getProperty("Position").parameters;
    targetPos = cam.getProperty("TargetPosition").parameters;

    beginRendering(scn);

    createHTMLElements();

    // make sure nothing is selected
    lapi.desselectAll();
  };

});