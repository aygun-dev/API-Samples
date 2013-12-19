$(document).ready(function() {

  // some constants
  var ONE_OVER_255 = 1/255;

  /*
    We will define this object to represent 'parts' of our configurator
    this is a very simple object and only serves to associate UI elements to Lagoa parts and properties
  */
  var Part = function( in_lagoaPartNameArray, in_defaultColor, in_colorPickerName ){

    in_lagoaPartNameArray = in_lagoaPartNameArray || [];
    in_defaultColor = in_defaultColor || { r:0, g:0, b:0};
    in_colorPickerName = in_colorPickerName || '';

    this.lagoaParts = in_lagoaPartNameArray;
    this.defaultColor = in_defaultColor;
    this.colorPickerName = in_colorPickerName;
  };

  // sets the constructor to the prototype
  Part.prototype.constructor = Part;

  //  this is just an array of the parts we want to manipulate.
  var toyParts = [
    new Part( ['BTF_Textile_apply'], '#5484ed', 'box-picker' ),
    new Part( ['Logo_Little_Front', 'Separate_Labels'], '#fbd75b', 'hair-picker' ),
    new Part( ['Separate_Label'], '#000000', 'eye-picker' ),
    new Part( ['Separate_Sole2', 'Separate_Sola_1'], '#FFFFFF', 'eye-white-picker' ),
    new Part( ['Separate_Piece_2', 'Separate_Logo_1'], '#FFFFFF', 'teeth-picker' ),
//    new part( ['Separate_Detail1'], '#FFFFFF', 'picker5' ),
    new Part( ['Separate_Laces'], '#FFFFFF', 'picker6' )
  ];

  // called once the scene is fully loaded – warning: geometry might not be present!
  lapi.onSceneLoaded = function(){

    for( var i in toyParts ){

      // get some variables that we will be working with
      var hexColor = toyParts[i].defaultColor;
      var colorPickerName = toyParts[i].colorPickerName;
      var lagoaParts = toyParts[i].lagoaParts;

      // bind the UI elements
      function getColorPickerChangeCb(in_part_list, in_colorPickerName){

        // this is the callback that will be instantiated for each UI color picker element
        return function(){

          // read the color form the UI element
          var color = lapi.utils.hexToRGB( $('select[name='+ in_colorPickerName +']').val() );

          // iterate over the part list and set the color read from the UI element
          for( var i=0; i<in_part_list.length; i++){

            // this will return an array with all objects that have the part name, in Lagoa multiple parts
            // can have the same name – no "name uniqueness" only object GUID uniqueness is guaranteed.
            // we will make an assumption that we are only interested in the first one, therefore the array [0]
            var obj = lapi.getActiveScene().getObjectByName(in_part_list[i])[0];
            var mat = obj.getMaterial();

            // we are interested in changing the reflectance property
            var reflectance = mat.properties.getProperty("reflectance");

            // pow 2 is just for gamma correction
            reflectance.parameters.f0.value   = Math.pow( color.r * ONE_OVER_255, 2 );
            reflectance.parameters.f1.value = Math.pow( color.g * ONE_OVER_255, 2 );
            reflectance.parameters.f2.value  = Math.pow( color.b * ONE_OVER_255, 2 );

          }
        }
      }

      // bind the UI callbacks
      var uiElement = $('select[name='+ colorPickerName +']');
      uiElement.change(
        getColorPickerChangeCb(lagoaParts, colorPickerName)
      );

      // update the UI with the default color of the part
      uiElement.val( hexColor );

      // provoke a change to update Lagoa to match the UI
      uiElement.change();

      var scn = lapi.getActiveScene();

      var cam = scn.getCameras()[0];

      cam.getProperty("Lens").getParameter("dofradius").value = 0;
      cam.getProperty("Resolution").getParameter("width").value = 720;

      lapi.desselectAll();

      setTimeout( function(){

        // now we will set all the GL meshes to not visible
        var meshes = scn.getMeshes();
        for( var m in meshes ){
          meshes[m].getProperty("Visibility").getParameter("visible").value = false;
        }
        lapi.startRender()

      }, 2000 );
    }
  }

  var start = null;

  var RADIUS = 5;
  var SPEED = .005;

  lapi.stepCb = function(dt){
    var cam = lapi.getCamera();
    var pos = cam.properties.getProperty("Position");
    pos.parameters.x.value = RADIUS * Math.sin(SPEED*dt) * (2*Math.PI);
    pos.parameters.z.value = RADIUS * Math.cos(SPEED*dt) * (2*Math.PI);
  }

});