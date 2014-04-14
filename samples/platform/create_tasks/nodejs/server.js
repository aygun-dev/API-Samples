var request = require('request')
  , async   = require('async')
  , util    = require('util');

var HOST         = "https://api.lagoa.com"
  , API_PATH     = "/v1"
  , ASSETS_PATH  = "/assets"
  , TASKS_PATH   = "/tasks"
  , ACCESS_TOKEN = 'insert your access key here'
  , ASSET_ID     = '122112'
  , TASK_TYPE    = 'background_render'; // only background renders are supported for now


async.waterfall([
    createNewBackgroundRenderTask,
    createNewBackgroundRenderTaskCallback,
    checkBackgroundRenderTaskStatus,
    getDownloadableFormats
  ],
  function(err, result) {
    if (err) {
      console.log(err);
    } else {
      var downloadable_formats = result.latest.downloadable_formats;
      for (var i = 0; i != downloadable_formats.length; i++) {
        console.log("Downloadable format " + i);
        console.log("   file_extension: " + downloadable_formats[i].file_extension);
        console.log("   url: " + downloadable_formats[i].url);
      }
    }
  }
);

function createNewBackgroundRenderTask(cb) {
  request.post({
    url: util.format("%s%s%s.json", HOST, API_PATH, TASKS_PATH),
    json: {
      access_token: ACCESS_TOKEN,
      tasks: [{
        type: TASK_TYPE,
        asset_id: ASSET_ID,
        options: {
          duration: 60000
        }
      }]
    }
  }, cb);
}

function createNewBackgroundRenderTaskCallback(response, body, cb) {
  if (typeof body.errors !== 'undefined' && body.errors.length > 0) {
    cb(body.errors);
  } else {
    console.log(JSON.stringify(body, undefined, 2));
    var task_id = body.tasks[0].id;
    console.log(util.format("Task id received. Id = %s", task_id));
    cb(null, task_id);
  }
}

function checkBackgroundRenderTaskStatus(taskId, cb) {
  var status = 'new';

  var poll = function() {
    console.log(util.format("Task %s Status: ", taskId, status));

    if (status !== 'done' && status !== 'error') {
      request.get({
        url: util.format("%s%s/%s.json", HOST, TASKS_PATH, taskId),
        json: {
          access_token: ACCESS_TOKEN
        }
      }, function(error, response, body) {
        var task = body.task;
        if (typeof task !== 'undefined') {
          status = task.status;
          if (status === 'done') {
            assetId = task.asset_id
            console.log('Background Render Completed. Asset Id = ' + assetId);
          }
        }
      });

      setTimeout(function(){ poll() }, 10000);
    } else {
      var error = status === 'error' ? 'error' : null;
      cb(error, assetId);
    }
  }

  poll();
}

function getDownloadableFormats(asset_id, cb) {
  request.get({
    url: util.format("%s%s%s/%s.json?latest=true", HOST, API_PATH, ASSETS_PATH, asset_id),
    json: { access_token: ACCESS_TOKEN }
  }, function(error, response, body) {
    cb(error, body);
  });
}
