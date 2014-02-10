var express = require('express');
var app     = express();
var lagoa   = require('./lagoa-save-scene')(app);

var PORT = 9001;

app.configure(function(){
  app.set('views', __dirname + '/');
  app.engine('html', require('ejs').renderFile);
});

app.use(express.json());
app.use(express.urlencoded());

app.use('/build', express.static(__dirname + '/../../build/'));
app.use('/assets', express.static(__dirname + '/../assets/'));

//--------------------------------------------------------------------
// Display embed
//--------------------------------------------------------------------
app.get('/', function(req, res) {
  res.render('save_demo.html');
});

app.listen(PORT);
